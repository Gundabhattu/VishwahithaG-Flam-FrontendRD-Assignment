import { create } from 'zustand'
import { io, type Socket } from 'socket.io-client'
import type { CanvasObject, ClientToServerEvents, Point, ServerToClientEvents } from '@/types'

interface SocketState {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null
  isConnected: boolean
  isReconnecting: boolean
  connectionError: string | null
  lastConnectionError: string | null
  connect: (options?: { roomId?: string; userName?: string }) => Socket<ServerToClientEvents, ClientToServerEvents>
  disconnect: () => void
  joinRoom: (roomId: string, userName: string) => void
  emitDraw: (roomId: string, object: CanvasObject) => void
  emitUpsert: (roomId: string, object: CanvasObject) => void
  emitDelete: (roomId: string, objectId: string) => void
  emitCursor: (roomId: string, point: Point) => void
  emitHistory: (roomId: string, action: string, payload?: unknown) => void
}

const getFallbackSocketUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:4000'
  }

  const { hostname } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000'
  }

  return `${window.location.protocol}//${hostname}:4000`
}

const socketUrl = import.meta.env.VITE_SOCKET_URL ?? getFallbackSocketUrl()
const socketAuthToken = import.meta.env.VITE_SOCKET_TOKEN ?? 'demo-token'

let clientSocket = io(socketUrl, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  transports: ['websocket'],
  auth: { token: socketAuthToken },
})

const pendingObjects = new Map<string, CanvasObject>()
let objectFlushTimer: number | null = null

const flushObjects = (roomId: string) => {
  if (!pendingObjects.size) {
    return
  }
  const objects = Array.from(pendingObjects.values())
  pendingObjects.clear()
  clientSocket.emit('object:batch', { roomId, objects })
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: clientSocket,
  isConnected: false,
  isReconnecting: false,
  connectionError: null,
  lastConnectionError: null,
  connect: (options) => {
    if (!get().socket) {
      return clientSocket
    }

    if (!clientSocket.connected) {
      clientSocket.auth = { token: socketAuthToken, roomId: options?.roomId, userName: options?.userName }
        useSocketStore.setState({ connectionError: null, isReconnecting: false })
      clientSocket.connect()
    }

    return clientSocket
  },
  disconnect: () => {
    clientSocket.disconnect()
    set({ isConnected: false, isReconnecting: false, connectionError: null, lastConnectionError: null })
  },
  joinRoom: (roomId, userName) => {
    const socket = get().socket
    if (!socket) {
      return
    }

    socket.emit('room:join', { roomId, userName })
  },
  emitDraw: (roomId, object) => {
    const socket = get().socket
    if (!socket) {
      return
    }

    socket.emit('draw:stroke', { roomId, stroke: object })
  },
  emitUpsert: (roomId, object) => {
    if (!get().socket) {
      return
    }

    pendingObjects.set(object.id, object)
    if (objectFlushTimer !== null) {
      window.clearTimeout(objectFlushTimer)
    }
    objectFlushTimer = window.setTimeout(() => {
      objectFlushTimer = null
      flushObjects(roomId)
    }, 50)
  },
  emitDelete: (roomId, objectId) => {
    const socket = get().socket
    if (!socket) {
      return
    }

    socket.emit('object:delete', { roomId, objectId })
  },
  emitCursor: (roomId, point) => {
    const socket = get().socket
    if (!socket) {
      return
    }

    socket.emit('cursor:move', { roomId, point })
  },
  emitHistory: (roomId, action, payload) => {
    const socket = get().socket
    if (!socket) {
      return
    }

    flushObjects(roomId)
    socket.emit('history:event', { roomId, action, payload })
  },
}))

clientSocket.on('connect', () => setTimeout(() => useSocketStore.setState({ isConnected: true, isReconnecting: false, connectionError: null }), 0))
clientSocket.on('disconnect', () => useSocketStore.setState({ isConnected: false, isReconnecting: true }))
clientSocket.on('connect_error', (error: Error) => {
  const currentState = useSocketStore.getState()
  if (currentState.lastConnectionError === error.message) {
    return
  }

  useSocketStore.setState({ connectionError: error.message, lastConnectionError: error.message, isConnected: false, isReconnecting: true })
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    clientSocket.off('connect')
    clientSocket.off('disconnect')
    clientSocket.off('connect_error')
    clientSocket.disconnect()
    clientSocket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      transports: ['websocket'],
      auth: { token: socketAuthToken },
    })
  })
}
