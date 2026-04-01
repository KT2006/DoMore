export async function waitForCaptchaSolve(page, getBrowserInstance, launchBrowserHeaded) {
  const captchaSelectors = [
    'iframe[src*="recaptcha"]',
    'div.g-recaptcha',
    'img[src*="captcha"]',
    'form canvas',
    '[id*="captcha" i]',
    '[class*="captcha" i]'
  ];

  let hasCaptcha = false;
  for (const selector of captchaSelectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        hasCaptcha = true;
        break;
      }
    } catch (err) {
      // ignore DOM errors
    }
  }

  if (!hasCaptcha) return page;

  console.log('[captcha] CAPTCHA detected on login page.');
  
  // If we are given the tools to relaunch, do so
  let activePage = page;
  let browser = getBrowserInstance ? await getBrowserInstance() : null;
  
  // Checking headless property is not straightforward in Puppeteer without tracking it. 
  // We rely on the caller passing launchBrowserHeaded to relaunch if they started headless
  if (launchBrowserHeaded && browser && await browser.userAgent().then(ua => ua.includes('Headless'))) {
     console.log('[captcha] Relaunching browser in headed mode for manual solve...');
     const currentUrl = page.url();
     await browser.close();
     browser = await launchBrowserHeaded();
     const pages = await browser.pages();
     activePage = pages.length > 0 ? pages[0] : await browser.newPage();
     await activePage.goto(currentUrl, { waitUntil: 'networkidle2' });
     console.log('[captcha] Please solve the CAPTCHA and submit the form in the browser window.');
  } else {
     console.log('[captcha] Please solve the CAPTCHA in the browser window.');
  }

  console.log('[captcha] Waiting... (will auto-continue once CAPTCHA is solved)');

  return new Promise((resolve, reject) => {
    let elapsed = 0;
    const intervalTime = 1000;
    const maxTime = 300000; // 5 minutes

    const checkInterval = setInterval(async () => {
      elapsed += intervalTime;
      if (elapsed > maxTime) {
        clearInterval(checkInterval);
        reject(new Error('CAPTCHA not solved within 5 minutes. Exiting.'));
        return;
      }

      try {
        const url = activePage.url();
        if (!url.toLowerCase().includes('login') && !url.toLowerCase().includes('signin')) {
           console.log('[captcha] CAPTCHA solved/Bypassed (URL changed). Continuing...');
           clearInterval(checkInterval);
           resolve(activePage);
           return;
        }

        const isGone = await activePage.evaluate(() => {
           const textarea = document.querySelector('textarea.g-recaptcha-response');
           if (textarea && textarea.value) return true;
           
           const captchaIframe = document.querySelector('iframe[src*="recaptcha"]');
           const captchaCanvas = document.querySelector('form canvas');
           if (!captchaIframe && !captchaCanvas) return true;

           return false;
        });

        if (isGone) {
           console.log('[captcha] CAPTCHA solved. Continuing...');
           clearInterval(checkInterval);
           resolve(activePage);
        }
      } catch (err) {
        // If execution context is destroyed, navigation occurred
        if (err.message.includes('Execution context was destroyed')) {
           console.log('[captcha] Navigation detected. Continuing...');
           clearInterval(checkInterval);
           resolve(activePage);
        }
      }
    }, intervalTime);
  });
}
