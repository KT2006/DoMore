import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock, MapPin, Plus, Edit2, Trash2, Sparkles, Loader2 } from 'lucide-react'
import BackButton from './BackButton'
import { getTimetable } from '../services/timetableService'

const DAY_START_MINUTES = 8 * 60 // 08:00
// Fixed SRM slot grid (start times only) used for the Y-axis every day
const SLOT_TIMES_MINUTES = [
  8 * 60,        // 08:00
  8 * 60 + 50,   // 08:50
  9 * 60 + 45,   // 09:45
  10 * 60 + 40,  // 10:40
  11 * 60 + 35,  // 11:35
  12 * 60 + 25,  // 12:25
  13 * 60,       // 13:00
  14 * 60,       // 14:00
  15 * 60,       // 15:00
  16 * 60,       // 16:00
]
const DAY_END_MINUTES = SLOT_TIMES_MINUTES[SLOT_TIMES_MINUTES.length - 1]
const PX_PER_MIN = 1.25
const TIME_COL_W = 76 // px
const TOP_PADDING_PX = 14 // prevents top label clipping
const BOTTOM_PADDING_PX = 16 // nicer scroll end
const BLOCK_GAP_PX = 8 // breathing space between blocks

const parse12hTimeToMinutes = (timeStr) => {
  // "08:50 AM" -> minutes since midnight
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  let hours = parseInt(m[1], 10)
  const mins = parseInt(m[2], 10)
  const period = m[3].toUpperCase()
  if (period === 'PM' && hours < 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return hours * 60 + mins
}

const Timetable = ({ onNavigate }) => {
  const [selectedDay, setSelectedDay] = useState('Day 1')
  const [showAddModal, setShowAddModal] = useState(false)
  const [schedule, setSchedule] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5']

  const dayEndMinutes = DAY_END_MINUTES
  const gridHeightPx =
    TOP_PADDING_PX + (dayEndMinutes - DAY_START_MINUTES) * PX_PER_MIN + BOTTOM_PADDING_PX

  useEffect(() => {
    const reg_no = localStorage.getItem('reg_no') || 'demo_student'

    getTimetable(reg_no)
      .then(data => {
        if (!data) {
          setError('No timetable data found. Please log in again.')
          setLoading(false)
          return
        }

        // New scraper format:
        //   { "1": [ { hour, start_time, end_time, slot_code, course: { course_code, course_title, category, room_no, faculty_name } | null } ], ... }
        const mappedSchedule = {}
        const colors = ['mint', 'cyan', 'amber', 'purple', 'rose']
        let colorIdx = 0

        // Iterate over day keys ("1" through "5")
        Object.entries(data).forEach(([dayKey, slots]) => {
          const dayName = `Day ${dayKey}`
          mappedSchedule[dayName] = []

          if (!Array.isArray(slots)) return

          slots.forEach((slot, idx) => {
            // Skip free periods (course is null)
            if (!slot.course) return

            // Parse 24h time strings like "08:50" or "01:25" into minutes
            const parseTime = (timeStr) => {
              if (!timeStr) return null
              const parts = timeStr.split(':')
              if (parts.length !== 2) return null
              let h = parseInt(parts[0], 10)
              const m = parseInt(parts[1], 10)
              if (isNaN(h) || isNaN(m)) return null
              // Handle PM times stored as 12h format (e.g., "01:25" = 13:25)
              if (h < 8) h += 12
              return h * 60 + m
            }

            const startMinutes = parseTime(slot.start_time)
            const endMinutes = parseTime(slot.end_time)

            if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) return

            const startH = Math.floor(startMinutes / 60)
            const startM = startMinutes % 60
            const timeStr = `${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}`
            const duration = endMinutes - startMinutes

            mappedSchedule[dayName].push({
              id: `${dayName}-${idx}`,
              subject: slot.course.course_title || 'Unknown',
              time: timeStr,
              duration,
              location: slot.course.room_no || 'TBA',
              color: colors[colorIdx % colors.length],
            })
            colorIdx++
          })
        })

        setSchedule(mappedSchedule)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('Could not load timetable. Make sure API is running.')
        setLoading(false)
      })
  }, [])

  const getCurrentTime = () => {
    const now = new Date()
    return now.getHours() * 60 + now.getMinutes()
  }

  const getClassStatus = (classTime) => {
    const [hour, min] = classTime.split(':').map(Number)
    const classStartMinutes = hour * 60 + min
    const currentMinutes = getCurrentTime()
    
    if (classStartMinutes < currentMinutes) return 'past'
    if (classStartMinutes <= currentMinutes + 30) return 'current'
    return 'upcoming'
  }

  const getFreeTimeBlocks = (day) => {
    const classes = schedule[day] || []
    const freeBlocks = []
    let currentTime = DAY_START_MINUTES

    classes.sort((a, b) => {
      const [aHour, aMin] = a.time.split(':').map(Number)
      const [bHour, bMin] = b.time.split(':').map(Number)
      return (aHour * 60 + aMin) - (bHour * 60 + bMin)
    }).forEach((cls) => {
      const [hour, min] = cls.time.split(':').map(Number)
      const classStart = hour * 60 + min
      
      if (classStart > currentTime) {
        const gap = classStart - currentTime
        if (gap >= 25) {
          freeBlocks.push({
            start: currentTime,
            end: classStart,
            duration: gap,
          })
        }
      }
      currentTime = classStart + cls.duration
    })

    const endOfDay = dayEndMinutes
    if (currentTime < endOfDay) {
      const gap = endOfDay - currentTime
      if (gap >= 25) {
        freeBlocks.push({
          start: currentTime,
          end: endOfDay,
          duration: gap,
        })
      }
    }

    return freeBlocks
  }

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  const formatDurationHuman = (minutes) => {
    if (minutes < 60) return `${minutes}m`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 text-indigo-light animate-spin" />
        <p className="text-text-muted">Loading your timetable...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl max-w-md">
           <h3 className="text-red-400 font-bold mb-2">Error</h3>
           <p className="text-text-muted text-sm">{error}</p>
        </div>
        {onNavigate && <BackButton onClick={() => onNavigate('dashboard')} />}
      </div>
    )
  }

  const freeBlocks = getFreeTimeBlocks(selectedDay)
  const dayClasses = (schedule[selectedDay] || [])
    .map((cls) => {
      const [h, m] = cls.time.split(':').map(Number)
      const startMinutes = h * 60 + m
      return { ...cls, startMinutes, endMinutes: startMinutes + cls.duration }
    })
    .filter((cls) => cls.startMinutes >= DAY_START_MINUTES && cls.startMinutes < dayEndMinutes)
    .sort((a, b) => a.startMinutes - b.startMinutes)

  const axisMarkers = (() => {
    // Permanent timetable timing grid for all days,
    // aligned exactly with SRM slot boundaries.
    return SLOT_TIMES_MINUTES.map((minutes) => ({
      label: formatTime(minutes),
      minutes,
      yOffset: 0,
    }))
  })()

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-0.5">Academic Timetable</h1>
          <p className="text-text-muted text-base">View your schedule and identify free time blocks</p>
        </div>
        <div className="flex items-center gap-2">
          {onNavigate && <BackButton onClick={() => onNavigate('dashboard')} />}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-white/20 text-text-primary rounded-lg font-semibold text-sm flex items-center gap-1.5 border border-white/20"
          >
            <Plus className="w-4 h-4" />
            Add Class
          </motion.button>
        </div>
      </div>

      <div className="card-dark p-2 border border-white/20 flex-shrink-0">
        <div className="flex gap-1.5 overflow-x-auto">
          {days.map((day) => (
            <motion.button
              key={day}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all ${
                selectedDay === day ? 'bg-white/20 text-text-primary border border-white/30' : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
              }`}
            >
              {day}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 card-dark p-4 border border-white/20 flex flex-col min-h-0 overflow-hidden"
        >
          <h2 className="text-lg font-bold text-text-primary mb-3 flex-shrink-0">{selectedDay}'s Schedule</h2>
          
          <div className="relative flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="relative" style={{ height: `${gridHeightPx}px` }}>
              {/* Time column (y-axis) */}
              <div className="absolute left-0 top-0 bottom-0 z-10 pointer-events-none" style={{ width: `${TIME_COL_W}px` }}>
                {axisMarkers.map((marker) => {
                  const offsetMinutes = marker.minutes - DAY_START_MINUTES
                  const top = TOP_PADDING_PX + offsetMinutes * PX_PER_MIN + (marker.yOffset ?? 0)
                  return (
                    <div
                      key={`${marker.label}-${marker.minutes}`}
                      className="absolute left-0 text-[11px] font-medium text-text-muted"
                      style={{ top: `${top}px` }}
                    >
                      <span className="inline-block bg-indigo-dark pr-2">{marker.label}</span>
                    </div>
                  )
                })}
              </div>

              {/* Class blocks */}
              <div className="absolute inset-0 z-20" style={{ marginLeft: `${TIME_COL_W}px` }}>
                {dayClasses.map((cls) => {
                  const startMinutes = cls.startMinutes
                  const offsetMinutes = startMinutes - DAY_START_MINUTES
                  const topOffset = TOP_PADDING_PX + offsetMinutes * PX_PER_MIN
                  const rawHeight = cls.duration * PX_PER_MIN
                  const height = Math.max(rawHeight - BLOCK_GAP_PX, 24)
                  const status = getClassStatus(cls.time)

                  const statusStyles = {
                    current: 'bg-accent-green/10 border-accent-green/40 border-l-accent-green',
                    upcoming: 'bg-accent-blue/10 border-accent-blue/40 border-l-accent-blue',
                    past: 'bg-white/5 border-white/10 border-l-text-muted opacity-60',
                  }

                  const isCompact = height < 52
                  const isTall = height >= 90 // roughly ≥ 1.2h worth of height

                  return (
                    <motion.div
                      key={cls.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`absolute left-0 right-4 rounded-xl border-l-4 overflow-hidden ${statusStyles[status]} ${
                        status === 'current' ? 'glow-mint' : ''
                      } ${isCompact ? 'px-2 py-1.5' : 'px-3 py-3'} shadow-sm`}
                      style={{ top: `${topOffset}px`, height: `${height}px` }}
                    >
                      <div className={`flex justify-between h-full gap-2 ${isTall ? 'items-center' : 'items-start'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-text-primary truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>{cls.subject}</h3>
                            {status === 'current' && (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-2 h-2 rounded-full bg-accent-green flex-shrink-0"
                              />
                            )}
                          </div>

                          {!isCompact && (
                            <div className="flex items-center gap-3 text-xs text-text-muted mt-1 min-w-0">
                              <span className="flex items-center gap-1.5 whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5" />
                                {cls.time} - {formatTime(startMinutes + cls.duration)}
                              </span>
                              <span className="flex items-center gap-1.5 min-w-0">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{cls.location}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {(schedule[selectedDay] || []).length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted text-sm bg-indigo-dark z-20">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No classes scheduled for {selectedDay}</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-dark p-4 border border-white/20 flex flex-col min-h-0 overflow-hidden"
        >
          <div className="flex items-center gap-1.5 mb-2 flex-shrink-0">
            <Sparkles className="w-4 h-4 text-text-primary" />
            <h2 className="text-lg font-bold text-text-primary">Available Free Time</h2>
          </div>
          
          {freeBlocks.length === 0 ? (
            <div className="text-center py-4 text-text-muted text-sm">
              <p>No free time blocks</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
              {freeBlocks.slice(0, 4).map((block, index) => (
                <div key={index} className="p-2 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text-primary text-sm">Block {index + 1}</span>
                    <span className="text-xs font-semibold text-text-primary">
                      {formatDurationHuman(block.duration)}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">{formatTime(block.start)} - {formatTime(block.end)}</div>
                  <button 
                    type="button"
                    onClick={() => onNavigate?.('focus')}
                    className="w-full mt-1 px-2 py-1 bg-white/10 text-text-primary rounded text-xs font-medium border border-white/20 hover:bg-white/20 transition-colors"
                  >
                    Plan Study Session
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-white/10 flex-shrink-0">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Total Free Time</span>
              <span className="font-bold text-text-primary">
                {Math.floor(freeBlocks.reduce((acc, b) => acc + b.duration, 0) / 60)}h {freeBlocks.reduce((acc, b) => acc + b.duration, 0) % 60}m
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Timetable
