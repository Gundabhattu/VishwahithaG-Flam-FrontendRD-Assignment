import type { CanvasObject } from '@/types'
import { getObjectBounds } from './geometry'
import { renderCanvasScene, type Viewport } from './renderer'

export interface CanvasDocument {
  version: 1
  exportedAt: string
  objects: CanvasObject[]
}

const getSceneBounds = (objects: CanvasObject[]) => {
  if (!objects.length) {
    return { x: -400, y: -300, width: 800, height: 600 }
  }

  const bounds = objects.map(getObjectBounds)
  const minX = Math.min(...bounds.map((bound) => bound.x))
  const minY = Math.min(...bounds.map((bound) => bound.y))
  const maxX = Math.max(...bounds.map((bound) => bound.x + bound.width))
  const maxY = Math.max(...bounds.map((bound) => bound.y + bound.height))
  return { x: minX - 48, y: minY - 48, width: Math.max(320, maxX - minX + 96), height: Math.max(240, maxY - minY + 96) }
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const exportJSON = (objects: CanvasObject[], filename = 'flam-canvas.json') => {
  const document: CanvasDocument = { version: 1, exportedAt: new Date().toISOString(), objects }
  downloadBlob(new Blob([JSON.stringify(document, null, 2)], { type: 'application/json' }), filename)
}

export const exportPNG = (objects: CanvasObject[], filename = 'flam-canvas.png') => {
  const bounds = getSceneBounds(objects)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(bounds.width)
  canvas.height = Math.ceil(bounds.height)
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }
  const viewport: Viewport = { width: bounds.width, height: bounds.height, zoom: 1, panX: bounds.x + bounds.width / 2, panY: bounds.y + bounds.height / 2 }
  renderCanvasScene(context, viewport, objects, { showGrid: false })
  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, filename)
    }
  }, 'image/png')
}

export const exportSVG = (objects: CanvasObject[], filename = 'flam-canvas.svg') => {
  const bounds = getSceneBounds(objects)
  const body = objects.map(objectToSvg).join('\n')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">\n<rect x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" fill="transparent"/>\n${body}\n</svg>`
  downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), filename)
}

export const parseCanvasDocument = (text: string): CanvasObject[] => {
  const parsed = JSON.parse(text) as Partial<CanvasDocument> | CanvasObject[]
  if (Array.isArray(parsed)) {
    return parsed
  }
  if (!parsed.objects || !Array.isArray(parsed.objects)) {
    throw new Error('Invalid Flam Canvas JSON document')
  }
  return parsed.objects
}

const attrs = (object: CanvasObject) => `stroke="${escapeXml(object.strokeColor)}" fill="${escapeXml(object.fillColor)}" stroke-width="${object.strokeWidth}" opacity="${object.opacity}" stroke-linecap="round" stroke-linejoin="round"${dashAttr(object.dashStyle)}`

const dashAttr = (style: CanvasObject['dashStyle']) => {
  if (style === 'dashed') {
    return ' stroke-dasharray="8 6"'
  }
  if (style === 'dotted') {
    return ' stroke-dasharray="2 4"'
  }
  return ''
}

const objectToSvg = (object: CanvasObject) => {
  switch (object.type) {
    case 'pencil':
    case 'eraser':
      return `<polyline points="${object.points.map((point) => `${point.x},${point.y}`).join(' ')}" ${attrs(object)} fill="none"/>`
    case 'line':
      return `<line x1="${object.start.x}" y1="${object.start.y}" x2="${object.end.x}" y2="${object.end.y}" ${attrs(object)} />`
    case 'arrow':
      return `<line x1="${object.start.x}" y1="${object.start.y}" x2="${object.end.x}" y2="${object.end.y}" ${attrs(object)} />`
    case 'rectangle':
      return `<rect x="${object.x}" y="${object.y}" width="${object.width}" height="${object.height}" ${attrs(object)} />`
    case 'circle':
      return `<circle cx="${object.center.x}" cy="${object.center.y}" r="${object.radius}" ${attrs(object)} />`
    case 'ellipse':
      return `<ellipse cx="${object.center.x}" cy="${object.center.y}" rx="${object.radiusX}" ry="${object.radiusY}" ${attrs(object)} />`
    case 'text':
      return `<text x="${object.x}" y="${object.y}" font-size="${object.fontSize}" fill="${escapeXml(object.strokeColor)}" opacity="${object.opacity}">${escapeXml(object.text)}</text>`
  }
}

const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
