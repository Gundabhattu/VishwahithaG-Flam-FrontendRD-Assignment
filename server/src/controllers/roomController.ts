import type { Request, Response } from 'express'
import { createRoomId } from '../utils/room'

export const createRoom = (_request: Request, response: Response) => {
  response.status(201).json({ roomId: createRoomId() })
}
