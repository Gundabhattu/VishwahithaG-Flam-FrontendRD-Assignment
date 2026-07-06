import type { CanvasObject, Point } from '../types'

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const isPoint = (value: unknown): value is Point => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return typeof candidate.x === 'number' && typeof candidate.y === 'number' && Number.isFinite(candidate.x) && Number.isFinite(candidate.y)
}

export const validateRoomJoinPayload = (payload: unknown): payload is { roomId: string; userName: string } => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return isNonEmptyString(candidate.roomId) && isNonEmptyString(candidate.userName)
}

export const validateObjectPayload = (payload: unknown): payload is CanvasObject => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  if (!isNonEmptyString(candidate.id) || !isNonEmptyString(candidate.createdBy) || !isNonEmptyString(candidate.type)) {
    return false
  }

  switch (candidate.type) {
    case 'pencil':
    case 'eraser':
      return Array.isArray((candidate as { points?: unknown }).points) && (candidate as { points: unknown[] }).points.every(isPoint)
    case 'line':
    case 'arrow':
      return isPoint((candidate as { start?: unknown }).start) && isPoint((candidate as { end?: unknown }).end)
    case 'rectangle':
      return typeof (candidate as { x?: unknown }).x === 'number' && typeof (candidate as { y?: unknown }).y === 'number' && typeof (candidate as { width?: unknown }).width === 'number' && typeof (candidate as { height?: unknown }).height === 'number'
    case 'circle':
      return isPoint((candidate as { center?: unknown }).center) && typeof (candidate as { radius?: unknown }).radius === 'number'
    case 'ellipse':
      return isPoint((candidate as { center?: unknown }).center) && typeof (candidate as { radiusX?: unknown }).radiusX === 'number' && typeof (candidate as { radiusY?: unknown }).radiusY === 'number'
    case 'text':
      return typeof (candidate as { x?: unknown }).x === 'number' && typeof (candidate as { y?: unknown }).y === 'number' && isNonEmptyString((candidate as { text?: unknown }).text) && typeof (candidate as { fontSize?: unknown }).fontSize === 'number'
    default:
      return false
  }
}

export const validateDeletePayload = (payload: unknown): payload is { roomId: string; objectId: string } => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return isNonEmptyString(candidate.roomId) && isNonEmptyString(candidate.objectId)
}

export const validateCursorPayload = (payload: unknown): payload is { roomId: string; point: Point } => {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Record<string, unknown>
  return isNonEmptyString(candidate.roomId) && isPoint(candidate.point)
}
