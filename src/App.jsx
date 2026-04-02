import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Dashboard from './components/Dashboard'
import FocusTracker from './components/FocusTracker'
import Timetable from './components/Timetable'
import Assignments from './components/Assignments'
import Analytics from './components/Analytics'
import UserPage from './components/UserPage'
import Sidebar from './components/Sidebar'
import Login from './components/Login'
import { Activity, Target, Calendar, BookOpen, BarChart3, User, Menu, X, Loader2 } from 'lucide-react'
import { loadCachedProfile, scrapeAndCache, clearSession } from './services/scraperService'

function profileToGlobalUser(data) {
  return {
    name: data.name,
    initials: data.name
      ? data.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
      : 'ST',
    registrationNo: data.regNumber || data.registration_number || '',
    department: data.department || '—',
    section: data.section || '—',
    branch: data.program || '—',
    phone: data.mobile || '—',
    email: data.srmId || data.email || '—',
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [globalUser, setGlobalUser] = useState(null)
  const [bootState, setBootState] = useState('loading') // 'loading' | 'login' | 'scraping' | 'ready'
  const [loginError, setLoginError] = useState(null)

  // CAPTCHA state
  const [captchaImage, setCaptchaImage] = useState(null)
  const [captchaSessionId, setCaptchaSessionId] = useState(null)
  const [pendingCreds, setPendingCreds] = useState(null)

  // ── Bootstrap: try Firestore cache first ──────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const cached = await loadCachedProfile()
        if (cancelled) return
        if (cached) {
          setGlobalUser(profileToGlobalUser(cached))
          setBootState('ready')
          return
        }
      } catch (err) {
        console.warn('[App] Cache load failed:', err)
      }
      // No cached data — show login
      if (!cancelled) setBootState('login')
    })()
    return () => { cancelled = true }
  }, [])

  // ── Login handler ─────────────────────────────────────────────────────
  const handleLogin = async ({ netId, password, captchaText }) => {
    setLoginError(null)
    setBootState('scraping')

    try {
      const result = await scrapeAndCache(
        captchaText ? pendingCreds?.email || netId : netId,
        captchaText ? pendingCreds?.password || password : password,
        captchaText || '',
        captchaText ? captchaSessionId || '' : '',
      )

      if (result.captchaRequired) {
        // Show CAPTCHA to user
        setCaptchaImage(result.captchaImage)
        setCaptchaSessionId(result.sessionId)
        setPendingCreds({ email: netId, password })
        setBootState('login')
        return
      }

      // Success — clear CAPTCHA state
      setCaptchaImage(null)
      setCaptchaSessionId(null)
      setPendingCreds(null)
      setGlobalUser(profileToGlobalUser(result.profile))
      setBootState('ready')
    } catch (err) {
      console.error('[App] Login/scrape failed:', err)
      setCaptchaImage(null)
      setCaptchaSessionId(null)
      setPendingCreds(null)
      setLoginError(err.message || 'Login failed. Please check your credentials and try again.')
      setBootState('login')
    }
  }

  // ── Logout handler ────────────────────────────────────────────────────
  const handleLogout = () => {
    clearSession()
    setGlobalUser(null)
    setBootState('login')
    setCaptchaImage(null)
    setCaptchaSessionId(null)
    setPendingCreds(null)
    setLoginError(null)
  }

  // ── Loading state ─────────────────────────────────────────────────────
  if (bootState === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-midnight text-text-primary p-6">
        <Loader2 className="w-10 h-10 animate-spin text-accent-blue" />
        <p className="text-text-muted text-sm text-center max-w-md">
          Loading your profile…
        </p>
      </div>
    )
  }

  // ── Scraping state ────────────────────────────────────────────────────
  if (bootState === 'scraping') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-midnight text-text-primary p-6">
        <Loader2 className="w-10 h-10 animate-spin text-accent-blue" />
        <p className="text-text-muted text-sm text-center max-w-md">
          Authenticating with SRM Academia and fetching your data…
        </p>
        <p className="text-text-muted text-xs text-center max-w-md opacity-60">
          This may take 15–30 seconds on first login.
        </p>
      </div>
    )
  }

  // ── Login / CAPTCHA state ─────────────────────────────────────────────
  if (bootState === 'login') {
    return (
      <Login
        onLoginSubmit={handleLogin}
        error={loginError}
        captchaImage={captchaImage}
        captchaSessionId={captchaSessionId}
      />
    )
  }

  // ── Dashboard (ready) ─────────────────────────────────────────────────
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'focus', label: 'Focus Tracker', icon: Target },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'assignments', label: 'Assignments', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'user', label: 'Profile', icon: User },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-midnight">
      <div className="w-[1440px] h-[1024px] max-w-[100vw] max-h-[100vh] flex overflow-hidden bg-midnight shadow-2xl">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} globalUser={globalUser} />

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-indigo-dark border border-white/20 rounded-xl shadow-lg text-text-primary"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/70 z-40"
              />
              <motion.div
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                className="lg:hidden fixed left-0 top-0 h-full w-64 bg-indigo-dark border-r border-white/20 z-50"
              >
                <Sidebar
                  activeTab={activeTab}
                  setActiveTab={(tab) => {
                    setActiveTab(tab)
                    setMobileMenuOpen(false)
                  }}
                  tabs={tabs}
                  globalUser={globalUser}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 lg:ml-64 p-4 lg:p-5 overflow-hidden min-w-0 flex flex-col min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex-1 min-h-0 overflow-hidden"
            >
              {activeTab === 'dashboard' && <Dashboard globalUser={globalUser} onNavigate={setActiveTab} />}
              {activeTab === 'focus' && <FocusTracker onBackToDashboard={() => setActiveTab('dashboard')} />}
              {activeTab === 'timetable' && <Timetable onNavigate={(tab) => setActiveTab(tab)} />}
              {activeTab === 'assignments' && <Assignments onBackToDashboard={() => setActiveTab('dashboard')} />}
              {activeTab === 'analytics' && <Analytics onBackToDashboard={() => setActiveTab('dashboard')} />}
              {activeTab === 'user' && <UserPage globalUser={globalUser} onBackToDashboard={() => setActiveTab('dashboard')} onLogout={handleLogout} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

export default App
