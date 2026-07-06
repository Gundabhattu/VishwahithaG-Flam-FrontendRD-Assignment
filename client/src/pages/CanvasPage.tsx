import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertCircle, Loader2, Users } from 'lucide-react'
import { CanvasBoard } from '@/components/CanvasBoard'
import { useCanvasStore } from '@/store/canvasStore'
import { useRoomStore } from '@/store/roomStore'
import { useSelectionStore } from '@/store/selectionStore'
import { useSocketStore } from '@/store/socketStore'
import { createRoomId } from '@/utils/room'
import type { CanvasObject, Participant } from '@/types'

export const CanvasPage = () => {
  const [isBootstrapped, setIsBootstrapped] = useState(false)
  const [isSessionHydrated, setIsSessionHydrated] = useState(false)
  const { roomId: routeRoomId } = useParams()
  const navigate = useNavigate()

  const roomId = useRoomStore((state) => state.roomId)
  const userName = useRoomStore((state) => state.userName)
  const participants = useRoomStore((state) => state.participants)
  const isConnected = useRoomStore((state) => state.isConnected)
  const isReconnecting = useRoomStore((state) => state.isReconnecting)
  const connectionError = useSocketStore((state) => state.connectionError)
  const setRoomId = useRoomStore((state) => state.setRoomId)
  const setConnected = useRoomStore((state) => state.setConnected)
  const setParticipants = useRoomStore((state) => state.setParticipants)
  const syncRoomState = useRoomStore((state) => state.syncRoomState)
  const resetRoom = useRoomStore((state) => state.resetRoom)
  const replaceObjects = useCanvasStore((state) => state.replaceObjects)
  const clearObjects = useCanvasStore((state) => state.clearObjects)
  const clearSelection = useSelectionStore((state) => state.clearSelection)
  const connectSocket = useSocketStore((state) => state.connect)
  const disconnectSocket = useSocketStore((state) => state.disconnect)
  const joinRoom = useSocketStore((state) => state.joinRoom)

  useEffect(() => {
    if (userName) {
      setIsSessionHydrated(true)
      return
    }

    const savedSession = window.localStorage.getItem('flam-canvas:last-session')
    if (!savedSession) {
      setIsSessionHydrated(true)
      return
    }

    try {
      const parsed = JSON.parse(savedSession) as { userName?: string; roomId?: string }
      if (parsed.userName) {
        useRoomStore.getState().setUserName(parsed.userName)
      }
      if (parsed.roomId && !roomId) {
        useRoomStore.getState().setRoomId(parsed.roomId)
      }
      setIsSessionHydrated(true)
    } catch {
      window.localStorage.removeItem('flam-canvas:last-session')
      setIsSessionHydrated(true)
    }
  }, [roomId, userName])

  useEffect(() => {
    if (!isSessionHydrated) {
      return
    }

    if (!userName) {
      const savedSession = window.localStorage.getItem('flam-canvas:last-session')
      if (!savedSession) {
        if (!routeRoomId) {
          toast.error('Please enter your name on the landing page first.')
          navigate('/')
        }
      }
      return
    }

    const resolvedRoomId = routeRoomId || roomId || createRoomId()
    console.log('[room] resolved room', { routeRoomId, roomId, resolvedRoomId, userName })
    setRoomId(resolvedRoomId)

    let joined = false
    const socket = connectSocket({ roomId: resolvedRoomId, userName })

    const joinTimeout = window.setTimeout(() => {
      if (!joined) {
        setIsBootstrapped(true)
      }
    }, 8000)

    const handleJoined = (payload: { roomId: string; userName: string; participants: Participant[]; objects: CanvasObject[] }) => {
      joined = true
      window.clearTimeout(joinTimeout)
      console.log('[room] joined', { roomId: payload.roomId, userName: payload.userName, participants: payload.participants.length })
      syncRoomState({ roomId: payload.roomId, userName: payload.userName, participants: payload.participants, connected: true })
      replaceObjects(payload.objects)
      setConnected(true)
      setIsBootstrapped(true)
      toast.success(`Connected to ${payload.roomId}`)
    }

    const handleUpdated = (nextParticipants: Participant[]) => {
      console.log('[room] participants updated', { roomId: resolvedRoomId, participants: nextParticipants.length, sockets: nextParticipants.map((participant) => participant.id) })
      setParticipants(nextParticipants)
    }

    const handleError = (message: string) => {
      window.clearTimeout(joinTimeout)
      toast.error(message)
      setIsBootstrapped(true)
    }

    const handleDrawingUpdate = (object: CanvasObject) => {
      useCanvasStore.getState().upsertObject(object)
    }

    const retryJoin = window.setTimeout(() => {
      if (!joined) {
        joinRoom(resolvedRoomId, userName)
      }
    }, 1000)

    const handleStroke = (stroke: CanvasObject) => useCanvasStore.getState().upsertObject(stroke)
    const handleUpsert = (object: CanvasObject) => useCanvasStore.getState().upsertObject(object)
    const handleBatch = (payload: { objects: CanvasObject[] }) => {
      payload.objects.forEach((object) => useCanvasStore.getState().upsertObject(object))
    }

    const handleDelete = (payload: { roomId: string; objectId: string }) => {
      useCanvasStore.getState().deleteObject(payload.objectId)
    }
    const handleCursor = (payload: { participantId: string; point: { x: number; y: number } }) => {
      setParticipants(useRoomStore.getState().participants.map((participant) => (participant.id === payload.participantId ? { ...participant, cursor: payload.point } : participant)))
    }
    const handleRoomState = (payload: { participants: Participant[]; objects: CanvasObject[] }) => {
      setParticipants(payload.participants)
      replaceObjects(payload.objects)
    }
    const handleHistory = (payload: { payload?: unknown }) => {
      const objects = payload.payload && typeof payload.payload === 'object' && Array.isArray((payload.payload as { objects?: unknown }).objects) ? (payload.payload as { objects: CanvasObject[] }).objects : null
      if (objects) {
        replaceObjects(objects)
      }
    }

    socket.on('room:joined', handleJoined)
    socket.on('room:updated', handleUpdated)
    socket.on('room:error', handleError)
    socket.on('drawing:update', handleDrawingUpdate)
    socket.on('draw:stroke', handleStroke)
    socket.on('object:upserted', handleUpsert)
    socket.on('object:batch', handleBatch)
    socket.on('object:deleted', handleDelete)
    socket.on('cursor:move', handleCursor)
    socket.on('room:state', handleRoomState)
    socket.on('history:event', handleHistory)
    setIsBootstrapped(false)
    joinRoom(resolvedRoomId, userName)

    return () => {
      window.clearTimeout(joinTimeout)
      window.clearTimeout(retryJoin)
      socket.off('room:joined', handleJoined)
      socket.off('room:updated', handleUpdated)
      socket.off('room:error', handleError)
      socket.off('drawing:update', handleDrawingUpdate)
      socket.off('draw:stroke', handleStroke)
      socket.off('object:upserted', handleUpsert)
      socket.off('object:batch', handleBatch)
      socket.off('object:deleted', handleDelete)
      socket.off('cursor:move', handleCursor)
      socket.off('room:state', handleRoomState)
      socket.off('history:event', handleHistory)
      disconnectSocket()
      clearObjects()
      clearSelection()
      resetRoom()
    }
  }, [clearObjects, clearSelection, connectSocket, disconnectSocket, isSessionHydrated, joinRoom, navigate, replaceObjects, resetRoom, roomId, routeRoomId, setConnected, setParticipants, setRoomId, syncRoomState, userName])

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel flex flex-wrap items-center justify-between gap-4 p-5"
      >
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-violet-300">Live room</p>
          <h1 className="text-2xl font-semibold text-white">{(routeRoomId ?? roomId) || 'Preparing room'}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm ${isConnected ? 'bg-emerald-500/15 text-emerald-300' : connectionError || isReconnecting ? 'bg-rose-500/15 text-rose-300' : 'bg-amber-500/15 text-amber-300'}`}>
            {!isConnected && !connectionError ? <Loader2 size={14} className="animate-spin" /> : null}
            {isConnected ? 'Connected' : connectionError || isReconnecting ? 'Reconnecting' : 'Connecting'}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
            <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {participants.length} online
          </div>
          <div className="rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
            {userName}
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {connectionError ? (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="glass-panel flex items-center gap-3 p-4 text-sm text-rose-200">
            <AlertCircle size={18} />
            Connection interrupted. Changes stay synced when the socket reconnects.
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.35fr]">
        {isBootstrapped ? (
          <CanvasBoard roomId={(routeRoomId ?? roomId) || ''} />
        ) : (
          <div className="glass-panel flex min-h-[60vh] items-center justify-center p-8 text-sm text-slate-300 xl:min-h-[72vh]">
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 animate-spin text-cyan-300" />
              Joining room and loading the canvas...
            </div>
          </div>
        )}

        <motion.aside
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel p-5"
        >
          <div className="mb-4">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Participants</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Collaborators</h2>
            <p className="mt-1 text-sm text-slate-400">Everyone in the same room appears here in real time.</p>
          </div>
          <div className="space-y-3">
            {participants.length ? participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3 text-sm text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-slate-950" style={{ backgroundColor: participant.color ?? '#38bdf8' }}>
                    {participant.userName.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <span className="block">
                      {participant.userName}
                      {participant.userName === userName ? <span className="ml-2 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-cyan-300">You</span> : null}
                    </span>
                    <span className="text-xs text-slate-400">{participant.isTyping ? 'Typing...' : participant.connected ? 'Active' : 'Away'}</span>
                  </span>
                </span>
                <span className={`rounded-full px-2 py-1 text-xs ${participant.connected ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700/70 text-slate-400'}`}>
                  {participant.connected ? 'Live' : 'Away'}
                </span>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-5 text-center text-sm text-slate-300">
                <Users className="mx-auto mb-2 text-cyan-300" size={20} />
                Waiting for collaborators.
              </div>
            )}
          </div>
        </motion.aside>
      </div>
    </div>
  )
}

export default CanvasPage
