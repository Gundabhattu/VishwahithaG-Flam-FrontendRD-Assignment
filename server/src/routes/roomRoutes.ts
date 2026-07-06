import { Router } from 'express'
import { createRoom } from '../controllers/roomController'

export const roomRoutes = Router()

roomRoutes.post('/', createRoom)
