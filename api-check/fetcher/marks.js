/**
 * fetcher/marks.js
 * Uses Puppeteer to navigate to the marks page and extracts internal marks.
 */
export async function fetchMarks(page) {
  console.log('[fetch] Fetching marks...');

  const baseUrl = process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in';
  const url = process.env.SRM_MARKS_URL ||
    baseUrl + '/srm_university/academia-academic-services/page/My_Marks';

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  const marks = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    const data = [];
    let headerMap = null;

    for (const row of rows) {
      const headers = Array.from(row.querySelectorAll('th'));
      if (headers.length > 2) {
        headerMap = headers.map(h => h.innerText.trim().toLowerCase());
        continue;
      }

      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 2) continue;
      const cellTexts = cells.map(c => c.innerText.trim());
      const entry = {};
      if (headerMap) {
        headerMap.forEach((h, i) => { entry[h] = cellTexts[i] || ''; });
      } else {
        entry.subject = cellTexts[0];
        entry.test1 = cellTexts[1];
        entry.test2 = cellTexts[2];
        entry.total = cellTexts[3];
      }
      if (entry.subject || entry[headerMap?.[0]]) {
        data.push(entry);
      }
    }
    return data;
  });

  console.log('[fetch] Marks fetched');
  return marks;
}
