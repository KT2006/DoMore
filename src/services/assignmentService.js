// Firestore assignments + localStorage fallback

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '../firebase'

const localKey = (reg_no) => `assignments:${reg_no}`

function parseDueDate(raw) {
  if (raw == null) return null
  if (typeof raw.toDate === 'function') return raw.toDate()
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function mapAssignmentDoc(data, id) {
  const dueDate = parseDueDate(data.due_date ?? data.dueDate)
  const statusRaw = data.status ?? 'pending'
  const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : 'pending'
  const progress =
    typeof data.progress === 'number'
      ? data.progress
      : typeof data.progress_percent === 'number'
        ? data.progress_percent
        : 0

  return {
    id,
    title: data.title ?? '',
    subject: data.subject ?? '',
    description: data.description ?? '',
    dueDate,
    priority: (data.priority ?? 'medium').toLowerCase(),
    status,
    estimatedHours: data.estimatedHours ?? 2,
    progress,
  }
}

function readRawLocal(reg_no) {
  try {
    const raw = localStorage.getItem(localKey(reg_no))
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeRawLocal(reg_no, rows) {
  try {
    localStorage.setItem(localKey(reg_no), JSON.stringify(rows))
  } catch (e) {
    console.error('[Assignments] localStorage write failed', e)
  }
}

function readLocalAssignments(reg_no) {
  return readRawLocal(reg_no).map((r) => mapAssignmentDoc(r, r.id))
}

function toRawRow(id, fields) {
  return {
    id,
    title: fields.title,
    subject: fields.subject,
    description: fields.description,
    due_date: fields.due_date,
    priority: fields.priority,
    status: fields.status,
    progress: fields.progress ?? 0,
    estimatedHours: fields.estimatedHours ?? 2,
    created_at: fields.created_at,
  }
}

export async function addAssignment(reg_no, assignment) {
  const due_date =
    assignment.dueDate instanceof Date
      ? assignment.dueDate.toISOString()
      : String(assignment.dueDate ?? '')

  const row = {
    title: assignment.title,
    subject: assignment.subject,
    description: assignment.description,
    due_date,
    priority: assignment.priority,
    status: (assignment.status || 'pending').toLowerCase(),
    progress: assignment.progress ?? 0,
    estimatedHours: assignment.estimatedHours ?? 2,
    created_at: new Date().toISOString(),
  }

  let id = `local_${Date.now()}`
  try {
    const col = collection(db, 'students', reg_no, 'assignments')
    const docRef = await addDoc(col, row)
    id = docRef.id
  } catch (e) {
    console.warn('[Assignments] Firestore add failed; saved locally only.', e)
  }

  const raw = readRawLocal(reg_no)
  raw.push(toRawRow(id, row))
  writeRawLocal(reg_no, raw)
  return id
}

export async function getAssignments(reg_no) {
  try {
    const col = collection(db, 'students', reg_no, 'assignments')
    let list = []
    try {
      const q = query(col, orderBy('due_date', 'asc'))
      const snap = await getDocs(q)
      list = snap.docs.map((d) => mapAssignmentDoc(d.data(), d.id))
    } catch {
      const snap = await getDocs(col)
      list = snap.docs.map((d) => mapAssignmentDoc(d.data(), d.id))
      list.sort((a, b) => {
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return a.dueDate - b.dueDate
      })
    }
    const localRows = readRawLocal(reg_no).filter((r) => String(r.id).startsWith('local_'))
    const cloudIds = new Set(list.map((a) => String(a.id)))
    const extras = localRows
      .filter((r) => !cloudIds.has(String(r.id)))
      .map((r) => mapAssignmentDoc(r, r.id))
    const merged = [...list, ...extras].sort((a, b) => {
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate - b.dueDate
    })
    writeRawLocal(
      reg_no,
      merged.map((a) =>
        toRawRow(a.id, {
          title: a.title,
          subject: a.subject,
          description: a.description,
          due_date: a.dueDate ? a.dueDate.toISOString() : '',
          priority: a.priority,
          status: a.status,
          progress: a.progress,
          estimatedHours: a.estimatedHours,
          created_at: new Date().toISOString(),
        })
      )
    )
    return merged
  } catch (e) {
    console.warn('[Assignments] Firestore load failed; using local cache.', e)
    return readLocalAssignments(reg_no)
  }
}

export async function updateAssignment(reg_no, assignment_id, updates) {
  const payload = {}
  if (updates.status !== undefined) {
    payload.status =
      typeof updates.status === 'string' ? updates.status.toLowerCase() : updates.status
  }
  if (updates.progress !== undefined) {
    payload.progress = updates.progress
    payload.progress_percent = updates.progress
  }

  try {
    const ref = doc(db, 'students', reg_no, 'assignments', assignment_id)
    await updateDoc(ref, payload)
  } catch (e) {
    console.warn('[Assignments] Firestore update failed; updating local cache.', e)
  }

  const raw = readRawLocal(reg_no)
  const idx = raw.findIndex((r) => r.id === assignment_id)
  if (idx >= 0) {
    if (updates.status !== undefined) raw[idx].status = payload.status ?? updates.status
    if (updates.progress !== undefined) raw[idx].progress = updates.progress
    writeRawLocal(reg_no, raw)
  }
}

export async function deleteAssignment(reg_no, assignment_id) {
  try {
    const ref = doc(db, 'students', reg_no, 'assignments', assignment_id)
    await deleteDoc(ref)
  } catch (e) {
    console.warn('[Assignments] Firestore delete failed; removing from local cache.', e)
  }
  const raw = readRawLocal(reg_no).filter((r) => r.id !== assignment_id)
  writeRawLocal(reg_no, raw)
}
