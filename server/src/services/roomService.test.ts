import { describe, expect, it } from 'vitest'
import { RoomService } from './roomService'
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

describe('RoomService', () => {
  it('upserts objects by id without duplicates', () => {
    const service = new RoomService()
    service.upsertObject('room-1', object)
    service.upsertObject('room-1', { ...object, x: 10 })
    expect(service.getSnapshot('room-1').objects).toHaveLength(1)
    expect(service.getSnapshot('room-1').objects[0]).toMatchObject({ x: 10 })
  })

  it('tracks participants and cursor colors', () => {
    const service = new RoomService()
    const participant = service.joinRoom('room-1', 'socket-1', 'Alex')
    service.updateCursor('room-1', 'socket-1', { x: 4, y: 8 })
    const snapshot = service.getSnapshot('room-1')
    expect(participant.color).toBeDefined()
    expect(snapshot.participants[0].cursor).toEqual({ x: 4, y: 8 })
  })
})
