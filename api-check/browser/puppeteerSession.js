/**
 * puppeteerSession.js
 * 
 * Manages a single persistent Puppeteer browser session for the lifetime
 * of the API server. After login, we reuse the same browser + page to
 * navigate to data pages and scrape the live rendered DOM.
 * 
 * Zoho Creator renders all data client-side via JavaScript, so Axios HTTP
 * requests only see a login-redirect shell. Puppeteer is required.
 */
import puppeteer from 'puppeteer';
import { loadCookie, clearCookie } from './cookie.js';
import { loginAndGetCookie } from './login.js';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let browser = null;
let page = null;

/**
 * Returns a ready-to-use Puppeteer page that is logged into Academia.
 * On first call: logs in and reuses the persisted browser-profile.
 * On subsequent calls: returns the same page instance.
 */
export async function getSession() {
  if (browser && page && !page.isClosed()) {
    // Verify session is still alive by checking the URL
    const url = page.url();
    if (!url.includes('signin') && !url.includes('login') && url.includes('academia.srmist.edu.in')) {
      return page;
    }
    // Session died — fall through to re-login
    console.log('[session] Page session appears expired. Re-logging in...');
    await closeSession();
  }

  const userDataDir = path.join(__dirname, '..', 'browser-profile');
  browser = await puppeteer.launch({
    headless: false,
    userDataDir,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 900 }
  });

  page = (await browser.pages())[0] || await browser.newPage();

  // Navigate to home and check if already logged in via browser-profile cache
  const baseUrl = process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in';
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch(e) {
    // Sometimes base URL redirects — that's OK
    await new Promise(r => setTimeout(r, 2000));
  }

  const currentUrl = page.url();
  const pageText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  const isLoggedIn = !currentUrl.includes('signin') && !currentUrl.includes('#Custom') &&
                     (pageText.includes('Logout') || pageText.includes('Sign Out') || pageText.includes('My Attendance') || pageText.includes('Portal'));

  if (!isLoggedIn) {
    console.log('[session] Not logged in via browser profile. Running login flow...');
    await browser.close();
    browser = null;
    page = null;
    // loginAndGetCookie handles its own browser lifecycle; after it closes, we re-launch
    await loginAndGetCookie();
    // Re-launch browser to navigate with saved profile
    browser = await puppeteer.launch({
      headless: false,
      userDataDir,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 900 }
    });
    page = (await browser.pages())[0] || await browser.newPage();
    await page.goto(baseUrl + '/srm_university/academia-academic-services/page/My_Attendance', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
  } else {
    console.log('[session] Already logged in via browser profile.');
  }

  return page;
}

export async function closeSession() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    page = null;
  }
}

/**
 * Navigate to a URL and wait for the page content to fully render.
 * Zoho Creator pages embed data into the DOM after running JS.
 * We wait for the loading spinner to disappear and a core element to appear.
 */
export async function navigateTo(targetPage, url, waitForSelector = null, timeout = 30000) {
  const fullUrl = url.startsWith('http') ? url : (process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in') + url;
  await targetPage.goto(fullUrl, { waitUntil: 'networkidle2', timeout });

  if (waitForSelector) {
    await targetPage.waitForSelector(waitForSelector, { timeout }).catch(() => {});
  } else {
    // Generic delay for JS rendering
    await new Promise(r => setTimeout(r, 3000));
  }

  return targetPage;
}
