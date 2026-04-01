import { motion } from 'framer-motion'

const Profile = ({ user }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-indigo-dark border border-white/20 shadow-xl"
    >
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-text-primary font-bold text-sm">
        {user ? user.initials : 'RG'}
      </div>
      <div>
        <p className="font-bold text-text-primary text-sm leading-tight">{user ? user.name : 'Rahul Gandhi'}</p>
        <p className="text-xs text-text-muted leading-tight">{user ? user.department : 'nwc'}</p>
      </div>
    </motion.div>
  )
}

export default Profile
