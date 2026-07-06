import type { CanvasObject, Point } from '@/types'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export type ResizeHandle = 'tl' | 'tm' | 'tr' | 'ml' | 'mr' | 'bl' | 'bm' | 'br' | 'start' | 'end'

export const getObjectBounds = (object: CanvasObject): Bounds => {
  switch (object.type) {
    case 'pencil': {
      if (!object.points.length) {
        return { x: 0, y: 0, width: 0, height: 0 }
      }
      const xs = object.points.map((point) => point.x)
      const ys = object.points.map((point) => point.y)
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      }
    }
    case 'line':
    case 'arrow': {
      const minX = Math.min(object.start.x, object.end.x)
      const maxX = Math.max(object.start.x, object.end.x)
      const minY = Math.min(object.start.y, object.end.y)
      const maxY = Math.max(object.start.y, object.end.y)
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    }
    case 'rectangle':
      return { x: object.x, y: object.y, width: object.width, height: object.height }
    case 'circle':
      return { x: object.center.x - object.radius, y: object.center.y - object.radius, width: object.radius * 2, height: object.radius * 2 }
    case 'ellipse':
      return { x: object.center.x - object.radiusX, y: object.center.y - object.radiusY, width: object.radiusX * 2, height: object.radiusY * 2 }
    case 'text': {
      const width = Math.max(80, object.text.length * object.fontSize * 0.6)
      const height = object.fontSize * 1.2
      return { x: object.x, y: object.y, width, height }
    }
    case 'eraser': {
      if (!object.points.length) {
        return { x: 0, y: 0, width: 0, height: 0 }
      }
      const xs = object.points.map((point) => point.x)
      const ys = object.points.map((point) => point.y)
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      }
    }
  }
}

export const getHandlePositions = (bounds: Bounds) => ({
  tl: { x: bounds.x, y: bounds.y },
  tm: { x: bounds.x + bounds.width / 2, y: bounds.y },
  tr: { x: bounds.x + bounds.width, y: bounds.y },
  ml: { x: bounds.x, y: bounds.y + bounds.height / 2 },
  mr: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
  bl: { x: bounds.x, y: bounds.y + bounds.height },
  bm: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
  br: { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
})

export const isPointInBounds = (point: Point, bounds: Bounds, tolerance = 6) => {
  return (
    point.x >= bounds.x - tolerance &&
    point.x <= bounds.x + bounds.width + tolerance &&
    point.y >= bounds.y - tolerance &&
    point.y <= bounds.y + bounds.height + tolerance
  )
}

export const resizeObject = (object: CanvasObject, handle: ResizeHandle, startPoint: Point, currentPoint: Point, initialBounds: Bounds): CanvasObject => {
  const deltaX = currentPoint.x - startPoint.x
  const deltaY = currentPoint.y - startPoint.y

  switch (object.type) {
    case 'rectangle': {
      const next = { ...object }
      switch (handle) {
        case 'tl':
          next.x = initialBounds.x + deltaX
          next.y = initialBounds.y + deltaY
          next.width = Math.max(12, initialBounds.width - deltaX)
          next.height = Math.max(12, initialBounds.height - deltaY)
          break
        case 'tr':
          next.x = initialBounds.x
          next.y = initialBounds.y + deltaY
          next.width = Math.max(12, initialBounds.width + deltaX)
          next.height = Math.max(12, initialBounds.height - deltaY)
          break
        case 'bl':
          next.x = initialBounds.x + deltaX
          next.y = initialBounds.y
          next.width = Math.max(12, initialBounds.width - deltaX)
          next.height = Math.max(12, initialBounds.height + deltaY)
          break
        case 'br':
          next.width = Math.max(12, initialBounds.width + deltaX)
          next.height = Math.max(12, initialBounds.height + deltaY)
          break
        case 'tm':
          next.y = initialBounds.y + deltaY
          next.height = Math.max(12, initialBounds.height - deltaY)
          break
        case 'bm':
          next.height = Math.max(12, initialBounds.height + deltaY)
          break
        case 'ml':
          next.x = initialBounds.x + deltaX
          next.width = Math.max(12, initialBounds.width - deltaX)
          break
        case 'mr':
          next.width = Math.max(12, initialBounds.width + deltaX)
          break
      }
      return next
    }
    case 'circle': {
      const radius = Math.max(8, Math.hypot(currentPoint.x - object.center.x, currentPoint.y - object.center.y))
      return { ...object, radius }
    }
    case 'ellipse': {
      const radiusX = Math.max(8, Math.abs(currentPoint.x - object.center.x))
      const radiusY = Math.max(8, Math.abs(currentPoint.y - object.center.y))
      return { ...object, radiusX, radiusY }
    }
    case 'line':
    case 'arrow': {
      if (handle === 'start') {
        return { ...object, start: currentPoint }
      }
      return { ...object, end: currentPoint }
    }
    case 'text': {
      return { ...object, x: object.x + deltaX, y: object.y + deltaY }
    }
    default:
      return object
  }
}

export const moveObject = (object: CanvasObject, deltaX: number, deltaY: number): CanvasObject => {
  switch (object.type) {
    case 'pencil':
      return { ...object, points: object.points.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY })) }
    case 'line':
    case 'arrow':
      return { ...object, start: { x: object.start.x + deltaX, y: object.start.y + deltaY }, end: { x: object.end.x + deltaX, y: object.end.y + deltaY } }
    case 'rectangle':
      return { ...object, x: object.x + deltaX, y: object.y + deltaY }
    case 'circle':
      return { ...object, center: { x: object.center.x + deltaX, y: object.center.y + deltaY } }
    case 'ellipse':
      return { ...object, center: { x: object.center.x + deltaX, y: object.center.y + deltaY } }
    case 'text':
      return { ...object, x: object.x + deltaX, y: object.y + deltaY }
    case 'eraser':
      return { ...object, points: object.points.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY })) }
  }
}
