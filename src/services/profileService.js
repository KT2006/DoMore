// src/services/profileService.js
// ─────────────────────────────────────────────────────────────────────────────
// Profile service — reads from Firestore cache only.
// Scraping is handled by scraperService.js on login.
// ─────────────────────────────────────────────────────────────────────────────

import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Load profile from Firestore for the given registration number.
 * Returns null if not cached.
 *
 * @param {string} reg_no
 * @returns {Promise<object|null>}
 */
export async function getProfile(reg_no) {
  if (!reg_no) return null

  try {
    const ref = doc(db, 'students', reg_no)
    const snap = await getDoc(ref)
    if (snap.exists() && snap.data().profile) {
      console.log('[Profile] Serving from Firestore cache')
      return snap.data().profile
    }
  } catch (e) {
    console.warn('[Profile] Firestore cache read failed', e)
  }
  return null
}

/**
 * Try to bootstrap profile from Firestore using localStorage reg_no.
 * Returns profile data or null (never throws on cache miss).
 */
export async function bootstrapProfileFromServer() {
  const cachedReg = localStorage.getItem('reg_no')
  if (!cachedReg) return null

  return getProfile(cachedReg)
}
