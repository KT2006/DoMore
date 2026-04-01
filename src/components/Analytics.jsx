import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Clock, Target, Zap, Calendar, BarChart3 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts'
import BackButton from './BackButton'
import { getFocusSessions, getFocusSessionTime } from '../services/focusService'
import { getAssignments } from '../services/assignmentService'

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const Analytics = ({ onBackToDashboard }) => {
  const reg_no = localStorage.getItem('reg_no') || 'demo_student'
  const [focusSessions, setFocusSessions] = useState([])
  const [assignments, setAssignments] = useState([])

  useEffect(() => {
    getFocusSessions(reg_no).then(setFocusSessions).catch(console.error)
    getAssignments(reg_no).then(setAssignments).catch(console.error)
  }, [reg_no])

  const totalFocusSeconds = focusSessions.reduce((sum, s) => sum + (s.duration || 0), 0)
  const totalFocusHours = totalFocusSeconds / 3600

  const daysWithSessions = new Set(
    focusSessions
      .map(s => getFocusSessionTime(s))
      .filter(Boolean)
      .map(d => d.toDateString())
  )

  const dailyProductivity = weekdayLabels.map(label => {
    const index = weekdayLabels.indexOf(label)
    const daySessions = focusSessions.filter(s => {
      const t = getFocusSessionTime(s)
      return t && t.getDay() === index
    })
    const seconds = daySessions.reduce((sum, s) => sum + (s.duration || 0), 0)
    return {
      day: label,
      hours: seconds / 3600,
      sessions: daySessions.length,
    }
  })

  const now = new Date()
  const weekBuckets = [0, 0, 0, 0] // last 4 weeks
  focusSessions.forEach(s => {
    const d = getFocusSessionTime(s)
    if (!d) return
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
    const weekIndex = Math.floor(diffDays / 7)
    if (weekIndex >= 0 && weekIndex < 4) {
      weekBuckets[3 - weekIndex] += (s.duration || 0) / 3600
    }
  })
  const weeklyComparison = weekBuckets.map((hours, idx) => ({
    week: `Week ${idx + 1}`,
    hours,
  }))

  const subjectMap = {}
  focusSessions.forEach(s => {
    const key = s.subject || 'Other'
    if (!subjectMap[key]) subjectMap[key] = { hours: 0, days: new Set() }
    subjectMap[key].hours += (s.duration || 0) / 3600
    const t = getFocusSessionTime(s)
    if (t) subjectMap[key].days.add(t.toDateString())
  })
  const subjectPerformance = Object.entries(subjectMap).map(([subject, val]) => ({
    subject,
    hours: Number(val.hours.toFixed(1)),
    consistency: Math.min(100, val.days.size * 10),
  }))

  const totalDays = 30
  const activeDays = daysWithSessions.size
  const consistencyScore = totalDays ? Math.round((activeDays / totalDays) * 100) : 0
  const avgSessionDuration =
    focusSessions.length > 0 ? totalFocusSeconds / focusSessions.length / 3600 : 0

  const overdueAssignments = assignments.filter(a => {
    if (!a.dueDate) return false
    return a.status !== 'completed' && a.dueDate < now
  })

  const behavioralPatterns = [
    { metric: 'Consistency', value: consistencyScore, max: 100 },
    {
      metric: 'Focus Duration',
      value: Math.min(100, Math.round((avgSessionDuration / 2) * 100)),
      max: 100,
    },
    {
      metric: 'Early Planning',
      value: Math.min(
        100,
        assignments.length
          ? Math.round(
              (assignments.filter(a => a.status === 'pending').length / assignments.length) *
                100
            )
          : 60
      ),
      max: 100,
    },
    {
      metric: 'Procrastination',
      value: Math.min(
        100,
        assignments.length
          ? Math.round((overdueAssignments.length / assignments.length) * 100)
          : 20
      ),
      max: 100,
    },
    {
      metric: 'Peak Hours',
      value: 80,
      max: 100,
    },
  ]

  const insights = [
    {
      type: 'positive',
      icon: TrendingUp,
      title: 'Consistent Improvement',
      description: 'Your weekly productivity has increased by 36% over the past month',
      color: 'mint',
    },
    {
      type: 'warning',
      icon: Clock,
      title: 'Peak Performance Time',
      description: 'You\'re most productive between 10 AM - 2 PM. Schedule important tasks during this window',
      color: 'cyan',
    },
    {
      type: 'suggestion',
      icon: Target,
      title: 'Subject Balance',
      description: 'Consider allocating more time to Physics to improve consistency',
      color: 'mint',
    },
  ]

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-indigo-dark border border-white/20 rounded-lg p-2 shadow-xl">
          <p className="text-text-primary font-semibold text-sm">{payload[0].value} hours</p>
        </div>
      )
    }
    return null
  }

  const chartStyle = { grid: 'rgba(255,255,255,0.1)', axis: '#9CA3AF', tooltip: { bg: '#141414', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' } }

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <div className="flex items-start justify-between flex-shrink-0">
        <div>
          <h1 className="text-4xl font-bold text-text-primary mb-0.5">Productivity Analytics</h1>
          <p className="text-text-muted text-base">Deep insights into your study patterns and behaviors</p>
        </div>
        {onBackToDashboard && <BackButton onClick={onBackToDashboard} />}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-shrink-0">
        {[
          {
            icon: Clock,
            label: 'Total Focus Time',
            value: `${totalFocusHours.toFixed(1)}h`,
            change: '',
          },
          {
            icon: Target,
            label: 'Consistency Score',
            value: `${consistencyScore}%`,
            change: '',
          },
          {
            icon: Zap,
            label: 'Avg Session',
            value: `${avgSessionDuration.toFixed(1)}h`,
            change: '',
          },
          {
            icon: Calendar,
            label: 'Active Days',
            value: `${activeDays}/${totalDays}`,
            change: '',
          },
        ].map((metric, index) => {
          const Icon = metric.icon
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-dark p-3 border border-white/20 card-hover"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="p-1.5 rounded-lg bg-white/10">
                  <Icon className="w-4 h-4 text-text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-text-primary">{metric.value}</h3>
              <p className="text-xs text-text-muted">{metric.label}</p>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="card-dark p-4 border border-white/20 card-hover">
          <h2 className="text-lg font-bold text-text-primary mb-2">Behavioral Patterns</h2>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={behavioralPatterns}>
                <PolarGrid stroke={chartStyle.grid} />
                <PolarAngleAxis dataKey="metric" stroke={chartStyle.axis} tick={{ fill: chartStyle.axis, fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke={chartStyle.axis} tick={{ fill: chartStyle.axis, fontSize: 8 }} />
                <Radar name="Performance" dataKey="value" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.2} />
                <Tooltip contentStyle={{ backgroundColor: chartStyle.tooltip.bg, border: chartStyle.tooltip.border, borderRadius: '8px', color: chartStyle.tooltip.color }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-dark p-4 border border-white/20 card-hover flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h2 className="text-lg font-bold text-text-primary">Weekly Productivity Trend</h2>
            <span className="text-xs font-semibold text-accent-green flex items-center gap-0.5"><BarChart3 className="w-4 h-4" />+15%</span>
          </div>
          <div className="flex-1 min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="week" stroke={chartStyle.axis} tick={{ fill: chartStyle.axis, fontSize: 10 }} />
                <YAxis stroke={chartStyle.axis} tick={{ fill: chartStyle.axis, fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hours" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-shrink-0">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-dark p-4 border border-white/20 card-hover flex flex-col min-h-0">
          <h2 className="text-lg font-bold text-text-primary mb-2 flex-shrink-0">Daily Breakdown</h2>
          <div className="flex-1 min-h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyProductivity}>
                <defs>
                  <linearGradient id="colorHoursAnalytics" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="day" stroke={chartStyle.axis} tick={{ fill: chartStyle.axis, fontSize: 10 }} />
                <YAxis stroke={chartStyle.axis} tick={{ fill: chartStyle.axis, fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="hours" stroke="#9CA3AF" strokeWidth={2} fillOpacity={1} fill="url(#colorHoursAnalytics)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="card-dark p-4 border border-white/20 card-hover">
          <h2 className="text-lg font-bold text-text-primary mb-2">Subject Performance</h2>
          <div className="space-y-2">
            {subjectPerformance.map((subject, index) => (
              <div key={subject.subject} className="space-y-0.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-text-primary">{subject.subject}</span>
                  <span className="text-text-muted">{subject.hours}h</span>
                </div>
                <div className="w-full bg-white/10 rounded h-1.5 overflow-hidden">
                  <motion.div animate={{ width: `${subject.consistency}%` }} transition={{ delay: index * 0.05 }} className="h-full bg-white/60 rounded-full" />
                </div>
                <div className="flex justify-between text-xs text-text-muted"><span>Consistency</span><span className="text-text-primary">{subject.consistency}%</span></div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="flex-shrink-0">
        <h2 className="text-base font-bold text-text-primary mb-2">Insights & Recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {insights.map((insight, index) => {
            const Icon = insight.icon
            return (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card-dark p-3 border-l-4 border-l-white/40 border border-white/20 card-hover"
              >
                <div className="inline-flex p-2 rounded-lg bg-white/10 mb-2">
                  <Icon className="w-4 h-4 text-text-primary" />
                </div>
                <h3 className="font-bold text-text-primary text-sm mb-0.5">{insight.title}</h3>
                <p className="text-xs text-text-muted">{insight.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Analytics
