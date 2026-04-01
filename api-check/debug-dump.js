/**
 * Dump tool — fetches pages using the saved session cookie and saves the raw HTML
 * so we can inspect the real DOM structure and write proper Cheerio parsers.
 */
import { loadCookie } from './browser/cookie.js';
import { createClient } from './fetcher/client.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PAGES = [
  { name: 'index', url: '/' },
  { name: 'attendance', url: '/srm_university/academia-academic-services/page/My_Attendance' },
];

(async () => {
  const cookie = await loadCookie();
  if (!cookie) {
    console.error('No session.txt found. Run the server and trigger a login first.');
    process.exit(1);
  }
  const client = createClient(cookie);

  for (const p of PAGES) {
    try {
      console.log(`[dump] Fetching: ${p.url}`);
      const res = await client.get(p.url);
      const outPath = path.join(__dirname, `debug_${p.name}.html`);
      await fs.writeFile(outPath, res.data, 'utf-8');
      console.log(`[dump] Saved → ${outPath} (${Math.round(res.data.length / 1024)} KB)`);
    } catch (err) {
      console.error(`[dump] Failed ${p.url}:`, err.message);
    }
  }
})();
