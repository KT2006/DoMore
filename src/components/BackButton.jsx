import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const BackButton = ({ onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-dark border border-white/20 text-text-primary font-medium hover:border-white/40 hover:bg-white/5 transition-colors text-sm"
    >
      <ArrowLeft className="w-5 h-5" />
      Back to Dashboard
    </motion.button>
  )
}

export default BackButton
