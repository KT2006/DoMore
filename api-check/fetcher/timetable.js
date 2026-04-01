/**
 * fetcher/timetable.js
 * Uses Puppeteer to navigate to the timetable page and extracts the schedule.
 */
export async function fetchTimetable(page) {
  console.log('[fetch] Fetching timetable...');

  const baseUrl = process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in';
  const url = process.env.SRM_TIMETABLE_URL ||
    baseUrl + '/srm_university/academia-academic-services/page/My_Time_Table';

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  const timetable = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    const result = { days: [], slots: {}, raw: [] };
    let headerRow = null;

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('th, td'));
      const cellTexts = cells.map(c => c.innerText.trim());

      // Heuristic: the header row likely contains "Mon", "Tue" etc.
      if (!headerRow && cellTexts.some(t => /mon|tue|wed|thu|fri|sat/i.test(t))) {
        headerRow = cellTexts;
        result.days = cellTexts.filter(t => /mon|tue|wed|thu|fri|sat/i.test(t));
        continue;
      }

      if (cellTexts.length > 1 && cellTexts[0]) {
        result.raw.push(cellTexts);
        const slotLabel = cellTexts[0];
        result.slots[slotLabel] = cellTexts.slice(1);
      }
    }

    return result;
  });

  console.log('[fetch] Timetable fetched');
  return timetable;
}
