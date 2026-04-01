// src/services/profileService.js
// ─────────────────────────────────────────────────────────────────────────────
// Fetches student profile from SRM portal ONCE via your /api/profile endpoint,
// stores in Firestore, and serves from cache forever after.
// Primary path: POST /api/profile with {} — api-check uses session.txt or SRM_NETID/SRM_PASSWORD in .env
// ─────────────────────────────────────────────────────────────────────────────

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Bootstraps the app: load profile from Firestore cache if we already have reg_no,
 * otherwise call /api/profile (server authenticates via session.txt or .env).
 *
 * @returns {Promise<object>} Parsed Academia profile (name, regNumber, …)
 */
export async function bootstrapProfileFromServer() {
  const cachedReg = localStorage.getItem('reg_no')
  if (cachedReg) {
    try {
      const ref = doc(db, 'students', cachedReg)
      const snap = await getDoc(ref)
      if (snap.exists() && snap.data().profile) {
        console.log('[Profile] bootstrap: Firestore cache hit')
        return snap.data().profile
      }
    } catch (e) {
      console.warn('[Profile] Firestore cache read failed', e)
    }
  }

  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || `Profile request failed (${response.status})`)
  }
  if (payload.error) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Profile error')
  }

  const reg_no = payload.regNumber
  if (!reg_no) {
    throw new Error('Profile response missing regNumber')
  }

  localStorage.setItem('reg_no', reg_no)
  localStorage.removeItem('password')

  try {
    const ref = doc(db, 'students', reg_no)
    await setDoc(
      ref,
      { profile: payload, profile_scraped_at: new Date().toISOString() },
      { merge: true }
    )
  } catch (e) {
    console.warn('[Profile] Firestore cache write failed', e)
  }

  console.log('[Profile] bootstrap: fetched from API')
  return payload
}

/**
 * Returns profile for the given student.
 * - First call: hits /api/profile, saves to Firestore.
 * - All future calls: returns from Firestore instantly.
 *
 * @param {string} reg_no   - Student registration number
 * @param {string} password - SRM portal password
 */
export async function getProfile(reg_no, password) {
  const ref = doc(db, 'students', reg_no)
  const snap = await getDoc(ref)

  // ── Cache HIT ─────────────────────────────────────────────────────────────
  if (snap.exists() && snap.data().profile) {
    console.log('[Profile] Serving from Firestore cache')
    return snap.data().profile
  }

  // ── Cache MISS: fetch from your existing API ──────────────────────────────
  console.log('[Profile] Cache miss — fetching from portal...')
  const response = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reg_no, password })
  })

  if (!response.ok) {
    throw new Error('Failed to fetch profile from portal')
  }

  const profile = await response.json()

  await setDoc(ref, {
    profile,
    profile_scraped_at: new Date().toISOString()
  }, { merge: true })

  console.log('[Profile] Saved to Firestore cache')
  return profile
}
