import { motion } from 'framer-motion'
import { Zap, LogOut } from 'lucide-react'

const Sidebar = ({ activeTab, setActiveTab, tabs, isMobile }) => {
  const handleLogout = () => {
    // Add your logout logic here (e.g. clear session, redirect)
    window.location.reload()
  }

  return (
    <motion.aside
      initial={isMobile ? false : { x: -100 }}
      animate={isMobile ? false : { x: 0 }}
      className={
        isMobile
          ? 'h-full w-full bg-indigo-dark flex flex-col relative'
          : 'fixed left-0 top-0 h-full w-64 bg-indigo-dark border-r border-white/20 z-50 hidden lg:block'
      }
    >
      <div className="p-5 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10 border border-white/20">
            <Zap className="w-5 h-5 text-text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Do More</h1>
            <p className="text-xs text-text-muted">Productivity Studio</p>
          </div>
        </div>
      </div>

      <nav className="p-3 space-y-1 mt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.99 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                isActive
                  ? 'bg-white/10 text-text-primary border border-white/20'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5 border border-transparent hover:border-white/10'
              }`}
            >
              {isActive && (
                <motion.div layoutId="activeTab" className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full" initial={false} />
              )}
              <Icon className="w-5 h-5 relative z-10" />
              <span className="font-medium relative z-10 text-sm">{tab.label}</span>
            </motion.button>
          )
        })}
      </nav>

      <div className="absolute bottom-4 left-3 right-3">
        <motion.button
          onClick={handleLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/10 text-text-primary font-medium text-sm border border-white/20 hover:bg-white/15 hover:border-white/30 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log out
        </motion.button>
      </div>
    </motion.aside>
  )
}

export default Sidebar
