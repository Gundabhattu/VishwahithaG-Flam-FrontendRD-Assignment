import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import path from 'node:path'
import { errorHandler } from './middlewares/errorHandler'
import { roomRoutes } from './routes/roomRoutes'
import { registerSocketHandlers } from './socket/socketManager'

dotenv.config({ path: path.resolve(process.cwd(), '../.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const app = express()
const port = Number(process.env.PORT ?? 4000)
const clientDistPath = path.resolve(__dirname, '../../client/dist')
const clientOrigins = (process.env.CLIENT_URL ?? 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

// Allow any origin on local/private networks (192.168.x.x, 10.x.x.x, 172.16-31.x.x) for LAN dev
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true
  if (clientOrigins.includes(origin)) return true
  try {
    const { hostname } = new URL(origin)
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      /^192\.168\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    )
  } catch {
    return false
  }
}

app.use(cors({ origin: isAllowedOrigin, credentials: true }))
app.use(express.json())

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.use('/rooms', roomRoutes)
app.use(express.static(clientDistPath))
app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(clientDistPath, 'index.html'))
})
app.use(errorHandler)

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: isAllowedOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 25000,
  pingTimeout: 20000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
})

registerSocketHandlers(io)

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`)
  console.log(`Local network: http://192.168.1.16:${port}`)
})
