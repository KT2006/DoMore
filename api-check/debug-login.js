/**
 * Debug script: launches a visible browser, goes to the SRM login page,
 * waits 10 seconds for full rendering, then dumps:
 * 1. All <input> elements found (id, name, type)
 * 2. All <button> elements found (id, class, text)
 * 3. Whether they are inside an iframe
 * 4. A screenshot of what Puppeteer sees
 */
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Show the browser window
    userDataDir: path.join(__dirname, 'browser-profile'),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  const loginUrl = process.env.SRM_LOGIN_URL || 'https://academia.srmist.edu.in/';
  const page = await browser.newPage();
  
  console.log('[debug] Navigating to:', loginUrl);
  await page.goto(loginUrl, { waitUntil: 'networkidle2' });
  
  console.log('[debug] Page loaded. Waiting 10 seconds for dynamic content...');
  await new Promise(r => setTimeout(r, 10000));

  // Take a screenshot
  const screenshotPath = path.join(__dirname, 'debug-login.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('[debug] Screenshot saved to:', screenshotPath);

  // Scan main frame
  console.log('\n====== MAIN FRAME INPUTS ======');
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(el => ({
      id: el.id,
      name: el.name,
      type: el.type,
      placeholder: el.placeholder,
      visible: el.offsetParent !== null
    }));
  });
  console.log(JSON.stringify(inputs, null, 2));

  console.log('\n====== MAIN FRAME BUTTONS ======');
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, input[type="submit"]')).map(el => ({
      id: el.id,
      class: el.className,
      type: el.type,
      text: (el.innerText || el.value || '').trim().replace(/\s+/g, ' '),
      visible: el.offsetParent !== null
    }));
  });
  console.log(JSON.stringify(buttons, null, 2));

  // Check for iframes
  const frames = page.frames();
  console.log(`\n====== FOUND ${frames.length} FRAME(S) ======`);
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const frameUrl = frame.url();
    console.log(`\nFrame ${i}: ${frameUrl}`);
    try {
      const frameInputs = await frame.evaluate(() => {
        return Array.from(document.querySelectorAll('input')).map(el => ({
          id: el.id,
          name: el.name,
          type: el.type,
          placeholder: el.placeholder,
        }));
      });
      if (frameInputs.length > 0) {
        console.log('  → Inputs inside this frame:', JSON.stringify(frameInputs, null, 4));
      }
    } catch(e) {
      console.log('  → Could not inspect frame (cross-origin):', e.message);
    }
  }

  console.log('\n[debug] Done. Check debug-login.png for what the browser sees.');
  console.log('[debug] Press Ctrl+C to close the browser.');
})();
