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
}

export interface RoomState {
  roomId: string
  participants: Map<string, Participant>
  objects: CanvasObject[]
  history: Array<{ action: string; payload?: unknown }>
}
