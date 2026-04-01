// src/services/timetableService.js
// ─────────────────────────────────────────────────────────────────────────────
// Scrapes timetable ONCE via your existing /api/timetable endpoint,
// stores in Firestore under students/{reg_no}/timetable,
// and serves from cache on every subsequent visit — zero scraping.
// ─────────────────────────────────────────────────────────────────────────────

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Returns timetable for the given student.
 * - First call: hits /api/timetable, saves to Firestore, returns data.
 * - All future calls: returns from Firestore instantly (no scraping).
 *
 * @param {string} reg_no   - Student registration number (e.g. "RA2311030010137") — used for Firestore path only
 * @param {string} [password] - If omitted, api-check uses session.txt or SRM_* from .env (body is {})
 */
export async function getTimetable(reg_no, password) {
  const ref = doc(db, 'students', reg_no)
  const snap = await getDoc(ref)

  // ── Cache HIT: return from Firestore immediately ──────────────────────────
  if (snap.exists() && snap.data().timetable) {
    console.log('[Timetable] Serving from Firestore cache')
    return snap.data().timetable
  }

  // ── Cache MISS: scrape via your existing API, then save ───────────────────
  console.log('[Timetable] Cache miss — fetching from portal...')
  const apiBody =
    password != null && String(password) !== ''
      ? { reg_no, password }
      : {}
  const response = await fetch('/api/timetable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiBody),
  })

  if (!response.ok) {
    throw new Error('Failed to fetch timetable from portal')
  }

  const freshData = await response.json()

  // Save to Firestore (merge: true keeps other fields like profile intact)
  await setDoc(ref, {
    timetable: freshData,
    timetable_scraped_at: new Date().toISOString()
  }, { merge: true })

  console.log('[Timetable] Saved to Firestore cache')
  return freshData
}

/**
 * Force re-scrape — call this when student clicks "Refresh Timetable" button.
 * Overwrites the cached timetable with fresh data from the portal.
 */
export async function forceRefreshTimetable(reg_no, password) {
  console.log('[Timetable] Force refresh triggered')
  const apiBody =
    password != null && String(password) !== ''
      ? { reg_no, password }
      : {}
  const response = await fetch('/api/timetable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiBody),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh timetable from portal')
  }

  const freshData = await response.json()
  const ref = doc(db, 'students', reg_no)

  await setDoc(ref, {
    timetable: freshData,
    timetable_scraped_at: new Date().toISOString()
  }, { merge: true })

  return freshData
}
