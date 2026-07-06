import { motion } from 'framer-motion'
import { ArrowRight, PenTool, Sparkles, Users } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useRoomStore } from '@/store/roomStore'
import { createRoomId } from '@/utils/room'

export const LandingPage = () => {
  const [name, setName] = useState('')
  const [roomId, setRoomId] = useState('')
  const navigate = useNavigate()
  const setUserName = useRoomStore((state) => state.setUserName)
  const storeRoomId = useRoomStore((state) => state.setRoomId)

  const handleJoin = (event: React.FormEvent) => {
    event.preventDefault()
    const nextName = name.trim()
    const nextRoomId = roomId.trim()

    if (!nextName || !nextRoomId) {
      toast.error('Please enter your name and a room ID to continue.')
      return
    }

    setUserName(nextName)
    storeRoomId(nextRoomId)
    window.localStorage.setItem('flam-canvas:last-session', JSON.stringify({ userName: nextName, roomId: nextRoomId }))
    navigate(`/canvas/${nextRoomId}`)
  }

  const handleCreate = () => {
    const nextName = name.trim()
    if (!nextName) {
      toast.error('Please enter your name before creating a room.')
      return
    }

    const generatedRoomId = createRoomId()
    setUserName(nextName)
    storeRoomId(generatedRoomId)
    window.localStorage.setItem('flam-canvas:last-session', JSON.stringify({ userName: nextName, roomId: generatedRoomId }))
    navigate(`/canvas/${generatedRoomId}`)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-8 rounded-[36px] border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/60 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr] lg:p-10"
      >
        <div className="flex flex-col justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
              <PenTool size={22} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-violet-300">Flam Canvas</p>
              <h1 className="text-2xl font-semibold text-white">Collaborate in real time</h1>
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
              <Sparkles size={16} />
              <span>Designed for fast creative sessions</span>
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Sketch together, wherever your team is.
            </h2>
            <p className="max-w-xl text-lg leading-8 text-slate-300">
              Launch a room instantly, invite collaborators, and draw live with a polished,
              low-latency whiteboard experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
              <Users size={16} className="text-cyan-400" />
              <span>Multi-user sessions</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
              <Sparkles size={16} className="text-violet-400" />
              <span>Instant room creation</span>
            </div>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={handleJoin}
          className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-slate-950/50"
        >
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-violet-300">
              Start a room
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Join the canvas</h3>
          </div>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            <span>Your name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none ring-0 transition focus:border-violet-400"
              placeholder="Alex Chen"
              autoComplete="name"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-300">
            <span>Room ID</span>
            <input
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              placeholder="ROOM-ABC123"
              autoComplete="off"
            />
          </label>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 font-medium text-white transition hover:bg-violet-400"
          >
            Join Room
            <ArrowRight size={18} />
          </button>

          <button
            type="button"
            onClick={handleCreate}
            className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-3 font-medium text-cyan-200 transition hover:bg-cyan-400/20"
          >
            Create Room
          </button>
        </motion.form>
      </motion.div>
    </div>
  )
}

export default LandingPage
