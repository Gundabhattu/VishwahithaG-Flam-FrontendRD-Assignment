import type { Server, Socket } from 'socket.io'
import type { CanvasObject } from '../types'
import { RoomService } from '../services/roomService'
import { validateCursorPayload, validateDeletePayload, validateObjectPayload, validateRoomJoinPayload } from '../utils/validators'

const roomService = new RoomService()

const broadcastRoomParticipants = (io: Server, roomId: string) => {
  const roomState = roomService.getSnapshot(roomId)
  console.log('[socket] room participants update', { roomId, sockets: roomState.participants.map((participant) => participant.id) })
  io.to(roomId).emit('room:updated', roomState.participants)
}

const joinRoom = (io: Server, socket: Socket, roomId: string, userName: string) => {
  const participant = roomService.joinRoom(roomId, socket.id, userName)
  socket.join(roomId)
  socket.data.roomId = roomId
  socket.data.userName = userName

  const snapshot = roomService.getSnapshot(roomId)
  console.log('[socket] room joined', { roomId, socketId: socket.id, userName, socketsInRoom: snapshot.participants.map((participant) => participant.id) })
  socket.emit('room:joined', {
    roomId,
    userName: participant.userName,
    participants: snapshot.participants,
    objects: snapshot.objects,
  })

  broadcastRoomParticipants(io, roomId)
}

export const registerSocketHandlers = (io: Server) => {
  io.use((socket, next) => {
    const token = (socket.handshake.auth?.token ?? socket.handshake.query?.token) as string | undefined
    const expectedToken = process.env.SOCKET_AUTH_TOKEN ?? 'demo-token'

    if (!token || token !== expectedToken) {
      return next(new Error('Authentication failed'))
    }

    next()
  })

  io.on('connection', (socket: Socket) => {
    const pendingRoomId = socket.handshake.auth?.roomId as string | undefined
    const pendingUserName = socket.handshake.auth?.userName as string | undefined

    if (pendingRoomId && pendingUserName) {
      joinRoom(io, socket, pendingRoomId, pendingUserName)
    }

    socket.on('room:join', (payload) => {
      if (!validateRoomJoinPayload(payload)) {
        socket.emit('room:error', 'Invalid room join payload')
        return
      }

      joinRoom(io, socket, payload.roomId, payload.userName)
    })

    socket.on('draw:stroke', (payload) => {
      if (!payload || typeof payload !== 'object' || !validateObjectPayload((payload as { stroke?: unknown }).stroke)) {
        socket.emit('room:error', 'Invalid draw payload')
        return
      }

      const roomId = (payload as { roomId?: unknown }).roomId
      if (typeof roomId !== 'string' || !roomId) {
        socket.emit('room:error', 'Invalid room id')
        return
      }

      const object = (payload as { stroke: CanvasObject }).stroke
      roomService.upsertObject(roomId, object)
      console.log('[socket] draw received', { roomId, socketId: socket.id, objectId: object.id })
      socket.to(roomId).emit('draw:stroke', object)
      console.log('[socket] draw broadcast', { roomId, sender: socket.id })
      io.to(roomId).emit('room:state', roomService.getSnapshot(roomId))
    })

    socket.on('drawing:update', (payload) => {
      if (!payload || typeof payload !== 'object' || !validateObjectPayload((payload as { object?: unknown }).object)) {
        socket.emit('room:error', 'Invalid drawing payload')
        return
      }

      const roomId = (payload as { roomId?: unknown }).roomId
      if (typeof roomId !== 'string' || !roomId) {
        socket.emit('room:error', 'Invalid room id')
        return
      }

      const object = (payload as { object: CanvasObject }).object
      roomService.upsertObject(roomId, object)
      console.log('[socket] drawing:update received', { roomId, socketId: socket.id, objectId: object.id })
      socket.to(roomId).emit('drawing:update', object)
      console.log('[socket] drawing:update broadcast', { roomId, sender: socket.id })
      io.to(roomId).emit('room:state', roomService.getSnapshot(roomId))
    })

    socket.on('object:upsert', (payload) => {
      if (!payload || typeof payload !== 'object' || !validateObjectPayload((payload as { object?: unknown }).object)) {
        socket.emit('room:error', 'Invalid object payload')
        return
      }

      const roomId = (payload as { roomId?: unknown }).roomId
      if (typeof roomId !== 'string' || !roomId) {
        socket.emit('room:error', 'Invalid room id')
        return
      }

      const object = (payload as { object: CanvasObject }).object
      roomService.upsertObject(roomId, object)
      console.log('[socket] object upsert received', { roomId, socketId: socket.id, objectId: object.id })
      socket.to(roomId).emit('object:upserted', object)
      console.log('[socket] object upsert broadcast', { roomId, sender: socket.id })
      io.to(roomId).emit('room:state', roomService.getSnapshot(roomId))
    })

    socket.on('object:batch', (payload) => {
      if (!payload || typeof payload !== 'object') {
        socket.emit('room:error', 'Invalid object batch')
        return
      }

      const roomId = (payload as { roomId?: unknown }).roomId
      const objects = (payload as { objects?: unknown }).objects
      if (typeof roomId !== 'string' || !roomId || !Array.isArray(objects) || !objects.every(validateObjectPayload)) {
        socket.emit('room:error', 'Invalid object batch')
        return
      }

      objects.forEach((object) => roomService.upsertObject(roomId, object))
      console.log('[socket] object batch received', { roomId, socketId: socket.id, count: objects.length })
      socket.to(roomId).emit('object:batch', { objects })
      console.log('[socket] object batch broadcast', { roomId, sender: socket.id, count: objects.length })
      io.to(roomId).emit('room:state', roomService.getSnapshot(roomId))
    })

    socket.on('object:delete', (payload) => {
      if (!validateDeletePayload(payload)) {
        socket.emit('room:error', 'Invalid delete payload')
        return
      }

      const deleted = roomService.deleteObject(payload.roomId, payload.objectId)
      if (deleted) {
        console.log('[socket] delete received', { roomId: payload.roomId, socketId: socket.id, objectId: payload.objectId })
        io.to(payload.roomId).emit('object:deleted', payload)
        console.log('[socket] delete broadcast', { roomId: payload.roomId, sender: socket.id, objectId: payload.objectId })
        io.to(payload.roomId).emit('room:state', roomService.getSnapshot(payload.roomId))
      }
    })

    socket.on('cursor:move', (payload) => {
      if (!validateCursorPayload(payload)) {
        return
      }

      roomService.updateCursor(payload.roomId, socket.id, payload.point)
      socket.to(payload.roomId).emit('cursor:move', { participantId: socket.id, point: payload.point })
    })

    socket.on('history:event', (payload) => {
      if (!payload || typeof payload !== 'object') {
        return
      }

      const roomId = (payload as { roomId?: unknown }).roomId
      if (typeof roomId !== 'string' || !roomId) {
        return
      }

      const action = String((payload as { action?: unknown }).action ?? 'snapshot')
      const eventPayload = (payload as { payload?: unknown }).payload
      const objects = eventPayload && typeof eventPayload === 'object' && Array.isArray((eventPayload as { objects?: unknown }).objects) ? (eventPayload as { objects: unknown[] }).objects : null
      if (objects) {
        roomService.replaceObjects(roomId, objects as CanvasObject[])
        console.log('[socket] history snapshot received', { roomId, socketId: socket.id, objectCount: objects.length })
        socket.to(roomId).emit('room:state', roomService.getSnapshot(roomId))
      }
      socket.to(roomId).emit('history:event', { action, payload: eventPayload })
    })

    socket.on('room:leave', (roomId: string) => {
      if (typeof roomId !== 'string' || !roomId) {
        return
      }

      roomService.leaveRoom(roomId, socket.id)
      socket.leave(roomId)
      broadcastRoomParticipants(io, roomId)
    })

    socket.on('disconnect', () => {
      const changedRooms = roomService.disconnectParticipant(socket.id)
      changedRooms.forEach((roomId) => broadcastRoomParticipants(io, roomId))
    })
  })
}
