import type { CanvasObject, Participant, RoomState } from '../types'

export class RoomService {
  private rooms = new Map<string, RoomState>()

  createRoom(roomId: string): RoomState {
    const existing = this.rooms.get(roomId)
    if (existing) {
      return existing
    }

    const room: RoomState = {
      roomId,
      participants: new Map<string, Participant>(),
      objects: [],
      history: [],
    }

    this.rooms.set(roomId, room)
    return room
  }

  getOrCreateRoom(roomId: string): RoomState {
    return this.createRoom(roomId)
  }

  getRoom(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId)
  }

  joinRoom(roomId: string, socketId: string, userName: string): Participant {
    const room = this.getOrCreateRoom(roomId)
    const participant: Participant = {
      id: socketId,
      userName,
      connected: true,
      color: this.getParticipantColor(socketId),
    }

    room.participants.set(socketId, participant)
    return participant
  }

  leaveRoom(roomId: string, socketId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room) {
      return false
    }

    room.participants.delete(socketId)
    return true
  }

  disconnectParticipant(socketId: string): string[] {
    const changedRooms: string[] = []

    this.rooms.forEach((room, roomId) => {
      if (room.participants.has(socketId)) {
        room.participants.delete(socketId)
        changedRooms.push(roomId)
      }
    })

    return changedRooms
  }

  addObject(roomId: string, object: CanvasObject): CanvasObject {
    const room = this.getOrCreateRoom(roomId)
    room.objects = [...room.objects, object]
    room.history.push({ action: 'snapshot', payload: { object } })
    return object
  }

  upsertObject(roomId: string, object: CanvasObject): CanvasObject {
    const room = this.getOrCreateRoom(roomId)
    const existingIndex = room.objects.findIndex((candidate) => candidate.id === object.id)
    if (existingIndex >= 0) {
      room.objects.splice(existingIndex, 1, object)
    } else {
      room.objects.push(object)
    }
    room.history.push({ action: 'upsert', payload: { object } })
    return object
  }

  deleteObject(roomId: string, objectId: string): boolean {
    const room = this.getOrCreateRoom(roomId)
    const before = room.objects.length
    room.objects = room.objects.filter((object) => object.id !== objectId)
    room.history.push({ action: 'delete', payload: { objectId } })
    return room.objects.length !== before
  }

  replaceObjects(roomId: string, objects: CanvasObject[]): void {
    const room = this.getOrCreateRoom(roomId)
    room.objects = [...objects]
    room.history.push({ action: 'snapshot', payload: { objects } })
  }

  getSnapshot(roomId: string) {
    const room = this.getOrCreateRoom(roomId)
    return {
      roomId,
      participants: Array.from(room.participants.values()),
      objects: room.objects,
    }
  }

  updateCursor(roomId: string, socketId: string, cursor: { x: number; y: number }): void {
    const room = this.getOrCreateRoom(roomId)
    const participant = room.participants.get(socketId)
    if (participant) {
      participant.cursor = cursor
    }
  }

  getRoomState(roomId: string): RoomState | undefined {
    return this.rooms.get(roomId)
  }

  private getParticipantColor(socketId: string): string {
    const colors = ['#38bdf8', '#a78bfa', '#34d399', '#f59e0b', '#fb7185', '#22d3ee', '#f472b6', '#c4b5fd']
    const total = socketId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return colors[total % colors.length]
  }
}
