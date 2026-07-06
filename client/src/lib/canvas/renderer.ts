import type { CanvasObject, DashStyle, Point } from '@/types'
import { getHandlePositions, getObjectBounds } from './geometry'

export interface Viewport {
  width: number
  height: number
  zoom: number
  panX: number
  panY: number
}

export const worldToScreen = (point: Point, viewport: Viewport) => ({
  x: (point.x - viewport.panX) * viewport.zoom + viewport.width / 2,
  y: (point.y - viewport.panY) * viewport.zoom + viewport.height / 2,
})

export const screenToWorld = (point: Point, viewport: Viewport) => ({
  x: (point.x - viewport.width / 2) / viewport.zoom + viewport.panX,
  y: (point.y - viewport.height / 2) / viewport.zoom + viewport.panY,
})

export const snapPointToGrid = (point: Point, spacing: number) => ({
  x: Math.round(point.x / spacing) * spacing,
  y: Math.round(point.y / spacing) * spacing,
})

export const getGridSpacing = (zoom: number) => {
  const baseSpacing = 64
  return Math.max(12, baseSpacing / zoom)
}

export const renderCanvasScene = (
  context: CanvasRenderingContext2D,
  viewport: Viewport,
  objects: CanvasObject[],
  options?: { showGrid?: boolean; selectedObject?: CanvasObject | null; dirtyBounds?: { x: number; y: number; width: number; height: number } | null; onMeasure?: (metrics: { visibleObjects: number; totalObjects: number; drawMs: number }) => void },
) => {
  const startedAt = performance.now()
  const visibleWorld = getVisibleWorldBounds(viewport)
  const visibleObjects = objects.filter((object) => boundsIntersect(getObjectBounds(object), visibleWorld))
  const canUseDirtyRect = Boolean(options?.dirtyBounds && options.showGrid === false)

  if (canUseDirtyRect && options?.dirtyBounds) {
    const dirty = expandBounds(options.dirtyBounds, 24 / viewport.zoom)
    const topLeft = worldToScreen({ x: dirty.x, y: dirty.y }, viewport)
    const bottomRight = worldToScreen({ x: dirty.x + dirty.width, y: dirty.y + dirty.height }, viewport)
    context.clearRect(topLeft.x - 4, topLeft.y - 4, bottomRight.x - topLeft.x + 8, bottomRight.y - topLeft.y + 8)
  } else {
    context.clearRect(0, 0, viewport.width, viewport.height)
  }

  if (options?.showGrid !== false) {
    drawGrid(context, viewport)
  }

  visibleObjects.forEach((object) => {
    drawObject(context, object, viewport)
  })

  if (options?.selectedObject) {
    drawSelectionHandles(context, viewport, options.selectedObject)
  }

  options?.onMeasure?.({ visibleObjects: visibleObjects.length, totalObjects: objects.length, drawMs: performance.now() - startedAt })
}

export const getVisibleWorldBounds = (viewport: Viewport) => {
  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport)
  const bottomRight = screenToWorld({ x: viewport.width, y: viewport.height }, viewport)
  return expandBounds({ x: topLeft.x, y: topLeft.y, width: bottomRight.x - topLeft.x, height: bottomRight.y - topLeft.y }, 128 / viewport.zoom)
}

const expandBounds = (bounds: { x: number; y: number; width: number; height: number }, amount: number) => ({
  x: bounds.x - amount,
  y: bounds.y - amount,
  width: bounds.width + amount * 2,
  height: bounds.height + amount * 2,
})

const boundsIntersect = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) => {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
}

const drawGrid = (context: CanvasRenderingContext2D, viewport: Viewport) => {
  const spacing = getGridSpacing(viewport.zoom)
  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport)
  const bottomRight = screenToWorld({ x: viewport.width, y: viewport.height }, viewport)

  const startX = Math.floor(topLeft.x / spacing) * spacing
  const endX = Math.ceil(bottomRight.x / spacing) * spacing
  const startY = Math.floor(topLeft.y / spacing) * spacing
  const endY = Math.ceil(bottomRight.y / spacing) * spacing

  context.save()
  context.strokeStyle = 'rgba(148, 163, 184, 0.22)'
  context.lineWidth = 1

  for (let x = startX; x <= endX; x += spacing) {
    const start = worldToScreen({ x, y: startY }, viewport)
    const end = worldToScreen({ x, y: endY }, viewport)
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
    context.stroke()
  }

  for (let y = startY; y <= endY; y += spacing) {
    const start = worldToScreen({ x: startX, y }, viewport)
    const end = worldToScreen({ x: endX, y }, viewport)
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(end.x, end.y)
    context.stroke()
  }

  context.restore()
}

const drawObject = (context: CanvasRenderingContext2D, object: CanvasObject, viewport: Viewport) => {
  context.save()
  context.globalAlpha = object.opacity
  context.strokeStyle = object.strokeColor
  context.fillStyle = object.fillColor
  context.lineWidth = Math.max(1, object.strokeWidth / viewport.zoom)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.setLineDash(getDashArray(object.dashStyle))

  const screenPoint = (point: Point) => worldToScreen(point, viewport)

  switch (object.type) {
    case 'pencil':
    case 'eraser': {
      if (object.points.length < 2) {
        return
      }
      context.beginPath()
      const [firstPoint, ...rest] = object.points
      const start = screenPoint(firstPoint)
      context.moveTo(start.x, start.y)
      rest.forEach((point) => {
        const next = screenPoint(point)
        context.lineTo(next.x, next.y)
      })
      context.stroke()
      break
    }
    case 'line':
    case 'arrow': {
      const start = screenPoint(object.start)
      const end = screenPoint(object.end)
      context.beginPath()
      context.moveTo(start.x, start.y)
      context.lineTo(end.x, end.y)
      context.stroke()
      if (object.type === 'arrow') {
        drawArrowHead(context, start, end, object.arrowHeadSize)
      }
      break
    }
    case 'rectangle': {
      const topLeft = screenPoint({ x: object.x, y: object.y })
      const bottomRight = screenPoint({ x: object.x + object.width, y: object.y + object.height })
      context.beginPath()
      context.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
      context.fill()
      context.stroke()
      break
    }
    case 'circle': {
      const center = screenPoint(object.center)
      const radius = object.radius * viewport.zoom
      context.beginPath()
      context.arc(center.x, center.y, radius, 0, Math.PI * 2)
      context.fill()
      context.stroke()
      break
    }
    case 'ellipse': {
      const center = screenPoint(object.center)
      context.beginPath()
      context.ellipse(center.x, center.y, object.radiusX * viewport.zoom, object.radiusY * viewport.zoom, 0, 0, Math.PI * 2)
      context.fill()
      context.stroke()
      break
    }
    case 'text': {
      const start = screenPoint({ x: object.x, y: object.y })
      context.font = `${object.fontSize * viewport.zoom}px Inter, sans-serif`
      context.fillText(object.text, start.x, start.y)
      break
    }
  }

  context.restore()
}

const drawArrowHead = (context: CanvasRenderingContext2D, start: Point, end: Point, size: number) => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  context.beginPath()
  context.moveTo(end.x, end.y)
  context.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6))
  context.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6))
  context.closePath()
  context.fill()
  context.stroke()
}

const drawSelectionHandles = (context: CanvasRenderingContext2D, viewport: Viewport, object: CanvasObject) => {
  const bounds = getObjectBounds(object)
  const handles = getHandlePositions(bounds)
  context.save()
  context.strokeStyle = '#38bdf8'
  context.fillStyle = '#ffffff'
  context.lineWidth = 1.5
  context.setLineDash([])

  const drawHandle = (point: Point) => {
    const screen = worldToScreen(point, viewport)
    context.beginPath()
    context.arc(screen.x, screen.y, 5, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }

  Object.values(handles).forEach(drawHandle)
  context.restore()
}

const getDashArray = (dashStyle: DashStyle) => {
  switch (dashStyle) {
    case 'dashed':
      return [8, 6]
    case 'dotted':
      return [2, 4]
    default:
      return []
  }
}
