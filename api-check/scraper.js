import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

import { loadCookie, saveCookie, clearCookie, isCookieValid } from './browser/cookie.js';
import { loginAndGetCookie } from './browser/login.js';
import { createClient } from './fetcher/client.js';
import { fetchAttendance } from './fetcher/attendance.js';
import { fetchMarks } from './fetcher/marks.js';
import { fetchTimetable } from './fetcher/timetable.js';

export async function runScraper() {
  try {
    let cookieString = await loadCookie();

    if (cookieString) {
      const isValid = await isCookieValid(cookieString);
      if (!isValid) {
        await clearCookie();
        cookieString = null;
      }
    }

    if (!cookieString) {
      console.log('[scraper] Valid session not found. Starting browser login...');
      cookieString = await loginAndGetCookie();
    }

    // Load fresh cookie standard path
    cookieString = await loadCookie();
    const client = createClient(cookieString);

    const results = await Promise.allSettled([
      fetchAttendance(client),
      fetchMarks(client),
      fetchTimetable(client)
    ]);

    console.log('[scraper] Summary:');
    results.forEach((res, i) => {
      const names = ['Attendance', 'Marks', 'Timetable'];
      if (res.status === 'fulfilled') {
        console.log(`- ${names[i]}: OK`);
      } else {
        console.log(`- ${names[i]}: FAILED (${res.reason.message})`);
        
        if (res.reason.code === 'SESSION_EXPIRED') {
           console.log('[scraper] SESSION EXPIRED detected during fetch! Manual re-login triggered.');
        }
      }
    });

    return results;
  } catch (error) {
    console.error('[scraper] Critical error:', error);
    process.exit(1);
  }
}

// Allow running dynamically as a standalone script
import { pathToFileURL } from 'url';
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
   runScraper();
}
