/**
 * fetcher/profile.js
 * Uses Puppeteer to navigate to the Academia profile page and extracts
 * the student's details from the rendered DOM.
 */
export async function fetchProfile(page) {
  console.log('[fetch] Fetching profile...');

  const baseUrl = process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in';
  const profileUrl = process.env.SRM_PROFILE_URL ||
    baseUrl + '/srm_university/academia-academic-services/page/My_SRM_Profile_2016';

  await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  // Wait for at least one actual data element to emerge
  await new Promise(r => setTimeout(r, 4000));

  const data = await page.evaluate(() => {
    // Zoho Creator renders data into table cells / definition lists.
    // We do a generic text scan for known patterns.
    const text = document.body.innerText;

    function extractAfterLabel(label) {
      const regex = new RegExp(label + '\\s*[:\\-]?\\s*([^\\n]+)', 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : '';
    }

    // Registration number pattern (RA + 13 digits)
    const regMatch = text.match(/RA\d{13}/i);
    const regNumber = regMatch ? regMatch[0] : '';

    const name = extractAfterLabel('Student Name') ||
                 extractAfterLabel('Name');

    const mobile = extractAfterLabel('Mobile');
    const section = extractAfterLabel('Section');
    const program = extractAfterLabel('Program') || extractAfterLabel('Programme');
    const department = extractAfterLabel('Department');
    const semester = extractAfterLabel('Semester');
    const batch = extractAfterLabel('Batch');

    return { regNumber, name, mobile, section, program, department, semester, batch };
  });

  // Fallback: regNumber from env if page didn't show it
  if (!data.regNumber) {
    const netId = process.env.SRM_USERNAME || process.env.SRM_NETID || '';
    const regMatch = netId.match(/RA\d{13}/i);
    data.regNumber = regMatch ? regMatch[0] : netId;
  }

  console.log('[fetch] Profile fetched:', JSON.stringify(data));
  return data;
}
