// src/services/focusService.js
// Firestore + localStorage fallback when Firebase is unavailable or denied.

import { collection, addDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

const localKey = (reg_no) => `focusSessions:${reg_no}`

/** Unified instant for charts (Firestore uses completed_at; local uses timestamp) */
export function getFocusSessionTime(s) {
  const raw = s?.completed_at || s?.timestamp
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function normalizeFocusSession(raw) {
  const ts = raw.completed_at || raw.timestamp
  return {
    ...raw,
    timestamp: ts,
    completed_at: raw.completed_at || ts,
  }
}

function readLocalFocusSessions(reg_no) {
  try {
    let raw = localStorage.getItem(localKey(reg_no))
    if (!raw) raw = localStorage.getItem('focusSessions')
    if (!raw) return []
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    return arr.map((s) => normalizeFocusSession(typeof s === 'object' ? s : {}))
  } catch {
    return []
  }
}

function writeLocalFocusSessions(reg_no, sessions) {
  try {
    localStorage.setItem(localKey(reg_no), JSON.stringify(sessions))
  } catch (e) {
    console.error('[Focus] localStorage write failed', e)
  }
}

export async function saveFocusSession(reg_no, session) {
  const completedAt = session.timestamp || new Date().toISOString()
  const base = {
    subject: session.subject,
    duration: session.duration,
    effort: session.effort,
    timestamp: completedAt,
    completed_at: completedAt,
    date: new Date().toDateString(),
  }
  let id = session.id ? String(session.id) : `local_${Date.now()}`
  try {
    const col = collection(db, 'students', reg_no, 'focus_sessions')
    const ref = await addDoc(col, base)
    id = ref.id
  } catch (e) {
    console.warn('[Focus] Firestore save failed; session saved locally only.', e)
  }
  const entry = normalizeFocusSession({ id, ...base })
  const prev = readLocalFocusSessions(reg_no).filter((s) => String(s.id) !== id)
  writeLocalFocusSessions(reg_no, [entry, ...prev])
}

export async function getFocusSessions(reg_no) {
  try {
    const col = collection(db, 'students', reg_no, 'focus_sessions')
    const q = query(col, orderBy('completed_at', 'desc'))
    const snap = await getDocs(q)
    const fromCloud = snap.docs.map((d) => normalizeFocusSession({ id: d.id, ...d.data() }))
    const localOnly = readLocalFocusSessions(reg_no).filter((s) =>
      String(s.id).startsWith('local_')
    )
    const byId = new Map(fromCloud.map((s) => [String(s.id), s]))
    localOnly.forEach((s) => {
      if (!byId.has(String(s.id))) byId.set(String(s.id), s)
    })
    const merged = [...byId.values()].sort(
      (a, b) => (getFocusSessionTime(b)?.getTime() || 0) - (getFocusSessionTime(a)?.getTime() || 0)
    )
    writeLocalFocusSessions(reg_no, merged)
    return merged
  } catch (e) {
    console.warn('[Focus] Firestore load failed; using local cache.', e)
    return readLocalFocusSessions(reg_no)
  }
}

export async function computeStreak(reg_no) {
  const sessions = await getFocusSessions(reg_no)
  if (sessions.length === 0) return 0

  const uniqueDates = [
    ...new Set(
      sessions.map((s) => s.date || getFocusSessionTime(s)?.toDateString()).filter(Boolean)
    ),
  ].reverse()

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < uniqueDates.length; i++) {
    const sessionDate = new Date(uniqueDates[i])
    sessionDate.setHours(0, 0, 0, 0)
    const diffDays = (today - sessionDate) / (1000 * 60 * 60 * 24)

    if (diffDays === i) {
      streak++
    } else {
      break
    }
  }

  return streak
}
