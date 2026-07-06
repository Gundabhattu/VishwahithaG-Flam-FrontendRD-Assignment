import { createServer } from 'node:http'
import { AddressInfo } from 'node:net'
import { Server } from 'socket.io'
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client'
import { afterEach, describe, expect, it } from 'vitest'
import { registerSocketHandlers } from './socketManager'
import type { CanvasObject } from '../types'

const object: CanvasObject = {
  id: 'rect-1',
  type: 'rectangle',
  createdBy: 'test',
  strokeColor: '#000',
  fillColor: '#fff',
  strokeWidth: 2,
  opacity: 1,
  dashStyle: 'solid',
  x: 0,
  y: 0,
  width: 20,
  height: 20,
}

let ioServer: Server | null = null
let clients: ClientSocket[] = []

afterEach(async () => {
  clients.forEach((client) => client.disconnect())
  clients = []
  if (ioServer) {
    await ioServer.close()
    ioServer = null
  }
})

describe('socket synchronization', () => {
  it('broadcasts batched object updates to collaborators', async () => {
    const httpServer = createServer()
    ioServer = new Server(httpServer, { cors: { origin: '*' } })
    registerSocketHandlers(ioServer)
    await new Promise<void>((resolve) => httpServer.listen(0, resolve))
    const port = (httpServer.address() as AddressInfo).port
    const url = `http://localhost:${port}`

    const first = createClient(url, { auth: { token: 'demo-token' }, transports: ['websocket'] })
    const second = createClient(url, { auth: { token: 'demo-token' }, transports: ['websocket'] })
    clients.push(first, second)

    await Promise.all([once(first, 'connect'), once(second, 'connect')])
    first.emit('room:join', { roomId: 'room-1', userName: 'Alex' })
    second.emit('room:join', { roomId: 'room-1', userName: 'Sam' })
    await Promise.all([once(first, 'room:joined'), once(second, 'room:joined')])

    const received = once(second, 'object:batch') as Promise<{ objects: CanvasObject[] }>
    first.emit('object:batch', { roomId: 'room-1', objects: [object, { ...object, id: 'rect-2', x: 40 }] })

    await expect(received).resolves.toMatchObject({ objects: [{ id: 'rect-1' }, { id: 'rect-2' }] })
  })
})

const once = <T>(socket: ClientSocket, event: string) =>
  new Promise<T>((resolve) => {
    socket.once(event, resolve)
  })
