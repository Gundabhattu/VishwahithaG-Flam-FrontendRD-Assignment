import { describe, expect, it } from 'vitest'
import { parseCanvasDocument } from './exporters'
import type { CanvasObject } from '@/types'

const object: CanvasObject = {
  id: 'line-1',
  type: 'line',
  createdBy: 'test',
  strokeColor: '#000',
  fillColor: '#fff',
  strokeWidth: 2,
  opacity: 1,
  dashStyle: 'solid',
  start: { x: 0, y: 0 },
  end: { x: 20, y: 20 },
}

describe('canvas import parsing', () => {
  it('parses versioned canvas documents', () => {
    expect(parseCanvasDocument(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), objects: [object] }))).toEqual([object])
  })

  it('rejects invalid documents', () => {
    expect(() => parseCanvasDocument(JSON.stringify({ invalid: true }))).toThrow('Invalid Flam Canvas JSON document')
  })
})
