// src/services/timetableService.js
// ─────────────────────────────────────────────────────────────────────────────
// Timetable service — reads from Firestore cache.
// Fresh scraping is handled by scraperService.js on login.
// ─────────────────────────────────────────────────────────────────────────────

import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { forceRefresh } from './scraperService'

/**
 * Returns timetable from Firestore cache.
 *
 * @param {string} reg_no - Student registration number
 * @returns {Promise<object|null>}
 */
export async function getTimetable(reg_no) {
  if (!reg_no) return null

  try {
    const ref = doc(db, 'students', reg_no)
    const snap = await getDoc(ref)
    if (snap.exists() && snap.data().timetable) {
      console.log('[Timetable] Serving from Firestore cache')
      return snap.data().timetable
    }
  } catch (e) {
    console.warn('[Timetable] Firestore cache read failed', e)
  }
  return null
}

/**
 * Force re-scrape timetable.
 * Uses stored session credentials from scraperService.
 *
 * @param {string} reg_no - Student registration number (used for Firestore read-back)
 * @returns {Promise<object>}
 */
export async function forceRefreshTimetable(reg_no) {
  console.log('[Timetable] Force refresh triggered')
  const result = await forceRefresh()
  if (result.captchaRequired) {
    throw new Error('CAPTCHA required during refresh. Please log in again.')
  }
  // Read fresh data back from Firestore
  return getTimetable(reg_no)
}
