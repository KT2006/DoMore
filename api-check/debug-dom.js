import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getExecutablePath() {
   if (process.platform === 'darwin') return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
   return null;
}

async function debug() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: await getExecutablePath(),
    userDataDir: path.join(__dirname, 'browser-profile'),
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  console.log('Navigating to base Academia URL...');
  await page.goto('https://academia.srmist.edu.in/srm_university/Academia', { waitUntil: 'domcontentloaded' });
  
  console.log('Waiting 6 seconds for ZCreator SPA to render...');
  await new Promise(r => setTimeout(r, 6000));

  const url = page.url();
  console.log('Current URL:', url);
  
  console.log('Taking screenshot...');
  // Force visible viewport
  await page.setViewport({ width: 1280, height: 800 });
  await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });

  const html = await page.content();
  await fs.writeFile('debug_html.html', html);
  
  let frameFound = false;
  for (const frame of page.frames()) {
     if (frame.url().includes('zoho')) {
         frameFound = true;
         console.warn('Zoho Frame found');
     }
  }
  
  console.log('Done.');
  await browser.close();
}

debug().catch(console.error);
