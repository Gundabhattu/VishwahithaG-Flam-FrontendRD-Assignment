import { motion } from 'framer-motion'
import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

export const NotFoundPage = () => {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[32px] border border-white/10 bg-slate-900/70 p-8 text-center shadow-2xl shadow-slate-950/50 backdrop-blur-xl"
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
          <Compass size={24} />
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-violet-300">404</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">The page you seek isn’t here.</h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-300">
          The room or route you requested could not be found. Return to the canvas hub and start a fresh session.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 font-medium text-white transition hover:bg-violet-400"
        >
          <ArrowLeft size={18} />
          Back home
        </Link>
      </motion.div>
    </div>
  )
}

export default NotFoundPage
