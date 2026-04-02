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

  const modes = {
    focus: { duration: (Number(focusMinutes) || 25) * 60, label: 'Focus', color: 'mint' },
    shortBreak: { duration: 5 * 60, label: 'Short Break', color: 'cyan' },
    longBreak: { duration: 15 * 60, label: 'Long Break', color: 'pink' },
  }

  useEffect(() => {
    // Load saved preferred focus length
    try {
      const savedLength = localStorage.getItem('focusMinutes')
      if (savedLength) {
        const v = Math.min(120, Math.max(1, Number(savedLength) || 25))
        setFocusMinutes(v)
        setSeconds(v * 60)
      }
    } catch (e) {
      console.error('Failed to load local settings', e)
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

  const handleComplete = async (isEarlyStop = false) => {
    const elapsedSeconds = modes[mode].duration - seconds;
    
    if (mode === 'focus' && selectedSubject && elapsedSeconds > 0) {
      const newSession = {
        id: Date.now().toString(),
        subject: selectedSubject,
        duration: elapsedSeconds,
        effort: effortLevel,
        timestamp: new Date().toISOString(),
      }
      
      const todayStr = new Date().toDateString();
      setSessions(prev => {
         const existingIndex = prev.findIndex(s => s.subject === selectedSubject && new Date(s.timestamp || s.completed_at || new Date()).toDateString() === todayStr);
         if (existingIndex >= 0) {
            const copy = [...prev];
            copy[existingIndex] = { ...copy[existingIndex], duration: (copy[existingIndex].duration || 0) + elapsedSeconds, effort: effortLevel, timestamp: newSession.timestamp };
            const updatedItem = copy.splice(existingIndex, 1)[0];
            return [updatedItem, ...copy];
         }
         return [newSession, ...prev];
      })

      try {
        await saveFocusSession(reg_no, newSession)
      } catch (e) {
        console.error('Failed to save focus session', e)
      }
    }
    
    setIsRunning(false)
    setSelectedSubject('')
    setSeconds(modes[mode].duration)
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

  const todaySessions = Object.values(sessions.reduce((acc, s) => {
    const sDate = new Date(s.timestamp || s.completed_at || new Date()).toDateString();
    if (sDate === new Date().toDateString() && s.subject) {
      if (!acc[s.subject]) {
        acc[s.subject] = { ...s };
      } else {
        acc[s.subject].duration += (s.duration || 0);
        const t1 = new Date(acc[s.subject].timestamp).getTime();
        const t2 = new Date(s.timestamp).getTime();
        acc[s.subject].timestamp = new Date(t1 > t2 ? t1 : t2).toISOString();
      }
    }
    return acc;
  }, {})).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="h-full flex flex-col min-h-0 gap-4 sm:gap-5 lg:gap-6 overflow-y-auto pb-6 pr-1 sm:pr-2">
      <div className="flex items-center justify-between flex-shrink-0 gap-2 sm:gap-4 w-full">
        <div className="flex-1 min-w-0 pr-2">
          <h1 className="text-xl min-[380px]:text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-0.5 sm:mb-1 truncate">Focus Timer</h1>
          <p className="text-text-muted text-[10px] min-[380px]:text-xs sm:text-sm truncate">Pomodoro technique for sustained productivity</p>
        </div>
        {onBackToDashboard && <div className="flex-shrink-0"><BackButton onClick={onBackToDashboard} /></div>}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 flex-none lg:flex-1 lg:min-h-0">
        {/* Timer Card */}
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="lg:col-span-2 card-dark p-4 sm:p-5 lg:p-6 border border-white/20 flex flex-col"
        >
          {/* Mode Selector */}
          <div className="flex flex-col items-center gap-3 sm:gap-4 mb-5 sm:mb-6 w-full">
            <div className="flex flex-row justify-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            {Object.entries(modes).map(([key, value]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (isRunning) setIsRunning(false)
                  setMode(key)
                  setSeconds(value.duration)
                }}
                className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg font-semibold text-[10px] min-[380px]:text-xs sm:text-sm transition-all flex items-center justify-center min-w-0 ${
                  mode === key
                    ? `${getColorClasses(value.color).bgMedium} ${getColorClasses(value.color).text} border ${getColorClasses(value.color).borderMedium}`
                    : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
                }`}
              >
                {value.icon && <span className="mr-1 sm:mr-1.5 flex-shrink-0">{value.icon}</span>}
                <span className="truncate">{value.label}</span>
              </motion.button>
            ))}
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-text-muted bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <span>Focus length:</span>
              <input
                type="number"
                value={focusMinutes}
                onChange={(e) => setFocusMinutes(e.target.value)}
                onBlur={() => {
                  let v = Number(focusMinutes);
                  if (isNaN(v) || v < 1) v = 25;
                  if (v > 120) v = 120;
                  setFocusMinutes(v);
                }}
                className="w-12 sm:w-14 px-1.5 py-0.5 rounded bg-midnight border border-white/20 text-text-primary text-[11px] sm:text-xs outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span>minutes</span>
            </div>
          </div>

          {/* Circular Timer */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <div className="relative w-44 h-44 min-[380px]:w-48 min-[380px]:h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 flex items-center justify-center">
              <svg className="transform -rotate-90 w-full h-full absolute inset-0" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r="90" stroke="currentColor" strokeWidth="4" fill="none" className="text-white/10" />
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
              <div className="relative flex flex-col items-center justify-center z-10 w-full">
                <div className={`text-4xl sm:text-5xl lg:text-6xl font-bold font-mono ${colorClasses.text} mb-1 sm:mb-2 tracking-tight`}>{formatTime(seconds)}</div>
                <p className="text-text-muted text-[10px] sm:text-xs tracking-wide uppercase font-semibold">{currentMode.label} Session</p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-row flex-wrap sm:flex-nowrap justify-center gap-2 sm:gap-4 w-full mb-6 sm:mb-8 px-2 sm:px-0">
            {!isRunning ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStart}
                className={`w-full sm:w-auto px-6 py-3 sm:py-2.5 ${colorClasses.bg} text-white rounded-xl sm:rounded-lg font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg ${currentMode.color === 'mint' ? 'shadow-accent-green/20' : currentMode.color === 'cyan' ? 'shadow-accent-blue/20' : 'shadow-accent-pink/20'}`}
              >
                <Play className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" />
                Start Session
              </motion.button>
            ) : (
              <>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleStop} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 sm:py-2.5 bg-accent-orange text-white rounded-xl sm:rounded-lg font-bold text-[11px] sm:text-base flex items-center justify-center gap-1.5 shadow-lg shadow-accent-orange/20 min-w-0">
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" /> <span className="truncate">Pause</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleComplete(true)} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 sm:py-2.5 bg-[#EF4444] text-white rounded-xl sm:rounded-lg font-bold text-[11px] sm:text-base flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/20 min-w-0">
                  <Square className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" /> <span className="truncate">End Session</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleReset} className="flex-1 sm:flex-none sm:w-auto px-2 sm:px-6 py-3 sm:py-2.5 bg-white/10 text-text-primary rounded-xl sm:rounded-lg font-bold text-[11px] sm:text-base border border-white/20 flex items-center justify-center gap-1.5 hover:bg-white/15 transition-colors min-w-0">
                  <Square className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 outline-none" fill="none" /> <span className="truncate">Reset</span>
                </motion.button>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Extra options only shown in focus mode */}
          {mode === 'focus' && (
            <div className="flex flex-col gap-4 lg:gap-6 mt-auto border-t border-white/10 pt-4 sm:pt-6">
              <div className="flex flex-col gap-3">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Subject</label>
                <input
                  type="text"
                  placeholder="What are you working on?"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-text-muted text-sm outline-none focus:border-white/30 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Effort Level</label>
                <div className="flex gap-1.5 sm:gap-2 w-full">
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
                      className={`flex-1 p-2 rounded-lg font-medium text-[10px] min-[380px]:text-[11px] sm:text-xs transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 min-h-[56px] sm:min-h-[44px] min-w-0 overflow-hidden ${
                        effortLevel === level.value
                          ? getColorClasses(level.color).bgMedium + ' ' + getColorClasses(level.color).text + ' border ' + getColorClasses(level.color).borderMedium + ' shadow-sm'
                          : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-lg sm:text-xl flex-shrink-0">{level.icon}</span>
                      <span className="truncate w-full inline-block">{level.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Session History */}
        <motion.div
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="card-dark p-4 sm:p-5 lg:p-6 border border-white/20 flex flex-col min-h-[300px] lg:min-h-0"
        >
          <div className="flex items-center gap-2 mb-4 flex-shrink-0 border-b border-white/10 pb-3">
            <Clock className="w-5 h-5 text-accent-blue" />
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-text-primary">Today's Sessions</h2>
          </div>
          
          <div className="space-y-3 flex-1 min-h-0 lg:overflow-y-auto custom-scrollbar pr-1">
            <AnimatePresence>
              {todaySessions.length === 0 ? (
                <div className="text-center py-8 text-text-muted text-sm flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <BookOpen className="w-6 h-6 opacity-40" />
                  </div>
                  <p>No sessions logged yet</p>
                  <p className="text-[10px] mt-1 opacity-60">Start a timer to see your history</p>
                </div>
              ) : (
                todaySessions.slice(0, 8).map((session) => (
                  <motion.div
                    key={session.id || session.subject}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-3 bg-white/5 hover:bg-white/10 transition-colors rounded-xl border border-white/10"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-text-primary text-xs sm:text-sm truncate flex-1 min-w-0">{session.subject}</span>
                      <span className={`flex-shrink-0 text-[9px] sm:text-[10px] md:text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        session.effort === 'high' ? 'bg-accent-green/20 text-accent-green' :
                        session.effort === 'medium' ? 'bg-accent-blue/20 text-accent-blue' :
                        'bg-accent-orange/20 text-accent-orange'
                      }`}>{session.effort}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-text-muted mt-2 bg-white/5 w-max px-2 py-1 rounded-md">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono">{formatTime(session.duration)}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
          {todaySessions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 flex-shrink-0 bg-indigo-dark/50 -mx-4 -mb-4 px-4 py-3 sm:-mx-5 sm:-mb-5 sm:px-5 sm:py-4 lg:-mx-6 lg:-mb-6 lg:px-6 lg:py-4 rounded-b-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm font-semibold text-text-muted uppercase tracking-wider">Total Focus Today</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-accent-blue">{formatTime(todaySessions.reduce((acc, s) => acc + s.duration, 0))}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default FocusTracker
