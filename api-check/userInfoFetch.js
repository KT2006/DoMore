import axios from 'axios'
import * as cheerio from 'cheerio'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)
const { parseUserInfo } = require(
  path.join(__dirname, 'node_modules/reddy-api-srm/dist/src/parser/parseUserInfo.js')
)

const ORIGIN = 'https://academia.srmist.edu.in'
const REFERER = `${ORIGIN}/`

const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function decodeHexEscapes(s) {
  return s
    .replace(/\\x([0-9A-Fa-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u([0-9A-Fa-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\\\/g, '\\')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\`/g, '`')
}

/** Pull embedded HTML strings from script (Zoho has changed quote/style over time). */
function extractPossibleProfileHtmlChunks(raw) {
  const out = []
  const patterns = [
    /pageSanitizer\.sanitize\(\s*'([\s\S]*?)'\s*\)/,
    /pageSanitizer\.sanitize\(\s*"([\s\S]*?)"\s*\)/,
    /pageSanitizer\.sanitize\(\s*`([\s\S]*?)`\s*\)/,
    /\bpageSanitizer\.sanitize\('([\s\S]*?)'\);/,
  ]
  for (const p of patterns) {
    const m = raw.match(p)
    if (!m?.[1]) continue
    try {
      const decoded = decodeHexEscapes(m[1])
      if (decoded.length > 50) out.push(decoded)
    } catch (_) {}
  }
  return [...new Set(out)]
}

function textAfterLabel($, labelNeedle) {
  const td = $('td')
    .filter((_, el) => {
      const t = $(el).text().replace(/\s+/g, ' ').trim()
      return t.includes(labelNeedle)
    })
    .first()
  if (!td.length) return ''
  const strong = td.next('td').find('strong').first()
  if (strong.length) return strong.text().trim()
  return td.next('td').text().trim()
}

/** Same fields as reddy-api-srm parseUserInfo, but works on raw ZCreator HTML. */
function userInfoFromCheerioRoot($) {
  let regNumber = textAfterLabel($, 'Registration Number')
  const name = textAfterLabel($, 'Name:') || textAfterLabel($, 'Name')
  if (!regNumber && name) {
    regNumber =
      $('td:contains("Registration")').closest('tr').find('strong').first().text().trim() ||
      $('strong')
        .filter((_, el) => /\bRA\d{10,}\b/i.test($(el).text()))
        .first()
        .text()
        .trim()
  }
  if (!regNumber) return null

  const mobile = textAfterLabel($, 'Mobile:') || textAfterLabel($, 'Mobile')
  const deptFull =
    textAfterLabel($, 'Department:') || textAfterLabel($, 'Department')
  let section = ''
  let department = deptFull
  if (deptFull.includes('-')) {
    const parts = deptFull.split('-')
    department = parts[0].trim()
    section = parts
      .slice(1)
      .join('-')
      .replace(/[()]/g, '')
      .replace(/Section/gi, '')
      .trim()
  }

  const program = textAfterLabel($, 'Program:') || textAfterLabel($, 'Program')
  const semester = textAfterLabel($, 'Semester:') || textAfterLabel($, 'Semester')
  const batch =
    $('td:contains("Batch:") + td strong font')
      .first()
      .text()
      .trim() || textAfterLabel($, 'Batch')

  const email =
    textAfterLabel($, 'E-Mail') ||
    textAfterLabel($, 'Email') ||
    textAfterLabel($, 'Mail') ||
    ''

  return {
    regNumber,
    name,
    mobile,
    section,
    program,
    department,
    semester,
    batch,
    srmId: email || undefined,
  }
}

/** Last resort: RA… in HTML + “Welcome …” / JSON name (WELCOME page, etc.). */
function heuristicUserInfoFromHtml(html) {
  const regMatch = html.match(/\b(RA\d{10,})\b/i)
  if (!regMatch) return null
  const regNumber = regMatch[1].toUpperCase()
  let name = ''
  const welcomePatterns = [
    /Welcome,?\s+([^<\n\r]{2,70})/i,
    /Hi,?\s+([A-Za-z][A-Za-z .']{2,50})/,
    /Dear\s+([A-Za-z][A-Za-z .']{2,40})/i,
    /"StudentName"\s*:\s*"([^"]+)"/i,
    /"student_name"\s*:\s*"([^"]+)"/i,
    /"Name"\s*:\s*"([^"]{2,60})"/,
  ]
  for (const p of welcomePatterns) {
    const m = html.match(p)
    if (m?.[1]) {
      name = m[1]
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(/Register|Logout|Sign|Welcome/i)[0]
        .trim()
      if (name.length >= 2 && name.length < 80) break
      name = ''
    }
  }
  if (!name) name = 'Student'

  return {
    regNumber,
    name,
    mobile: '',
    section: '',
    program: '',
    department: '—',
    semester: '',
    batch: '',
  }
}

export function looksLikeAcademiaLoginPage(html) {
  if (typeof html !== 'string' || html.length < 200) return false
  const low = html.toLowerCase()
  return (
    (low.includes('signin') || low.includes('sign-in')) &&
    (low.includes('accounts/p/') || low.includes('zoho') || low.includes('password')) &&
    !/\bRA\d{10,}\b/i.test(html)
  )
}

export async function parseUserInfoFlexible(html) {
  if (typeof html !== 'string' || html.length < 80) {
    return { error: 'Empty or invalid HTML', status: 404 }
  }

  const legacy = await parseUserInfo(html)
  if (!legacy.error && legacy.userInfo?.regNumber) {
    return { userInfo: legacy.userInfo, status: 200 }
  }

  for (const chunk of extractPossibleProfileHtmlChunks(html)) {
    try {
      const $ = cheerio.load(chunk)
      const u = userInfoFromCheerioRoot($)
      if (u?.regNumber) return { userInfo: u, status: 200 }
    } catch (_) {}
  }

  try {
    const $ = cheerio.load(html)
    const u = userInfoFromCheerioRoot($)
    if (u?.regNumber) return { userInfo: u, status: 200 }
  } catch (_) {}

  const heuristic = heuristicUserInfoFromHtml(html)
  if (heuristic) return { userInfo: heuristic, status: 200 }

  return { error: legacy.error || 'Failed to extract user details', status: 404 }
}

const PAGE_BASE =
  'https://academia.srmist.edu.in/srm_university/academia-academic-services/page/My_Time_Table_'
const PLANNER_BASE =
  'https://academia.srmist.edu.in/srm_university/academia-academic-services/page/Academic_Planner_'

function buildAcademicPlannerUrls() {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const urls = []
  if (m >= 1 && m <= 6) {
    urls.push(`${PLANNER_BASE}${y - 1}_${String(y).slice(-2)}_EVEN`)
    urls.push(`${PLANNER_BASE}${y - 2}_${String(y - 1).slice(-2)}_ODD`)
    urls.push(`${PLANNER_BASE}${y - 1}_${String(y).slice(-2)}_ODD`)
  } else {
    urls.push(`${PLANNER_BASE}${y}_${String(y + 1).slice(-2)}_ODD`)
    urls.push(`${PLANNER_BASE}${y - 1}_${String(y).slice(-2)}_EVEN`)
    urls.push(`${PLANNER_BASE}${y}_${String(y + 1).slice(-2)}_EVEN`)
  }
  return urls
}

export function buildMyTimeTablePageUrls() {
  const fromEnv = process.env.SRM_TIMETABLE_PAGE?.trim()
  const fromProfileEnv = process.env.SRM_PROFILE_PAGE?.trim()
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const urls = []
  if (fromProfileEnv) urls.push(fromProfileEnv)
  if (fromEnv) urls.push(fromEnv)
  urls.push(
    `${ORIGIN}/srm_university/academia-academic-services/page/WELCOME`,
    `${ORIGIN}/srm_university/academia-academic-services/page/My_Attendance`
  )
  urls.push(PAGE_BASE + '2023_24', PAGE_BASE + '2024_25', PAGE_BASE + '2025_26', PAGE_BASE + '2026_27')
  if (m >= 7) {
    urls.push(PAGE_BASE + `${y}_${String(y + 1).slice(-2)}`)
    urls.push(PAGE_BASE + `${y - 1}_${String(y).slice(-2)}`)
  } else {
    urls.push(PAGE_BASE + `${y - 1}_${String(y).slice(-2)}`)
    urls.push(PAGE_BASE + `${y - 2}_${String(y - 1).slice(-2)}`)
  }
  urls.push(...buildAcademicPlannerUrls())
  return [...new Set(urls)]
}

async function fetchHtml(url, cookie, { asXhr }) {
  const headers = {
    'User-Agent': CHROME_UA,
    Accept: asXhr
      ? '*/*'
      : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    cookie,
    Referer: REFERER,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
  if (asXhr) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8'
    headers['sec-fetch-dest'] = 'empty'
    headers['sec-fetch-mode'] = 'cors'
    headers['sec-fetch-site'] = 'same-origin'
    headers['x-requested-with'] = 'XMLHttpRequest'
  } else {
    headers['sec-fetch-dest'] = 'document'
    headers['sec-fetch-mode'] = 'navigate'
    headers['sec-fetch-site'] = 'none'
    headers['Upgrade-Insecure-Requests'] = '1'
  }

  const res = await axios.get(url, {
    headers,
    validateStatus: () => true,
    responseType: 'text',
    transformResponse: [(data) => data],
    timeout: 25000,
  })
  return res.data
}

export async function getUserInfoFromTimetablePages(cookie) {
  const urls = buildMyTimeTablePageUrls()
  let lastError = 'Failed to extract user details'
  let lastBodySample = ''

  for (const url of urls) {
    for (const asXhr of [true, false]) {
      try {
        const body = await fetchHtml(url, cookie, { asXhr })
        if (typeof body !== 'string') {
          lastError = 'Non-text response from portal'
          continue
        }
        if (body.length > 400) lastBodySample = body.slice(0, 8000)

        const parsed = await parseUserInfoFlexible(body)
        if (!parsed.error && parsed.userInfo?.regNumber) {
          if (process.env.SRM_DEBUG === '1') {
            console.log('[userInfoFetch] profile OK', { url, asXhr })
          }
          return { userInfo: parsed.userInfo, status: 200 }
        }
        if (parsed.error) lastError = parsed.error
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e)
      }
    }
  }

  if (lastBodySample && looksLikeAcademiaLoginPage(lastBodySample)) {
    return {
      error:
        'Academia returned a login page (cookies invalid or expired). Copy the full Cookie header from your browser into api-check/.env as SRM_COOKIE=...',
      status: 401,
    }
  }

  return { error: lastError, status: 404 }
}
