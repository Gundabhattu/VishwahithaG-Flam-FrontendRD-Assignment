import { create } from 'zustand'
import type { Participant } from '@/types'

interface RoomState {
  userName: string
  roomId: string
  participants: Participant[]
  isConnected: boolean
  isReconnecting: boolean
  isTyping: boolean
  lastSyncedAt: string | null
  setUserName: (userName: string) => void
  setRoomId: (roomId: string) => void
  setParticipants: (participants: Participant[]) => void
  setConnected: (connected: boolean) => void
  setReconnecting: (reconnecting: boolean) => void
  setTyping: (isTyping: boolean) => void
  setLastSyncedAt: (timestamp: string | null) => void
  resetRoom: () => void
  syncRoomState: (payload: { roomId: string; userName: string; participants: Participant[]; connected?: boolean }) => void
}

export const useRoomStore = create<RoomState>((set) => ({
  userName: '',
  roomId: '',
  participants: [],
  isConnected: false,
  isReconnecting: false,
  isTyping: false,
  lastSyncedAt: null,
  setUserName: (userName) => set({ userName }),
  setRoomId: (roomId) => set({ roomId }),
  setParticipants: (participants) => set({ participants }),
  setConnected: (isConnected) => set({ isConnected }),
  setReconnecting: (isReconnecting) => set({ isReconnecting }),
  setTyping: (isTyping) => set({ isTyping }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  resetRoom: () => set({ roomId: '', userName: '', participants: [], isConnected: false, isReconnecting: false, isTyping: false, lastSyncedAt: null }),
  syncRoomState: ({ roomId, userName, participants, connected = true }) => set({ roomId, userName, participants, isConnected: connected }),
}))
