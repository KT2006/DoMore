import { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, BookOpen, Building2, Hash, FileText, Loader2, Calendar as CalendarIcon } from 'lucide-react'
import BackButton from './BackButton'
import { getFocusSessions, getFocusSessionTime } from '../services/focusService'
import { getAssignments } from '../services/assignmentService'

const UserPage = ({ globalUser, onBackToDashboard }) => {
  const reg_no = localStorage.getItem('reg_no') || 'demo_student'
  const [focusPulse, setFocusPulse] = useState([])
  const [assignmentPulse, setAssignmentPulse] = useState([])

  useEffect(() => {
    getFocusSessions(reg_no).then(setFocusPulse).catch(console.error)
    getAssignments(reg_no).then(setAssignmentPulse).catch(console.error)
  }, [reg_no])
  if (!globalUser) {
    return (
      <div className="h-full flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-indigo-light animate-spin" />
        <p className="text-text-muted">Loading your academic profile...</p>
      </div>
    )
  }

  const student = globalUser;

  const details = [
    { label: 'Registration No', value: student.registrationNo, icon: Hash },
    { label: 'Section', value: student.section, icon: FileText },
    { label: 'Branch', value: student.branch, icon: Building2 },
    { label: 'Department', value: student.department, icon: BookOpen },
    { label: 'Phone', value: student.phone, icon: Phone },
    { label: 'Email', value: student.email, icon: Mail },
  ]

  // Derive study activity from Focus Tracker sessions + Assignments
  const activityStats = useMemo(() => {
    const today = new Date()
    const normalizeDate = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

    const activeDaySet = new Set()

    focusPulse.forEach((s) => {
      const t = getFocusSessionTime(s)
      if (!t) return
      const d = normalizeDate(t)
      activeDaySet.add(d.toISOString())
    })

    assignmentPulse.forEach((a) => {
      if (!a.dueDate) return
      if (a.status === 'pending') return
      const dateVal = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate)
      const d = normalizeDate(dateVal)
      activeDaySet.add(d.toISOString())
    })

    const totalActiveDays = activeDaySet.size

    // Compute streaks over last 90 days
    let currentStreak = 0
    let longestStreak = 0
    for (let i = 0; i < 90; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = normalizeDate(d).toISOString()
      const isActive = activeDaySet.has(key)
      if (isActive) {
        currentStreak++
        longestStreak = Math.max(longestStreak, currentStreak)
      } else if (i === 0) {
        currentStreak = 0
      } else if (currentStreak > 0) {
        currentStreak = 0
      }
    }

    // Build simple calendar for current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const daysInMonth = monthEnd.getDate()
    const firstWeekday = monthStart.getDay() // 0 Sun .. 6 Sat

    const days = []
    for (let i = 0; i < firstWeekday; i++) {
      days.push({ label: '', active: false, isToday: false })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(today.getFullYear(), today.getMonth(), day)
      const key = normalizeDate(d).toISOString()
      const isActive = activeDaySet.has(key)
      const isToday = d.toDateString() === today.toDateString()
      days.push({ label: String(day), active: isActive, isToday })
    }

    return {
      totalActiveDays,
      currentStreak,
      longestStreak,
      monthLabel: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
      days,
    }
  }, [focusPulse, assignmentPulse])

  return (
    <div className="h-full flex flex-col min-h-0 gap-4">
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-0.5">Student Profile</h1>
          <p className="text-text-muted text-base">Your academic and contact details</p>
        </div>
        {onBackToDashboard && <BackButton onClick={onBackToDashboard} />}
      </div>

      {/* Profile header card – same style as reference: avatar, name, reg no below name, dept */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-dark p-5 border border-white/20 flex items-center gap-4 flex-shrink-0"
      >
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-text-primary font-bold text-xl flex-shrink-0">
          {student.initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-text-primary truncate">{student.name}</h2>
          <p className="text-sm text-text-muted mt-0.5 font-mono tracking-wide">
            REGISTRATION NO: {student.registrationNo}
          </p>
        </div>
      </motion.div>

      {/* Detail cards – 2 rows x 3 columns layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-3">
        {details.map((item, index) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-dark p-4 border border-white/20 card-hover h-full"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-white/10">
                  <Icon className="w-4 h-4 text-text-primary" />
                </div>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                  {item.label}
                </span>
              </div>
              <p className="text-text-primary font-medium text-sm break-words">
                {item.value || '—'}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Study streak calendar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-dark p-4 border border-white/20 mt-2 flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-text-primary mb-0.5">Study Streak</h2>
            <p className="text-xs text-text-muted">Focus sessions and assignment work combined</p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex flex-col items-end">
              <span className="text-text-muted">Current Streak</span>
              <span className="text-text-primary font-semibold">
                {activityStats.currentStreak} day{activityStats.currentStreak === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-text-muted">Longest Streak</span>
              <span className="text-text-primary font-semibold">
                {activityStats.longestStreak} day{activityStats.longestStreak === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-text-muted">Active Days</span>
              <span className="text-text-primary font-semibold">
                {activityStats.totalActiveDays}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            <span>{activityStats.monthLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-white/10" /> Inactive
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-accent-green" /> Active
            </span>
          </div>
        </div>

        <div className="mt-1">
          <div className="grid grid-cols-7 gap-1 mb-1 text-[10px] text-text-muted">
            {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map((d) => (
              <span key={d} className="text-center">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-[11px]">
            {activityStats.days.map((day, idx) => (
              <div
                key={`${day.label || 'blank'}-${idx}`}
                className={`h-7 rounded flex items-center justify-center border text-xs ${
                  day.label
                    ? day.active
                      ? 'bg-accent-green text-midnight border-accent-green/70'
                      : 'bg-white/5 text-text-muted border-white/10'
                    : 'border-transparent'
                } ${day.isToday && day.label ? 'ring-1 ring-white/60' : ''}`}
              >
                {day.label}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default UserPage
