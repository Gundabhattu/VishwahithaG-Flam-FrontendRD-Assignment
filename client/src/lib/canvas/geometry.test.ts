import { describe, expect, it } from 'vitest'
import { getObjectBounds, moveObject } from './geometry'
import type { CanvasObject } from '@/types'

const rectangle: CanvasObject = {
  id: 'rect-1',
  type: 'rectangle',
  createdBy: 'test',
  strokeColor: '#000',
  fillColor: '#fff',
  strokeWidth: 2,
  opacity: 1,
  dashStyle: 'solid',
  x: 10,
  y: 20,
  width: 100,
  height: 80,
}

describe('canvas geometry', () => {
  it('calculates object bounds', () => {
    expect(getObjectBounds(rectangle)).toEqual({ x: 10, y: 20, width: 100, height: 80 })
  })

  it('moves objects without mutating the original', () => {
    const moved = moveObject(rectangle, 5, -10)
    expect(moved).toMatchObject({ x: 15, y: 10 })
    expect(rectangle).toMatchObject({ x: 10, y: 20 })
  })
})
