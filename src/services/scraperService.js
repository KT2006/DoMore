// src/services/scraperService.js
// ─────────────────────────────────────────────────────────────────────────────
// Unified client for the srm-academia-scraper FastAPI backend.
// Handles: login → optional CAPTCHA → scrape → Firestore cache.
// ─────────────────────────────────────────────────────────────────────────────

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Calls the scraper backend.
 * Returns either:
 *   { status: 'captcha_required', session_id, captcha_image }   ← CAPTCHA needed
 *   { metadata, student, attendance, timetable }                 ← Success
 *
 * @param {string} email
 * @param {string} password
 * @param {string} [captchaText]  - CAPTCHA solution (if resuming after captcha)
 * @param {string} [sessionId]    - Session ID (if resuming after captcha)
 */
export async function callScraper(email, password, captchaText = '', sessionId = '') {
  const body = { email, password }
  if (captchaText && sessionId) {
    body.captcha_text = captchaText
    body.session_id = sessionId
  }

  const response = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const msg = data.detail || data.error || `Scraping failed (${response.status})`
    throw new Error(msg)
  }

  return data
}

/**
 * Full scrape + cache flow.
 * 1. Calls the scraper backend
 * 2. If CAPTCHA required — returns the captcha state for the UI to handle
 * 3. On success — saves everything to Firestore and returns the data
 *
 * @returns {{ captchaRequired: true, sessionId, captchaImage } | { data, profile }}
 */
export async function scrapeAndCache(email, password, captchaText = '', sessionId = '') {
  const result = await callScraper(email, password, captchaText, sessionId)

  // CAPTCHA phase — return to caller for UI handling
  if (result.status === 'captcha_required') {
    return {
      captchaRequired: true,
      sessionId: result.session_id,
      captchaImage: result.captcha_image,
    }
  }

  // Success — cache in Firestore
  const regNo = result.student?.registration_number
  if (!regNo) {
    throw new Error('Scraper returned data without a registration number')
  }

  // Persist to localStorage for session re-use
  localStorage.setItem('reg_no', regNo)
  // Store credentials in sessionStorage so we can refresh during this browser session
  sessionStorage.setItem('srm_email', email)
  sessionStorage.setItem('srm_password', password)

  try {
    const ref = doc(db, 'students', regNo)
    await setDoc(ref, {
      profile: _mapStudentProfile(result.student, email),
      attendance: result.attendance,
      timetable: result.timetable,
      metadata: result.metadata,
      scraped_at: new Date().toISOString(),
    }, { merge: true })
  } catch (e) {
    console.warn('[Scraper] Firestore write failed:', e)
  }

  return {
    captchaRequired: false,
    data: result,
    profile: _mapStudentProfile(result.student, email),
  }
}

/**
 * Map the new scraper's student object to the profile shape used by the frontend.
 */
function _mapStudentProfile(student, email) {
  return {
    name: student.name || '',
    regNumber: student.registration_number || '',
    program: student.program || '',
    department: student.department || '',
    specialization: student.specialization || '',
    semester: student.semester,
    batch: student.batch,
    enrollment_status: student.enrollment_status || '',
    enrollment_date: student.enrollment_date || '',
    // Fields not available from the new scraper
    mobile: '—',
    srmId: email || '',
    section: student.section || '—',
  }
}

/**
 * Try to load cached profile from Firestore using localStorage reg_no.
 * Returns the profile object or null.
 */
export async function loadCachedProfile() {
  const regNo = localStorage.getItem('reg_no')
  if (!regNo) return null

  try {
    const ref = doc(db, 'students', regNo)
    const snap = await getDoc(ref)
    if (snap.exists() && snap.data().profile) {
      console.log('[Scraper] Loaded profile from Firestore cache')
      return snap.data().profile
    }
  } catch (e) {
    console.warn('[Scraper] Firestore read failed:', e)
  }
  return null
}

/**
 * Load cached attendance from Firestore.
 */
export async function loadCachedAttendance() {
  const regNo = localStorage.getItem('reg_no')
  if (!regNo) return null

  try {
    const ref = doc(db, 'students', regNo)
    const snap = await getDoc(ref)
    if (snap.exists() && snap.data().attendance) {
      return snap.data().attendance
    }
  } catch (e) {
    console.warn('[Scraper] Firestore read failed:', e)
  }
  return null
}

/**
 * Load cached timetable from Firestore.
 */
export async function loadCachedTimetable() {
  const regNo = localStorage.getItem('reg_no')
  if (!regNo) return null

  try {
    const ref = doc(db, 'students', regNo)
    const snap = await getDoc(ref)
    if (snap.exists() && snap.data().timetable) {
      return snap.data().timetable
    }
  } catch (e) {
    console.warn('[Scraper] Firestore read failed:', e)
  }
  return null
}

/**
 * Force re-scrape using stored session credentials.
 * Falls back to requiring re-login if no stored credentials.
 */
export async function forceRefresh() {
  const email = sessionStorage.getItem('srm_email')
  const password = sessionStorage.getItem('srm_password')
  if (!email || !password) {
    throw new Error('Session expired. Please log in again to refresh data.')
  }
  return scrapeAndCache(email, password)
}

/**
 * Clear all cached session data (logout).
 */
export function clearSession() {
  localStorage.removeItem('reg_no')
  localStorage.removeItem('password')
  sessionStorage.removeItem('srm_email')
  sessionStorage.removeItem('srm_password')
}
