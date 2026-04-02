import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Target, TrendingUp, Calendar, Sparkles, BookOpen } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { getColorClasses } from '../utils/colorUtils'
import Profile from './Profile'
import { getFocusSessions, getFocusSessionTime } from '../services/focusService'
import { getAssignments } from '../services/assignmentService'

const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const Dashboard = ({ globalUser, onNavigate }) => {
  const reg_no = localStorage.getItem('reg_no') || 'demo_student'
  const [focusSessions, setFocusSessions] = useState([])
  const [assignments, setAssignments] = useState([])

  useEffect(() => {
    getFocusSessions(reg_no).then(setFocusSessions).catch(console.error)
    getAssignments(reg_no).then(setAssignments).catch(console.error)
  }, [reg_no])

  const now = new Date()
  const todayKey = now.toDateString()
  const normalizeDate = d => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  const todaySessions = focusSessions.filter(s => {
    const t = getFocusSessionTime(s)
    return t && t.toDateString() === todayKey
  })
  const todayFocusSeconds = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const todayFocusHours = todayFocusSeconds / 3600

  const activeDaySet = new Set(
    focusSessions
      .map(s => getFocusSessionTime(s))
      .filter(Boolean)
      .map(d => normalizeDate(d).toDateString())
  )

  const totalDaysWindow = 30
  const consistency = activeDaySet.size
    ? Math.round((activeDaySet.size / totalDaysWindow) * 100)
    : 0

  const weekStart = (() => {
    const d = new Date(now)
    const day = d.getDay() // 0 Sun
    const diff = (day === 0 ? -6 : 1) - day // Monday as first day
    d.setDate(d.getDate() + diff)
    return normalizeDate(d)
  })()

  const weeklyData = weekdayLabels.map((label, index) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + index)
    const daySessions = focusSessions.filter(s => {
      const t = getFocusSessionTime(s)
      return t && normalizeDate(t).toDateString() === d.toDateString()
    })
    const seconds = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0)
    return { day: label, hours: seconds / 3600 }
  })

  const subjectTotals = {}
  todaySessions.forEach(s => {
    const key = s.subject || 'Other'
    subjectTotals[key] = (subjectTotals[key] || 0) + (s.duration || 0) / 3600
  })
  const subjectDistributionRaw = Object.entries(subjectTotals).map(([name, value]) => ({
    name,
    value,
    color:
      name === 'Mathematics'
        ? '#DC2626'
        : name === 'Computer Science'
        ? '#3B82F6'
        : name === 'Physics'
        ? '#EAB308'
        : '#22C55E',
  }))
  const subjectDistribution =
    subjectDistributionRaw.length > 0
      ? subjectDistributionRaw
      : [{ name: 'No focus today', value: 1, color: '#4B5563' }]

  const upcomingAssignments = assignments
    .filter(a => a.dueDate && a.dueDate >= now && a.status !== 'completed')
    .sort((a, b) => a.dueDate - b.dueDate)

  const stats = [
    {
      icon: Clock,
      label: "Today's Focus",
      value: `${todayFocusHours.toFixed(1)}h`,
      change: '',
      trend: 'neutral',
      color: 'neutral',
    },
    {
      icon: Target,
      label: 'Weekly Goal',
      value: `${Math.min(100, Math.round((todayFocusHours / 10) * 100))}%`,
      change: '',
      trend: 'neutral',
      color: 'neutral',
    },
    {
      icon: TrendingUp,
      label: 'Consistency',
      value: `${consistency}%`,
      change: '',
      trend: 'neutral',
      color: 'neutral',
    },
    {
      icon: Calendar,
      label: 'Upcoming',
      value: String(upcomingAssignments.length),
      change: 'Deadlines',
      trend: 'neutral',
      color: 'red',
    },
  ]

  return (
    <div className="h-full flex flex-col min-h-0 gap-4 sm:gap-5 lg:gap-6 overflow-y-auto pb-6 pr-1 sm:pr-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 flex-shrink-0">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-1">Welcome back</motion.h1>
          <p className="text-text-muted text-sm sm:text-base">Here's your productivity overview</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-dark border border-white/20">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent-green" />
            <span className="text-text-primary text-xs sm:text-sm font-medium">Focus Streak: 7 days</span>
            <span className="text-accent-orange">🔥</span>
          </motion.div>
          <Profile user={globalUser} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 flex-shrink-0">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colors = getColorClasses(stat.color)
          const isRed = stat.color === 'red'

          const handleCardClick = () => {
            if (!onNavigate) return
            if (stat.label === "Today's Focus" || stat.label === 'Weekly Goal' || stat.label === 'Consistency') {
              onNavigate('analytics')
            } else if (stat.label === 'Upcoming') {
              onNavigate('assignments')
            }
          }

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`card-dark p-3 sm:p-4 lg:p-5 border ${isRed ? 'bg-accent-red border-accent-red' : ''} ${!isRed ? colors.borderMedium : ''} card-hover ${onNavigate ? 'cursor-pointer' : ''}`}
              onClick={handleCardClick}
            >
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <div className={`p-1.5 sm:p-2 rounded-lg ${isRed ? 'bg-white/20' : colors.bgLight}`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isRed ? 'text-white' : colors.text}`} />
                </div>
                {!isRed && stat.change && (
                  <span className="text-[10px] sm:text-xs font-semibold text-text-muted">{stat.change}</span>
                )}
              </div>
              <h3 className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-0.5 ${isRed ? 'text-white' : 'text-text-primary'}`}>{stat.value}</h3>
              <p className={`text-[11px] sm:text-xs lg:text-sm text-text-muted ${isRed ? 'text-white/90' : ''}`}>{stat.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-dark p-4 sm:p-5 border border-white/20 card-hover flex flex-col min-h-[300px] sm:min-h-[320px] cursor-pointer"
          onClick={() => onNavigate && onNavigate('analytics')}
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-text-primary">Weekly Focus Trend</h2>
          </div>
          <div className="flex-1 min-h-[220px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="hours" stroke="#9CA3AF" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="card-dark p-4 sm:p-5 border border-white/20 card-hover flex flex-col min-h-[300px] sm:min-h-[320px] cursor-pointer"
          onClick={() => onNavigate && onNavigate('analytics')}
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-text-primary">Subject Distribution</h2>
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-text-muted" />
          </div>
          <div className="flex-1 min-h-[220px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectDistribution}
                  cx="50%" cy="50%"
                  outerRadius="80%"
                  innerRadius="60%"
                  stroke="none"
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subjectDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#9CA3AF' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Sessions & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 flex-shrink-0">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-dark p-4 sm:p-5 border border-white/20 card-hover cursor-pointer"
          onClick={() => onNavigate && onNavigate('focus')}
        >
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-text-primary mb-3 sm:mb-4">Recent Focus Sessions</h2>
          <div className="space-y-3">
            {todaySessions.slice(0, 3).map((session, index) => {
              const color =
                session.effort === 'high' ? 'mint' : session.effort === 'medium' ? 'cyan' : 'amber'
              const timeAgo = 'Today'
              return (
              <div key={index} className="p-3 sm:p-3.5 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between transition-colors hover:bg-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-sm sm:text-base font-bold shadow-sm ${getColorClasses(color).bgLight} ${getColorClasses(color).text}`}>
                    {session.subject?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary text-sm sm:text-base line-clamp-1">{session.subject}</p>
                    <p className="text-xs sm:text-sm text-text-muted">{timeAgo}</p>
                  </div>
                </div>
                <span className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                  session.effort === 'high' ? 'bg-accent-green/20 text-accent-green' :
                  session.effort === 'medium' ? 'bg-accent-blue/20 text-accent-blue' :
                  'bg-accent-orange/20 text-accent-orange'
                }`}>{session.effort}</span>
              </div>
            )})}
            {todaySessions.length === 0 && (
              <div className="p-4 text-center rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-text-muted">No focus sessions logged today yet.</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-dark p-4 sm:p-5 border border-white/20 card-hover cursor-pointer"
          onClick={() => onNavigate && onNavigate('assignments')}
        >
          <h2 className="text-base sm:text-lg lg:text-xl font-bold text-text-primary mb-3 sm:mb-4">Upcoming Deadlines</h2>
          <div className="space-y-3">
            {upcomingAssignments.slice(0, 3).map((item, index) => {
              const daysLeft = Math.ceil(
                (item.dueDate - now) / (1000 * 60 * 60 * 24)
              )
              const dueLabel = daysLeft <= 0 ? 'Due today' : `Due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
              const priorityLabel =
                item.priority === 'high'
                  ? 'High'
                  : item.priority === 'medium'
                  ? 'Medium'
                  : 'Low'
              return (
              <div key={item.id} className={`p-3 sm:p-3.5 rounded-xl border flex items-center justify-between transition-colors ${index === 0 ? 'bg-accent-blue/10 border-accent-blue/40 hover:bg-accent-blue/20' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                <div className="flex-1 mr-2">
                  <p className="font-semibold text-text-primary text-sm sm:text-base line-clamp-1">{item.title}</p>
                  <p className={`text-xs sm:text-sm mt-0.5 ${daysLeft <= 0 ? 'text-accent-red font-semibold' : 'text-text-muted'}`}>{dueLabel}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                  item.priority === 'high' ? 'bg-accent-red/20 text-accent-red' :
                  item.priority === 'medium' ? 'bg-accent-amber/20 text-accent-amber' :
                  'bg-accent-blue/20 text-accent-blue'
                }`}>
                  {priorityLabel}
                </span>
              </div>
            )})}
            {upcomingAssignments.length === 0 && (
              <div className="p-4 text-center rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-text-muted">No upcoming deadlines.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
