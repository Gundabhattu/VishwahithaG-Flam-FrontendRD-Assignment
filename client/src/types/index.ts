export interface Point {
  x: number
  y: number
}

export type ToolType = 'select' | 'pencil' | 'line' | 'rectangle' | 'circle' | 'ellipse' | 'arrow' | 'text' | 'eraser'
export type DashStyle = 'solid' | 'dashed' | 'dotted'

export interface BaseCanvasObject {
  id: string
  type: ToolType
  createdBy: string
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  dashStyle: DashStyle
  locked?: boolean
  groupId?: string
}

export interface PencilObject extends BaseCanvasObject {
  type: 'pencil'
  points: Point[]
}

export interface LineObject extends BaseCanvasObject {
  type: 'line'
  start: Point
  end: Point
}

export interface RectangleObject extends BaseCanvasObject {
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
}

export interface CircleObject extends BaseCanvasObject {
  type: 'circle'
  center: Point
  radius: number
}

export interface EllipseObject extends BaseCanvasObject {
  type: 'ellipse'
  center: Point
  radiusX: number
  radiusY: number
}

export interface ArrowObject extends BaseCanvasObject {
  type: 'arrow'
  start: Point
  end: Point
  arrowHeadSize: number
}

export interface TextObject extends BaseCanvasObject {
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
}

export interface EraserObject extends BaseCanvasObject {
  type: 'eraser'
  points: Point[]
}

export type CanvasObject = PencilObject | LineObject | RectangleObject | CircleObject | EllipseObject | ArrowObject | TextObject | EraserObject
export type Stroke = PencilObject

export interface Participant {
  id: string
  userName: string
  connected: boolean
  cursor?: Point
  color?: string
  avatarUrl?: string | null
  isTyping?: boolean
  lastSeen?: string | null
}

export interface PresenceState {
  activeUsers: Participant[]
  reconnecting: boolean
  lastSyncAt?: string | null
}

export interface ExportPayload {
  format: 'png' | 'svg' | 'json'
}

export interface ImportPayload {
  objects: CanvasObject[]
}

export interface AnalyticsEvent {
  name: string
  properties?: Record<string, unknown>
  timestamp: string
}

export interface RoomJoinPayload {
  roomId: string
  userName: string
}

export interface RoomCreatePayload {
  roomId: string
  userName: string
}

export interface CursorPayload {
  roomId: string
  point: Point
}

export interface DeletePayload {
  roomId: string
  objectId: string
}

export interface HistoryPayload {
  roomId: string
  action: string
  payload?: unknown
}

export interface RoomStatePayload {
  roomId: string
  userName: string
  participants: Participant[]
  objects: CanvasObject[]
}

export interface ServerToClientEvents {
  'room:joined': (payload: RoomStatePayload) => void
  'room:updated': (participants: Participant[]) => void
  'room:error': (message: string) => void
  'drawing:update': (object: CanvasObject) => void
  'draw:stroke': (stroke: CanvasObject) => void
  'object:upserted': (object: CanvasObject) => void
  'object:batch': (payload: { objects: CanvasObject[] }) => void
  'object:deleted': (payload: DeletePayload) => void
  'cursor:move': (payload: { participantId: string; point: Point }) => void
  'history:event': (payload: { action: string; payload?: unknown }) => void
  'room:state': (payload: { participants: Participant[]; objects: CanvasObject[] }) => void
}

export interface ClientToServerEvents {
  'room:create': (payload: RoomCreatePayload) => void
  'room:join': (payload: RoomJoinPayload) => void
  'drawing:update': (payload: { roomId: string; object: CanvasObject }) => void
  'draw:stroke': (payload: { roomId: string; stroke: CanvasObject }) => void
  'object:upsert': (payload: { roomId: string; object: CanvasObject }) => void
  'object:batch': (payload: { roomId: string; objects: CanvasObject[] }) => void
  'object:delete': (payload: DeletePayload) => void
  'cursor:move': (payload: CursorPayload) => void
  'history:event': (payload: HistoryPayload) => void
  'room:leave': (roomId: string) => void
}
