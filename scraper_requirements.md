# Custom SRM Scraper — Full Requirements Specification

## Overview

Build a self-contained Node.js scraper that:
1. Uses a **real Chromium browser** (Puppeteer) to log into the SRM portal
2. Automatically detects and handles the **"Terminate all sessions"** concurrent session dialog
3. Pauses and waits for the **human to solve CAPTCHAs** manually when one appears
4. **Persists the session cookie** to disk so re-login is skipped on future runs
5. Exposes a clean API layer that the rest of the app can call to fetch student data

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| `puppeteer` | Headless/headed Chromium browser automation |
| `axios` | HTTP calls after cookie is obtained |
| `fs/promises` | Reading and writing `session.txt` |
| `dotenv` | Optional fallback env vars |
| `express` (optional) | Expose data endpoints to other parts of the app |

Do **not** use `reddy-api-srm` or any other pre-built SRM scraper library. Build everything from scratch.

---

## File Structure

```
api-check/
├── browser/
│   ├── login.js          ← Puppeteer login script (main entry)
│   ├── captcha.js        ← CAPTCHA detection + pause logic
│   ├── session.js        ← Terminate concurrent sessions logic
│   └── cookie.js         ← Save/load cookie from session.txt
├── fetcher/
│   ├── client.js         ← Axios instance with cookie injected
│   ├── attendance.js     ← Fetch attendance data
│   ├── marks.js          ← Fetch marks data
│   └── timetable.js      ← Fetch timetable data
├── session.txt           ← Persisted cookie (gitignored)
├── .env                  ← SRM_USERNAME, SRM_PASSWORD
└── index.js              ← Entry point: check cookie → login if needed → fetch data
```

---

## Module 1 — Cookie Manager (`browser/cookie.js`)

### Purpose
Save and load the session cookie from `session.txt`. This is the single source of truth for auth state.

### Functions to implement

#### `saveCookie(cookieString)`
- Accepts a raw cookie string (e.g. `"JSESSIONID=abc123; Path=/; HttpOnly"`)
- Extract only the value portion (e.g. `"JSESSIONID=abc123"`)
- Write it to `api-check/session.txt` using `fs.writeFile`
- Overwrite any existing content — do not append
- Log: `[cookie] Session saved to session.txt`

#### `loadCookie()`
- Read `api-check/session.txt` using `fs.readFile`
- If file does not exist or is empty, return `null`
- Trim whitespace before returning
- Return the raw cookie string (e.g. `"JSESSIONID=abc123"`)
- Log: `[cookie] Loaded session from session.txt`

#### `clearCookie()`
- Delete `session.txt` if it exists (use `fs.unlink`, swallow ENOENT error)
- Log: `[cookie] session.txt cleared`

#### `isCookieValid(cookieString)`
- Make a test HTTP GET request using axios to the SRM dashboard URL (e.g. `https://academia.srmist.edu.in/`) with `Cookie: <cookieString>` header
- If the response HTML contains the string `"logout"` or `"Sign Out"` (case-insensitive), return `true`
- If the response redirects to the login page or contains `"loginform"`, return `false`
- Wrap in try/catch; on any error return `false`
- Log: `[cookie] Cookie validation: valid` or `[cookie] Cookie validation: expired`

---

## Module 2 — CAPTCHA Handler (`browser/captcha.js`)

### Purpose
Detect when a CAPTCHA appears on the login page and pause execution until the human solves it.

### `waitForCaptchaSolve(page)`

**Detection logic:**
- After entering username and password, before clicking login, check if any of the following selectors exist on the page:
  - `iframe[src*="recaptcha"]`
  - `div.g-recaptcha`
  - `img[src*="captcha"]`
  - Any `<canvas>` element inside a form
  - Any element with `id` or `class` containing the substring `"captcha"` (case-insensitive)
- Use `page.$()` to check each selector. If none match, return immediately (no CAPTCHA present).

**If CAPTCHA is detected:**
1. If running in headless mode (`headless: true`), **switch to headed mode** by relaunching the browser with `headless: false`. This is critical — the human cannot see the CAPTCHA otherwise.
2. Print to console:
   ```
   [captcha] CAPTCHA detected on login page.
   [captcha] Please solve the CAPTCHA in the browser window that just opened.
   [captcha] Waiting... (will auto-continue once CAPTCHA is solved)
   ```
3. **Poll every 1000ms** using `setInterval` to check if the CAPTCHA has been solved:
   - CAPTCHA is considered solved when:
     - The `g-recaptcha-response` textarea has a non-empty value, OR
     - The CAPTCHA iframe/element is no longer present on the page, OR
     - The page URL has changed away from the login URL
4. Once solved, clear the interval, log `[captcha] CAPTCHA solved. Continuing...`, and return.
5. Set a **maximum wait of 5 minutes** (300,000ms). If not solved within 5 minutes, throw an error: `Error: CAPTCHA not solved within 5 minutes. Exiting.`

---

## Module 3 — Concurrent Session Handler (`browser/session.js`)

### Purpose
Detect and automatically dismiss the "concurrent session" / "session limit exceeded" dialog by clicking "Terminate all sessions".

### `handleConcurrentSession(page)`

**Detection:**
- After clicking the login button, wait up to 10 seconds for either:
  - A navigation to the dashboard (success — return immediately)
  - A dialog/modal with text matching any of:
    - `"terminate"` (case-insensitive)
    - `"concurrent"` (case-insensitive)
    - `"session limit"` (case-insensitive)
    - `"already logged in"` (case-insensitive)
    - `"other devices"` (case-insensitive)

**Detection method:**
- Use `page.waitForSelector()` with a timeout of 10,000ms for the dialog wrapper
- Fallback: use `page.evaluate()` to scan all visible text on the page for the above keywords

**Action if dialog detected:**
1. Log: `[session] Concurrent session dialog detected. Clicking 'Terminate all sessions'...`
2. Find the button by scanning button text: loop through all `<button>` and `<a>` elements, find one whose `.innerText` (trimmed, lowercase) includes `"terminate"` or `"terminate all"` or `"sign out other"`.
3. Click that button.
4. Wait 2000ms for the page to reload/redirect.
5. Log: `[session] Terminated other sessions. Continuing login...`
6. Return `true` (indicating the dialog was handled)

**If no dialog detected after 10 seconds:**
- Return `false` (login proceeded normally — no concurrent session issue)

**Error case:**
- If dialog was detected but no matching button found, throw:
  `Error: Concurrent session dialog found but could not locate 'Terminate' button. Please check the page structure.`

---

## Module 4 — Login Script (`browser/login.js`)

### Purpose
Orchestrate the full login flow using Puppeteer.

### `loginAndGetCookie()`

**Step-by-step flow:**

1. **Launch Puppeteer browser**
   - Default: `headless: 'new'` (headless mode)
   - Use a persistent user data directory: `userDataDir: './browser-profile'`
     - This makes Puppeteer reuse Chrome cookies/localStorage between runs (acts like a real browser profile)
   - Args: `['--no-sandbox', '--disable-setuid-sandbox']`
   - Viewport: `{ width: 1280, height: 800 }`

2. **Open a new page**
   - Navigate to the SRM login URL (configurable via `process.env.SRM_LOGIN_URL`, default: `https://academia.srmist.edu.in/`)
   - Wait for: `networkidle2`
   - Log: `[login] Opened login page`

3. **Fill in credentials**
   - Get username from `process.env.SRM_USERNAME` — throw if not set
   - Get password from `process.env.SRM_PASSWORD` — throw if not set
   - Find the username input: try selectors in order:
     - `input[name="username"]`
     - `input[type="text"]`
     - `input[placeholder*="username" i]`
     - `input[id*="user" i]`
   - Find the password input: try selectors in order:
     - `input[name="password"]`
     - `input[type="password"]`
   - Use `page.type()` with a delay of 50ms per character (simulates human typing)
   - Log: `[login] Credentials entered`

4. **Check for CAPTCHA**
   - Call `waitForCaptchaSolve(page)` from `captcha.js`

5. **Click the login/submit button**
   - Try selectors in order:
     - `button[type="submit"]`
     - `input[type="submit"]`
     - `button:contains("Login")` (via `page.evaluate`)
     - `button:contains("Sign In")` (via `page.evaluate`)
   - Click it, then wait for either navigation or 5 seconds, whichever comes first.
   - Log: `[login] Login button clicked`

6. **Handle concurrent session dialog**
   - Call `handleConcurrentSession(page)` from `session.js`

7. **Verify login success**
   - Check current URL — if it still contains `"login"` or `"signin"`, throw: `Error: Login failed. Still on login page.`
   - Check page HTML for logout/dashboard indicators (same as `isCookieValid`)
   - Log: `[login] Login successful`

8. **Extract and save the session cookie**
   - Call `page.cookies()` to get all cookies for the current domain
   - Find the session cookie — look for cookies named any of: `JSESSIONID`, `PHPSESSID`, `session`, `token`, `auth`, `_session`
   - If no session cookie found, also check for any cookie that has `httpOnly: true` and a non-trivial value length (>= 20 chars)
   - Serialize to format: `"NAME=VALUE"` (just name=value, no flags/domain/path)
   - Call `saveCookie()` from `cookie.js`
   - Log: `[login] Cookie saved: NAME=VALUE...` (truncate value after 10 chars for security)

9. **Close the browser**
   - `await browser.close()`

10. **Return** the cookie string

**Error handling:**
- Wrap entire flow in try/catch
- On any failure: log the error, call `clearCookie()`, close browser, re-throw

---

## Module 5 — HTTP Client (`fetcher/client.js`)

### Purpose
Create a pre-configured axios instance that injects the session cookie into every request.

### `createClient(cookieString)`
- Create `axios.create()` with:
  ```js
  {
    baseURL: process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in',
    headers: {
      'Cookie': cookieString,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/html, */*',
      'Referer': process.env.SRM_BASE_URL || 'https://academia.srmist.edu.in'
    },
    maxRedirects: 5,
    timeout: 30000
  }
  ```
- Add a **response interceptor** that checks if any response redirects to the login page (URL contains `"login"` or body contains `"loginform"`):
  - If so, throw a custom error: `{ code: 'SESSION_EXPIRED', message: 'Session expired, please re-login' }`
- Return the axios instance

---

## Module 6 — Data Fetchers

These are separate files. Each one accepts an axios client instance and returns parsed data.

### `fetcher/attendance.js` — `fetchAttendance(client)`
- Make GET request to the attendance endpoint (configure URL via env var `SRM_ATTENDANCE_URL`)
- Parse the response (HTML or JSON depending on the site's actual response)
- Return an array of objects: `[{ subject, present, total, percentage }]`

### `fetcher/marks.js` — `fetchMarks(client)`
- Make GET request to the marks endpoint (`SRM_MARKS_URL`)
- Return an array of objects: `[{ subject, test1, test2, total, grade }]`

### `fetcher/timetable.js` — `fetchTimetable(client)`
- Make GET request to the timetable endpoint (`SRM_TIMETABLE_URL`)
- Return a structured object with days and periods

> Note: The exact URL paths and response formats must be determined by inspecting the actual SRM portal's network requests in browser DevTools. Leave these as `TODO` placeholders with env var references so they can be filled in without changing code structure.

---

## Module 7 — Entry Point (`index.js`)

### `main()`

This is the full orchestration flow:

```
START
  ↓
Load cookie from session.txt
  ↓
Cookie exists? → Validate it (HTTP check)
  ↓                                     ↓
Cookie valid?                     Cookie missing/expired
  ↓                                     ↓
Skip login                        Run loginAndGetCookie()
  ↓                                     ↓
                 Load fresh cookie
                        ↓
              Create axios client with cookie
                        ↓
           Fetch attendance, marks, timetable
                        ↓
                  Return/print data
```

**Implementation rules:**
- Load cookie with `loadCookie()`. If `null`, go straight to login.
- If cookie exists, call `isCookieValid()`. If invalid, call `clearCookie()` then run login.
- After login, reload cookie from file (don't pass it in memory — treat file as source of truth).
- Wrap all fetcher calls in `Promise.allSettled()` so one failure doesn't block the others.
- On `SESSION_EXPIRED` error from any fetcher, automatically trigger re-login once and retry.
- Print a summary of what was fetched and what failed.

---

## Environment Variables (`.env`)

```env
SRM_USERNAME=your_registration_number
SRM_PASSWORD=your_password
SRM_LOGIN_URL=https://academia.srmist.edu.in/
SRM_BASE_URL=https://academia.srmist.edu.in
SRM_ATTENDANCE_URL=/srm_university/Academia#Custom/AttendanceDetailViewAction
SRM_MARKS_URL=/srm_university/Academia#Custom/InternalMarksAction
SRM_TIMETABLE_URL=/srm_university/Academia#Custom/StudentTimeTableViewAction
```

---

## Session Persistence Rules

| Scenario | Expected Behavior |
|----------|------------------|
| First run, no `session.txt` | Login via browser, save cookie, fetch data |
| Subsequent run, valid cookie | Skip login entirely, use saved cookie |
| Cookie is expired/invalid | Delete old cookie, re-login, save new cookie |
| CAPTCHA appears during login | Show browser window, wait for human to solve |
| Concurrent session dialog appears | Auto-click "Terminate all sessions" |
| Login fails after 3 retries | Throw error, exit with code 1 |
| Fetcher returns session-expired error | Trigger re-login once, retry fetch |

---

## Logging Requirements

All log messages must be prefixed with a module tag in square brackets:

```
[cookie] Loading session from session.txt
[cookie] Session is valid
[login] Opened login page
[login] Credentials entered
[captcha] CAPTCHA detected — waiting for manual solve...
[captcha] CAPTCHA solved. Continuing...
[session] Concurrent session dialog detected
[session] Clicked "Terminate all sessions"
[login] Login successful
[cookie] Cookie saved: JSESSIONID=ab12cd34...
[fetch] Fetching attendance...
[fetch] Attendance fetched (12 subjects)
[fetch] Fetching marks...
[fetch] Marks fetched
```

---

## Error Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| `CAPTCHA_TIMEOUT` | Human didn't solve CAPTCHA in 5 min | Exit with helpful message |
| `LOGIN_FAILED` | Still on login page after submit | Retry up to 3 times, then exit |
| `SESSION_EXPIRED` | Cookie rejected by server | Auto re-login once |
| `TERMINATE_BUTTON_NOT_FOUND` | Concurrent session modal appeared but button not found | Log full page HTML, exit |
| `FETCH_ERROR` | Fetcher HTTP request failed | Log and continue with other fetchers |

---

## Security Rules

1. **Never log** full cookie values — truncate to first 10 chars + `...`
2. **Never commit** `session.txt` or `.env` — add both to `.gitignore`
3. **Never hardcode** credentials in source files
4. The `browser-profile/` directory (Puppeteer's persistent profile) must also be in `.gitignore`

---

## Testing Checklist (manual)

Before calling this done, verify:

- [ ] `session.txt` is created after first successful login
- [ ] Running again without deleting `session.txt` does NOT open a browser
- [ ] Deleting `session.txt` and running again triggers the browser-based login
- [ ] Manually blocking the login URL and running again shows a clear error
- [ ] Manually triggering the concurrent session dialog (log in on another browser) → script clicks Terminate automatically
- [ ] Adding a sleep/breakpoint after page load shows CAPTCHA wait message in terminal

---

## Notes for the AI Agent

- Do NOT use `page.waitForTimeout()` — it's deprecated. Use `new Promise(r => setTimeout(r, ms))` instead.
- Use `page.waitForSelector(selector, { timeout: ms })` with explicit timeouts everywhere. Never assume a page loads instantly.
- The `userDataDir` in Puppeteer launch options is separate from `session.txt`. The `userDataDir` is Chrome's full profile (localStorage, IndexedDB, browser cookies). The `session.txt` is a simple string backup used by the axios fetcher. Both serve different purposes — keep both.
- All async functions must use `async/await`. No raw Promise chains.
- Every file must export its functions as named exports: `module.exports = { functionName }`.
