import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, AlertCircle, CheckCircle2, Clock, BookOpen, Filter, Trash2, Zap, Target } from 'lucide-react'
import { format, differenceInDays, isPast, isToday } from 'date-fns'
import BackButton from './BackButton'
import { getAssignments, addAssignment, updateAssignment, deleteAssignment } from '../services/assignmentService'

const Assignments = ({ onBackToDashboard }) => {
  const [assignments, setAssignments] = useState([])
  const reg_no = localStorage.getItem('reg_no') || 'demo_student'

  // Load from Firestore
  useEffect(() => {
    getAssignments(reg_no).then(setAssignments).catch(e => console.error('Failed to load assignments', e))
  }, [reg_no])

  const [filter, setFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    subject: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    estimatedHours: 2,
  })

  const getDaysUntilDue = (dueDate) => {
    const days = differenceInDays(dueDate, new Date())
    if (isPast(dueDate) && !isToday(dueDate)) return -Math.abs(days)
    return days
  }

  const getStatusColor = (status, daysUntilDue) => {
    if (status === 'completed') return { bg: 'bg-accent-green/10', border: 'border-accent-green/30', text: 'text-accent-green', icon: CheckCircle2 }
    if (status === 'in-progress') return { bg: 'bg-accent-orange/10', border: 'border-accent-orange/30', text: 'text-accent-orange', icon: Clock }
    if (daysUntilDue < 0) return { bg: 'bg-accent-red/10', border: 'border-accent-red/30', text: 'text-accent-red', icon: AlertCircle }
    return { bg: 'bg-white/5', border: 'border-white/10', text: 'text-text-muted', icon: BookOpen }
  }

  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === 'all') return true
    if (filter === 'overdue') return getDaysUntilDue(assignment.dueDate) < 0
    if (filter === 'urgent') return getDaysUntilDue(assignment.dueDate) <= 2 && getDaysUntilDue(assignment.dueDate) >= 0
    return assignment.status === filter
  })

  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const daysA = getDaysUntilDue(a.dueDate)
    const daysB = getDaysUntilDue(b.dueDate)
    if (daysA < 0 && daysB >= 0) return -1
    if (daysA >= 0 && daysB < 0) return 1
    return daysA - daysB
  })

  const handleAddAssignment = async (e) => {
    e.preventDefault()
    if (!newAssignment.title.trim() || !newAssignment.dueDate) return

    const due = new Date(newAssignment.dueDate)
    const assignmentData = {
      title: newAssignment.title.trim(),
      subject: newAssignment.subject.trim() || 'General',
      description: newAssignment.description.trim() || 'No description provided',
      dueDate: due.toISOString(),
      priority: newAssignment.priority,
      status: 'pending',
      estimatedHours: Number(newAssignment.estimatedHours) || 2,
      progress: 0,
    }

    try {
      await addAssignment(reg_no, assignmentData)
      const updated = await getAssignments(reg_no)
      setAssignments(updated)
      
      setNewAssignment({
        title: '',
        subject: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        estimatedHours: 2,
      })
      setShowAddModal(false)
    } catch (e) {
      console.error('Failed to add assignment', e)
    }
  }

  const handleDeleteAssignment = async (id) => {
    try {
      await deleteAssignment(reg_no, id)
      setAssignments(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      console.error('Failed to delete assignment', e)
    }
  }

  const handleProgressChange = async (id, value) => {
    const progress = Math.min(100, Math.max(0, Number(value) || 0))
    const assignment = assignments.find(a => a.id === id)
    if (!assignment) return
    
    let newStatus = assignment.status
    if (progress >= 100) newStatus = 'completed'
    else if (assignment.status === 'completed') newStatus = 'in-progress'
    else if (assignment.status === 'pending' && progress > 0) newStatus = 'in-progress'

    // Optimistic UI update
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, progress, status: newStatus } : a))

    try {
      await updateAssignment(reg_no, id, { progress, status: newStatus })
    } catch (e) {
      console.error('Failed to update progress', e)
      // On failure, we'd ideally revert to prev
    }
  }

  // Avoid persisting via localStorage since we use Firestore
  // We can just omit the previous localStorage side-effect.

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <div className="flex flex-row items-start justify-between flex-shrink-0 mb-2 sm:mb-0">
        <div className="flex-1 pr-1 sm:pr-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-0.5 leading-tight">Assignment Manager</h1>
          <p className="text-text-muted text-xs sm:text-base mb-2 sm:mb-0">Track deadlines and manage your workload</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 flex-shrink-0">
          {onBackToDashboard && (
            <div className="transform scale-75 sm:scale-100 origin-right translate-x-0 mt-0 sm:mt-0">
              <BackButton onClick={onBackToDashboard} />
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-white/20 text-text-primary rounded-lg font-semibold text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 border border-white/20 whitespace-nowrap mt-3 sm:mt-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Add Assignment
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-shrink-0">
        {[
          { label: 'Total', value: assignments.length, color: 'text-text-primary', border: 'border-white/20' },
          { label: 'Pending', value: assignments.filter(a => a.status === 'pending').length, color: 'text-text-muted', border: 'border-white/20' },
          { label: 'In Progress', value: assignments.filter(a => a.status === 'in-progress').length, color: 'text-accent-orange', border: 'border-accent-orange/30' },
          { label: 'Overdue', value: assignments.filter(a => getDaysUntilDue(a.dueDate) < 0).length, color: 'text-accent-red', border: 'border-accent-red/30' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`card-dark p-3 border ${stat.border} card-hover`}
          >
            <p className="text-xs text-text-muted mb-0.5">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="card-dark p-2 border border-white/20 flex-shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-3 sm:pb-2">
          <Filter className="w-4 h-4 text-text-muted flex-shrink-0" />
          {['all', 'pending', 'in-progress', 'completed', 'urgent', 'overdue'].map((filterOption) => (
            <motion.button
              key={filterOption}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilter(filterOption)}
              className={`px-3 py-1.5 rounded-lg font-medium text-sm capitalize whitespace-nowrap transition-all flex-shrink-0 ${
                filter === filterOption ? 'bg-white/20 text-text-primary border border-white/30' : 'bg-white/5 text-text-muted border border-white/10 hover:border-white/20'
              }`}
            >
              {filterOption.replace('-', ' ')}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="space-y-2 flex-1 min-h-[150px] overflow-y-auto custom-scrollbar pr-1">
        <AnimatePresence>
          {sortedAssignments.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-dark p-8 text-center border border-white/20">
              <BookOpen className="w-12 h-12 mx-auto mb-2 text-text-muted opacity-50" />
              <p className="text-sm text-text-muted">No assignments found</p>
            </motion.div>
          ) : (
            sortedAssignments.slice(0, 4).map((assignment, index) => {
              const daysUntilDue = getDaysUntilDue(assignment.dueDate)
              const statusColors = getStatusColor(assignment.status, daysUntilDue)
              const StatusIcon = statusColors.icon
              const isOverdue = daysUntilDue < 0
              const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0

              return (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                  className={`card-dark p-3 border ${statusColors.border} ${assignment.status === 'completed' ? 'opacity-80' : ''} card-hover`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-text-primary truncate">{assignment.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-0.5 ${statusColors.bg} ${statusColors.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {assignment.status === 'completed' ? 'Done' : assignment.status === 'in-progress' ? 'In Progress' : isOverdue ? 'Overdue' : isUrgent ? 'Urgent' : 'Pending'}
                        </span>
                        {assignment.priority === 'high' && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-accent-orange/20 text-accent-orange">High</span>
                        )}
                      </div>
                      <p className="text-text-muted text-xs mt-0.5 truncate">{assignment.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                        <span>Due: {format(assignment.dueDate, 'MMM dd')}</span>
                        <span className={isOverdue ? 'text-accent-red' : isUrgent ? 'text-accent-orange' : ''}>
                          ({Math.abs(daysUntilDue)}d {isOverdue ? 'ago' : 'left'})
                        </span>
                        {assignment.status === 'in-progress' && (
                          <span className="text-accent-orange font-semibold">{assignment.progress}%</span>
                        )}
                      </div>
                      {(assignment.status === 'in-progress' || assignment.status === 'pending') && (
                        <div className="mt-2 flex items-center gap-2 text-[11px] text-text-muted">
                          <span className="whitespace-nowrap">Progress:</span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={assignment.progress}
                            onChange={(e) => handleProgressChange(assignment.id, e.target.value)}
                            className="flex-1 accent-accent-orange"
                          />
                          <span className="w-10 text-right text-text-primary font-semibold">
                            {assignment.progress}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        {assignment.status === 'pending' && (
                          <button
                            onClick={async () => {
                              setAssignments(assignments.map(a => a.id === assignment.id ? { ...a, status: 'in-progress' } : a))
                              await updateAssignment(reg_no, assignment.id, { status: 'in-progress' })
                            }}
                            className="px-2 py-1 bg-white/20 text-text-primary rounded text-xs font-semibold border border-white/20"
                          >
                            Start
                          </button>
                        )}
                        {assignment.status === 'in-progress' && (
                          <button
                            onClick={async () => {
                              setAssignments(assignments.map(a => a.id === assignment.id ? { ...a, status: 'completed', progress: 100 } : a))
                              await updateAssignment(reg_no, assignment.id, { status: 'completed', progress: 100 })
                            }}
                            className="px-2 py-1 bg-accent-green/20 text-accent-green rounded text-xs font-semibold border border-accent-green/30 flex items-center gap-0.5"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </button>
                        )}
                        {assignment.status === 'completed' && (
                          <div className="px-2 py-1 bg-accent-green/10 text-accent-green rounded text-xs font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </div>
                        )}
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="p-1.5 rounded border border-red-500/40 bg-red-500/10 text-accent-red hover:bg-red-500/20 transition-colors"
                          title="Delete assignment"
                          type="button"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>

      {/* Real-time Insights */}
      <div className="flex-shrink-0 card-dark p-3 border border-white/20 mt-1 mb-1">
        <h2 className="text-[11px] sm:text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Insights & Recommendations</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          {filteredAssignments.filter(a => getDaysUntilDue(a.dueDate) < 0 && a.status !== 'completed').length > 0 ? (
            <div className="flex-1 flex gap-2 items-start bg-accent-red/10 border border-accent-red/20 p-2 rounded-lg">
              <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-accent-red">Action Required</h3>
                <p className="text-[10px] text-text-muted mt-0.5">You have {filteredAssignments.filter(a => getDaysUntilDue(a.dueDate) < 0 && a.status !== 'completed').length} overdue assignments. Tackle them first!</p>
              </div>
            </div>
          ) : filteredAssignments.filter(a => a.status === 'pending').length > 0 ? (
            <div className="flex-1 flex gap-2 items-start bg-accent-orange/10 border border-accent-orange/20 p-2 rounded-lg">
              <Clock className="w-4 h-4 text-accent-orange flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-accent-orange">Prioritize Pending</h3>
                <p className="text-[10px] text-text-muted mt-0.5">You have {filteredAssignments.filter(a => a.status === 'pending').length} assignments pending. Start working on them early to avoid stress.</p>
              </div>
            </div>
          ) : filteredAssignments.length > 0 && filteredAssignments.every(a => a.status === 'completed') ? (
            <div className="flex-1 flex gap-2 items-start bg-accent-green/10 border border-accent-green/20 p-2 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-accent-green flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-accent-green">All Cleared!</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Amazing job, everything here is completed. You're fully caught up.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex gap-2 items-start bg-white/5 border border-white/10 p-2 rounded-lg">
              <BookOpen className="w-4 h-4 text-text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-text-primary">Plan Ahead</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Use the 'Add Assignment' button to track upcoming course workloads.</p>
              </div>
            </div>
          )}
          
          {filteredAssignments.some(a => a.status === 'in-progress') ? (
            <div className="flex-1 flex gap-2 items-start bg-accent-blue/10 border border-accent-blue/20 p-2 rounded-lg">
              <Target className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-accent-blue">Stay Focused</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Finish the {filteredAssignments.filter(a => a.status === 'in-progress').length} task(s) currently in progress before starting new ones.</p>
              </div>
            </div>
          ) : filteredAssignments.length > 0 && filteredAssignments.every(a => a.status !== 'in-progress' && a.status !== 'completed') ? (
            <div className="flex-1 flex gap-2 items-start bg-white/5 border border-white/10 p-2 rounded-lg">
              <Zap className="w-4 h-4 text-text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-text-primary">Ready to Go</h3>
                <p className="text-[10px] text-text-muted mt-0.5">Select a pending task and mark it 'In Progress' to begin working.</p>
              </div>
            </div>
          ) : (
             <div className="flex-1 flex gap-2 items-start bg-white/5 border border-white/10 p-2 rounded-lg hidden sm:flex">
              <Zap className="w-4 h-4 text-text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-text-primary">Keep it up!</h3>
                <p className="text-[10px] text-text-muted mt-0.5">You're making great progress. Stay consistent.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md card-dark border border-white/20 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-text-primary">Add Assignment</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-text-muted text-sm px-2 py-1 rounded hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <form className="space-y-3" onSubmit={handleAddAssignment}>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">Title *</label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-midnight border border-white/15 text-sm text-text-primary outline-none focus:border-white/40"
                    placeholder="Assignment title"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Subject</label>
                    <input
                      type="text"
                      value={newAssignment.subject}
                      onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-midnight border border-white/15 text-sm text-text-primary outline-none focus:border-white/40"
                      placeholder="e.g. Data Science"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1">Priority</label>
                    <select
                      value={newAssignment.priority}
                      onChange={(e) => setNewAssignment({ ...newAssignment, priority: e.target.value })}
                      className="w-full px-3 py-2 rounded bg-midnight border border-white/15 text-sm text-text-primary outline-none focus:border-white/40"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">Due Date *</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-text-muted" />
                    <input
                      type="date"
                      value={newAssignment.dueDate}
                      onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                      className="flex-1 px-3 py-2 rounded bg-midnight border border-white/15 text-sm text-text-primary outline-none focus:border-white/40"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newAssignment.estimatedHours}
                    onChange={(e) => setNewAssignment({ ...newAssignment, estimatedHours: e.target.value })}
                    className="w-32 px-3 py-2 rounded bg-midnight border border-white/15 text-sm text-text-primary outline-none focus:border-white/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-midnight border border-white/15 text-sm text-text-primary outline-none focus:border-white/40 resize-none"
                    placeholder="What do you need to do?"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted bg-white/5 border border-white/15 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-text-primary text-midnight hover:bg-white"
                  >
                    Add
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Assignments
