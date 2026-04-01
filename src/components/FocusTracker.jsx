import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Square, Clock, BookOpen } from 'lucide-react'
import { getColorClasses } from '../utils/colorUtils'
import BackButton from './BackButton'
import { saveFocusSession, getFocusSessions } from '../services/focusService'

const FocusTracker = ({ onBackToDashboard }) => {
  const reg_no = localStorage.getItem('reg_no') || 'demo_student'
  const [isRunning, setIsRunning] = useState(false)
  const [focusMinutes, setFocusMinutes] = useState(25) // editable pomodoro length
  const [seconds, setSeconds] = useState(25 * 60)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [effortLevel, setEffortLevel] = useState('medium')
  const [sessions, setSessions] = useState([])
  const [mode, setMode] = useState('focus') // focus, shortBreak, longBreak

  const subjects = [
    'Mathematics', 'Computer Science', 'Physics', 'Chemistry', 
    'English', 'Data Structures', 'Algorithms', 'Other'
  ]

  const modes = {
    focus: { duration: focusMinutes * 60, label: 'Focus', color: 'mint', icon: '🎯' },
    shortBreak: { duration: 5 * 60, label: 'Short Break', color: 'cyan', icon: '☕' },
    longBreak: { duration: 15 * 60, label: 'Long Break', color: 'pink', icon: '🌙' },
  }

  useEffect(() => {
    // Load saved preferred focus length
    try {
      const saved = localStorage.getItem('focusMinutes')
      if (saved) {
        const v = Math.min(60, Math.max(10, Number(saved) || 25))
        setFocusMinutes(v)
        setSeconds(v * 60)
      }
    } catch (e) {
      console.error('Failed to load focusMinutes', e)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Reset timer when mode changes or focus length changes (but not while running)
    if (!isRunning) {
      setSeconds(modes[mode].duration)
    }
  }, [mode, focusMinutes])

  useEffect(() => {
    try {
      localStorage.setItem('focusMinutes', String(focusMinutes))
    } catch (e) {
      console.error('Failed to save focusMinutes', e)
    }
  }, [focusMinutes])

  // Load saved focus sessions for analytics
  useEffect(() => {
    getFocusSessions(reg_no)
      .then(data => setSessions(data))
      .catch(e => console.error('Failed to load focus sessions', e))
  }, [reg_no])

  useEffect(() => {
    let interval = null
    if (isRunning && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(seconds => seconds - 1)
      }, 1000)
    } else if (seconds === 0 && isRunning) {
      // Timer completed
      handleComplete()
    }
    return () => clearInterval(interval)
  }, [isRunning, seconds])

  const handleComplete = async () => {
    if (mode === 'focus' && selectedSubject) {
      const newSession = {
        id: Date.now().toString(),
        subject: selectedSubject,
        duration: focusMinutes * 60,
        effort: effortLevel,
        timestamp: new Date().toISOString(),
      }
      const updated = [newSession, ...sessions]
      setSessions(updated)
      try {
        await saveFocusSession(reg_no, newSession)
      } catch (e) {
        console.error('Failed to save focus session', e)
      }
    }
    setIsRunning(false)
    // Auto switch to break after focus
    if (mode === 'focus') {
      setMode('shortBreak')
    }
  }

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    if (mode === 'focus' && !selectedSubject) {
      alert('Please select a subject first!')
      return
    }
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setSeconds(modes[mode].duration)
  }

  const progress = ((modes[mode].duration - seconds) / modes[mode].duration) * 100
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const currentMode = modes[mode]
  const colorClasses = getColorClasses(currentMode.color)
  const strokeColor = currentMode.color === 'mint' ? '#22C55E' : currentMode.color === 'cyan' ? '#3B82F6' : '#EC4899'

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-0.5">Focus Timer</h1>
          <p className="text-text-muted text-base">Pomodoro technique for sustained productivity</p>
        </div>
        {onBackToDashboard && <BackButton onClick={onBackToDashboard} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Timer Card */}
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="lg:col-span-2 card-dark p-5 border border-white/20 flex flex-col"
        >
          {/* Mode Selector */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="flex justify-center gap-2">
            {Object.entries(modes).map(([key, value]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (!isRunning) {
                    setMode(key)
                    setSeconds(value.duration)
                  }
                }}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                  mode === key
                    ? `${getColorClasses(value.color).bgMedium} ${getColorClasses(value.color).text} border ${getColorClasses(value.color).borderMedium}`
                    : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
                }`}
              >
                <span className="mr-1">{value.icon}</span>
                {value.label}
              </motion.button>
            ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span>Focus length:</span>
              <input
                type="number"
                min="10"
                max="60"
                value={focusMinutes}
                onChange={(e) => {
                  const v = Math.min(60, Math.max(10, Number(e.target.value) || 25))
                  setFocusMinutes(v)
                }}
                className="w-14 px-2 py-1 rounded bg-midnight border border-white/20 text-text-primary text-xs outline-none"
              />
              <span>minutes</span>
            </div>
          </div>

          {/* Circular Timer */}
          <div className="flex justify-center mb-4">
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle cx="96" cy="96" r="90" stroke="currentColor" strokeWidth="6" fill="none" className="text-white/10" />
                <motion.circle
                  cx="96" cy="96" r="90"
                  stroke={strokeColor}
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-4xl font-bold font-mono ${colorClasses.text} mb-0.5`}>{formatTime(seconds)}</div>
                <p className="text-text-muted text-xs">{currentMode.label} Session</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-2 mb-4">
            {!isRunning ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                className={`px-5 py-2.5 ${colorClasses.bg} text-white rounded-lg font-semibold text-sm flex items-center gap-1.5`}
              >
                <Play className="w-4 h-4" />
                Start Session
              </motion.button>
            ) : (
              <>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleStop} className="px-5 py-2.5 bg-accent-orange text-white rounded-lg font-semibold text-sm flex items-center gap-1.5">
                  <Pause className="w-4 h-4" /> Pause
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleReset} className="px-5 py-2.5 bg-white/10 text-text-primary rounded-lg font-semibold text-sm border border-white/20">
                  <Square className="w-4 h-4" /> Reset
                </motion.button>
              </>
            )}
          </div>

          {mode === 'focus' && (
            <>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-text-primary mb-1.5">Select Subject</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {subjects.map((subject) => (
                    <motion.button
                      key={subject}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedSubject(subject)}
                      className={`p-2 rounded-lg font-medium text-xs transition-all ${
                        selectedSubject === subject ? 'bg-white/20 text-text-primary border border-white/30' : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {subject}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">Effort Level</label>
                <div className="flex gap-2">
                  {[
                    { value: 'low', label: 'Low', icon: '😌', color: 'mint' },
                    { value: 'medium', label: 'Medium', icon: '😊', color: 'cyan' },
                    { value: 'high', label: 'High', icon: '🔥', color: 'amber' },
                  ].map((level) => (
                    <motion.button
                      key={level.value}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setEffortLevel(level.value)}
                      className={`flex-1 p-2 rounded-lg font-medium text-xs transition-all flex items-center justify-center gap-1 ${
                        effortLevel === level.value
                          ? getColorClasses(level.color).bgMedium + ' ' + getColorClasses(level.color).text + ' border ' + getColorClasses(level.color).borderMedium
                          : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-lg">{level.icon}</span>
                      <span>{level.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Session History */}
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="card-dark p-4 border border-white/20 flex flex-col min-h-0"
        >
          <div className="flex items-center gap-1.5 mb-2 flex-shrink-0">
            <Clock className="w-4 h-4 text-text-primary" />
            <h2 className="text-lg font-bold text-text-primary">Today's Sessions</h2>
          </div>
          
          <div className="space-y-2 flex-1 min-h-0 overflow-hidden">
            <AnimatePresence>
              {sessions.length === 0 ? (
                <div className="text-center py-4 text-text-muted text-sm">
                  <BookOpen className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  <p>No sessions yet</p>
                </div>
              ) : (
                sessions.slice(0, 5).map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-2 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary text-sm">{session.subject}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        session.effort === 'high' ? 'bg-accent-green/20 text-accent-green' :
                        session.effort === 'medium' ? 'bg-accent-blue/20 text-accent-blue' :
                        'bg-accent-orange/20 text-accent-orange'
                      }`}>{session.effort}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(session.duration)}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
          {sessions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10 flex-shrink-0">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Total Today</span>
                <span className="font-bold text-text-primary">{formatTime(sessions.reduce((acc, s) => acc + s.duration, 0))}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default FocusTracker
