import { io, type Socket } from 'socket.io-client'
import type { ClientToServerEvents, ServerToClientEvents } from '@/types'

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

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(socketUrl, {
  autoConnect: false,
  transports: ['websocket'],
})

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect()
  }
  return socket
}

export const disconnectSocket = () => {
  socket.disconnect()
}

export default socket
