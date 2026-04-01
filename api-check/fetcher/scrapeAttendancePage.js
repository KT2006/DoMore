/**
 * fetcher/scrapeAttendancePage.js
 * 
 * The SRM Academia "My_Attendance" page contains ALL the data we need:
 *  - Student profile (top section)
 *  - Attendance table (middle)
 *  - Internal marks table (bottom)
 * 
 * This module navigates to the page once and returns all three datasets.
 */

const ATTENDANCE_URL = process.env.SRM_ATTENDANCE_URL ||
  'https://academia.srmist.edu.in/srm_university/academia-academic-services/page/My_Attendance';

/**
 * Navigate to the attendance page and extract all data.
 * @param {import('puppeteer').Page} page - Active Puppeteer page
 * @returns {{ profile, attendance, marks }}
 */
export async function scrapeAttendancePage(page) {
  console.log('[scraper] Navigating to My_Attendance page...');
  
  // Zoho Creator does a JS client-side redirect on load.
  // We ignore navigation errors and wait for the actual DOM table to appear.
  await page.goto(ATTENDANCE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

  // The page JS fires a redirect. Allow extra time for it to re-render.
  await new Promise(r => setTimeout(r, 2000));

  // Now wait up to 20 seconds for the actual attendance table to appear
  let tableFound = false;
  const MAX_WAIT = 20000;
  const POLL = 1000;
  let elapsed = 0;
  while (elapsed < MAX_WAIT) {
    tableFound = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      for (const t of tables) {
        const headers = Array.from(t.querySelectorAll('th')).map(h => h.innerText.toLowerCase());
        if (headers.some(h => h.includes('course code') || h.includes('attn'))) return true;
      }
      return false;
    }).catch(() => false);
    if (tableFound) break;
    await new Promise(r => setTimeout(r, POLL));
    elapsed += POLL;
  }

  if (!tableFound) {
    // Take a debug screenshot to help diagnose the issue
    await page.screenshot({ path: './debug-attendance-fail.png', fullPage: true }).catch(() => {});
    console.warn('[scraper] Could not find attendance table after', MAX_WAIT / 1000, 'seconds. Saved screenshot to debug-attendance-fail.png');
  }

  const result = await page.evaluate(() => {
    // ─── PROFILE SECTION ───────────────────────────────────────────────────
    const profileData = {};
    
    // The profile info is in a label: value layout in a <td> block
    // We search for known label keywords in the page text nodes
    const allText = document.body.innerText;

    function extractValue(label) {
      // Matches "Label : value" or "Label  value" (the portal uses inconsistent spacing)
      const regex = new RegExp(label + '\\s*:?\\s*([^\\n]+)', 'i');
      const m = allText.match(regex);
      return m ? m[1].trim().replace(/\s+/g, ' ') : '';
    }

    profileData.regNumber = allText.match(/RA\d{13}/i)?.[0] || '';
    profileData.name = extractValue('Name');
    profileData.program = extractValue('Program');
    profileData.department = extractValue('Department');
    profileData.specialization = extractValue('Specialization') || extractValue('Specialisation');
    profileData.semester = extractValue('Semester');
    profileData.batch = extractValue('Batch');
    profileData.enrollmentStatus = extractValue('Enrollment Status');

    // ─── ATTENDANCE TABLE ──────────────────────────────────────────────────
    const attendance = [];
    const tables = Array.from(document.querySelectorAll('table'));

    // Attendance table has header: Course Code, Course Title, Category, Faculty Name, Slot, Room, Hours Conducted, Hours Absent, Attn%
    for (const table of tables) {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim().toLowerCase());
      
      // Identify attendance table by looking for "attn" or "hours conducted"
      if (!headers.some(h => h.includes('attn') || h.includes('hours conducted'))) continue;

      const rows = Array.from(table.querySelectorAll('tr')).slice(1); // skip header
      const courseCodeIdx    = headers.findIndex(h => h.includes('course code'));
      const courseTitleIdx   = headers.findIndex(h => h.includes('course title'));
      const categoryIdx      = headers.findIndex(h => h.includes('category'));
      const facultyIdx       = headers.findIndex(h => h.includes('faculty'));
      const slotIdx          = headers.findIndex(h => h.includes('slot'));
      const roomIdx          = headers.findIndex(h => h.includes('room'));
      const conductedIdx     = headers.findIndex(h => h.includes('conducted'));
      const absentIdx        = headers.findIndex(h => h.includes('absent'));
      const attnIdx          = headers.findIndex(h => h.includes('attn') || h.includes('%'));

      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 3) continue;

        const get = (idx) => idx >= 0 ? cells[idx]?.innerText?.trim() : '';

        const courseCode = get(courseCodeIdx !== -1 ? courseCodeIdx : 0);
        const courseTitle = get(courseTitleIdx !== -1 ? courseTitleIdx : 1);
        if (!courseCode && !courseTitle) continue; // skip empty rows

        attendance.push({
          courseCode,
          courseTitle,
          category: get(categoryIdx !== -1 ? categoryIdx : 2),
          facultyName: get(facultyIdx !== -1 ? facultyIdx : 3),
          slot: get(slotIdx !== -1 ? slotIdx : 4),
          roomNo: get(roomIdx !== -1 ? roomIdx : 5),
          hoursConducted: get(conductedIdx !== -1 ? conductedIdx : 6),
          hoursAbsent: get(absentIdx !== -1 ? absentIdx : 7),
          attendancePercent: get(attnIdx !== -1 ? attnIdx : 8),
        });
      }
      break; // found and processed the attendance table
    }

    // ─── MARKS TABLE ────────────────────────────────────────────────────────
    const marks = [];

    for (const table of tables) {
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText.trim().toLowerCase());
      
      // Marks table has: Course Code, Course Type, Test Performance
      if (!headers.some(h => h.includes('test') || h.includes('performance'))) continue;

      const rows = Array.from(table.querySelectorAll('tr')).slice(1);
      const codeIdx       = headers.findIndex(h => h.includes('course code'));
      const typeIdx       = headers.findIndex(h => h.includes('course type'));
      const performIdx    = headers.findIndex(h => h.includes('test') || h.includes('performance'));

      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length < 2) continue;

        const get = (idx) => idx >= 0 ? cells[idx]?.innerText?.trim().replace(/\s+/g, ' ') : '';

        const courseCode = get(codeIdx !== -1 ? codeIdx : 0);
        if (!courseCode) continue;

        marks.push({
          courseCode,
          courseType: get(typeIdx !== -1 ? typeIdx : 1),
          testPerformance: get(performIdx !== -1 ? performIdx : 2),
        });
      }
      break;
    }

    return { profileData, attendance, marks };
  });

  console.log(`[scraper] Profile: ${result.profileData.name} (${result.profileData.regNumber})`);
  console.log(`[scraper] Attendance: ${result.attendance.length} subjects`);
  console.log(`[scraper] Marks: ${result.marks.length} entries`);

  return result;
}
