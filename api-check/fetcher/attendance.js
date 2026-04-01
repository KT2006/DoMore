/**
 * fetcher/attendance.js
 * Uses Puppeteer to navigate to My_Attendance and scrapes the table.
 */
export async function fetchAttendance(page) {
  console.log('[fetch] Fetching attendance...');

  const baseUrl = process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in';
  const url = process.env.SRM_ATTENDANCE_URL ||
    baseUrl + '/srm_university/academia-academic-services/page/My_Attendance';

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000)); // wait for JS to render

  const attendance = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    const data = [];

    // Find the header row to map column positions
    let headerRow = null;
    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('th'));
      if (cells.length > 2) {
        headerRow = cells.map(c => c.innerText.trim().toLowerCase());
        break;
      }
    }

    const colIdx = {
      subject: headerRow ? headerRow.findIndex(h => h.includes('course') || h.includes('subject')) : 0,
      present:  headerRow ? headerRow.findIndex(h => h.includes('present') || h.includes('attended')) : 2,
      total:    headerRow ? headerRow.findIndex(h => h.includes('total') || h.includes('conducted')) : 3,
      percent:  headerRow ? headerRow.findIndex(h => h.includes('%') || h.includes('percent')) : 4,
    };

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td'));
      if (cells.length < 3) continue;
      const subject = cells[colIdx.subject >= 0 ? colIdx.subject : 0]?.innerText?.trim();
      const present = cells[colIdx.present >= 0 ? colIdx.present : 2]?.innerText?.trim();
      const total   = cells[colIdx.total   >= 0 ? colIdx.total   : 3]?.innerText?.trim();
      const percent = cells[colIdx.percent >= 0 ? colIdx.percent : 4]?.innerText?.trim();
      if (subject && subject.length > 1) {
        data.push({ subject, present, total, percentage: percent });
      }
    }
    return data;
  });

  console.log(`[fetch] Attendance fetched (${attendance.length} subjects)`);
  return attendance;
}
