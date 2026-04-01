import puppeteer from 'puppeteer';
import { saveCookie, clearCookie } from './cookie.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Wait for a specific frame whose URL contains any of the given strings.
 * The Zoho login form appears inside an iframe at /accounts/p/.../signin
 */
async function waitForLoginFrame(page, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const frames = page.frames();
    const loginFrame = frames.find(f => f.url().includes('/accounts/') && f.url().includes('signin'));
    if (loginFrame) return loginFrame;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('[login] Timed out waiting for Zoho login iframe to appear');
}

/**
 * Helper: try a list of selectors in the given frame, return the one that works.
 */
async function findSelector(frame, selectors, timeout = 5000) {
  for (const sel of selectors) {
    try {
      await frame.waitForSelector(sel, { timeout });
      return sel;
    } catch (_) {
      // try next
    }
  }
  return null;
}

export async function loginAndGetCookie() {
  let browser = null;
  try {
    const userDataDir = path.join(__dirname, '..', 'browser-profile');
    const loginUrl = process.env.SRM_LOGIN_URL || 'https://academia.srmist.edu.in/';

    browser = await puppeteer.launch({
      headless: false, // Show browser so user can solve CAPTCHAs and see what's happening
      userDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();
    console.log('[login] Navigating to login page...');
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });
    console.log('[login] Opened login page. Waiting for Zoho iframe...');

    // === 1. Find the Zoho sign-in iframe ===
    const loginFrame = await waitForLoginFrame(page);
    console.log('[login] Found login iframe:', loginFrame.url().split('?')[0]);

    // === 2. Type credentials ===
    const username = process.env.SRM_USERNAME || process.env.SRM_NETID;
    const password = process.env.SRM_PASSWORD;
    if (!username || !password) {
      throw new Error('SRM_USERNAME (or SRM_NETID) and SRM_PASSWORD must be set in api-check/.env');
    }

    // Wait for username field inside frame
    await loginFrame.waitForSelector('input#login_id', { timeout: 10000 });
    await loginFrame.evaluate(() => document.getElementById('login_id').click());
    await loginFrame.type('input#login_id', username, { delay: 60 });
    console.log('[login] Username entered');

    // === 3. Click "Next" to go to password screen ===
    // SRM Zoho login is multi-step: first email, then password on the next screen
    // Use evaluate to click to bypass puppeteer's visibility/clickability guard
    const nextClicked = await loginFrame.evaluate(() => {
      const btn = document.querySelector('button#nextbtn') ||
                  document.querySelector('button[type="submit"]') ||
                  document.querySelector('.btn.blue');
      if (btn) { btn.click(); return true; }
      return false;
    });
    if (!nextClicked) throw new Error('[login] Could not find the Next/Sign-In button');
    console.log('[login] Clicked Next button. Waiting for password field...');

    // === 4. Wait for password field to appear ===
    await loginFrame.waitForSelector('input#password', { timeout: 15000 });
    await new Promise(r => setTimeout(r, 500)); // small settle delay
    await loginFrame.evaluate(() => document.getElementById('password').click());
    await loginFrame.type('input#password', password, { delay: 60 });
    console.log('[login] Password entered');

    // === 5. Check for and handle text CAPTCHA ===
    const captchaInput = await loginFrame.$('input#captcha');
    if (captchaInput) {
      const isVisible = await loginFrame.evaluate(el => el.offsetParent !== null, captchaInput);
      if (isVisible) {
        console.log('\n[captcha] ⚠️  CAPTCHA detected!');
        console.log('[captcha] Please solve the CAPTCHA in the browser window and submit the form manually.');
        console.log('[captcha] The script will automatically detect when you have logged in.\n');
        // We wait below for the dashboard URL rather than trying to solve CAPTCHA
      }
    }

    // === 6. Click the Sign In button (if CAPTCHA present, user might do this manually) ===
    const hasCaptcha = await loginFrame.$('input#captcha').then(el =>
      el ? loginFrame.evaluate(e => e.offsetParent !== null, el) : false
    );
    if (!hasCaptcha) {
      await loginFrame.evaluate(() => {
        const btn = document.querySelector('button#nextbtn') ||
                    document.querySelector('button[type="submit"]') ||
                    document.querySelector('.btn.blue');
        if (btn) btn.click();
      });
      console.log('[login] Sign In button clicked');
    }

    // === 7. Wait for either concurrent session dialog OR navigation to dashboard ===
    console.log('[login] Waiting for dashboard or concurrent session dialog...');
    await waitForDashboardOrDialog(page, loginFrame);

    // === 8. Verify we are logged in ===
    const finalUrl = page.url();
    if (finalUrl.toLowerCase().includes('signin') || finalUrl.toLowerCase().includes('login')) {
      throw new Error('[login] Still on login page after submit. Check credentials or CAPTCHA.');
    }
    console.log('[login] Login successful! Dashboard URL:', finalUrl);

    // === 9. Extract all cookies and save them ===
    const cookies = await page.cookies();
    const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    await saveCookie(cookieString);

    await browser.close();
    return cookieString;

  } catch (error) {
    console.error('[login] Login failed:', error.message);
    if (browser) await browser.close().catch(() => {});
    await clearCookie();
    throw error;
  }
}

/**
 * Wait until the main page navigates away from the login page.
 * Also handle Zoho's concurrent session modal if it appears.
 */
async function waitForDashboardOrDialog(page, loginFrame, timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const url = page.url().toLowerCase();

    // If we moved off the login page → success
    if (!url.includes('signin') && !url.includes('login') && url.includes('academia.srmist.edu.in')) {
      return true;
    }

    // Check for concurrent session checkboxes inside the login frame
    try {
      const terminateVisible = await loginFrame.evaluate(() => {
        const el = document.getElementById('termin_web');
        return el && el.offsetParent !== null;
      });

      if (terminateVisible) {
        console.log('[session] Concurrent session screen detected! Checking all session boxes and submitting...');

        // Check all the session termination checkboxes
        await loginFrame.evaluate(() => {
          const checkboxIds = ['termin_web', 'termin_mob showOneAuthTerminate', 'termin_api'];
          checkboxIds.forEach(id => {
            const el = document.getElementById(id);
            if (el && !el.checked) el.click();
          });
        });

        await new Promise(r => setTimeout(r, 500));

        // Click the confirm/submit button on that dialog
        const clicked = await loginFrame.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const confirmBtn = btns.find(b => {
            const t = (b.innerText || '').toLowerCase().trim();
            return t.includes('sign in') || t.includes('confirm') || t.includes('continue') || t.includes('terminate');
          });
          if (confirmBtn) { confirmBtn.click(); return true; }
          return false;
        });

        if (clicked) {
          console.log('[session] Submitted session termination. Waiting for dashboard...');
          await new Promise(r => setTimeout(r, 3000));
        }
      }
    } catch (_) {
      // loginFrame may have been destroyed if navigation completed
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  throw new Error('[login] Timed out waiting for dashboard or session dialog');
}
