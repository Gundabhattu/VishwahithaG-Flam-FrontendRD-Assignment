import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export interface CanvasSize {
  width: number
  height: number
}

export interface UseCanvasResult<T extends HTMLCanvasElement = HTMLCanvasElement> {
  canvasRef: RefObject<T | null>
  size: CanvasSize
}

export const useCanvas = <T extends HTMLCanvasElement = HTMLCanvasElement>(
  draw: (context: CanvasRenderingContext2D, canvas: T, size: CanvasSize) => void,
): UseCanvasResult<T> => {
  const canvasRef = useRef<T | null>(null)
  const frameRef = useRef<number | null>(null)
  const [size, setSize] = useState<CanvasSize>({ width: 0, height: 0 })

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const rect = canvas.getBoundingClientRect()
    const width = Math.max(1, Math.floor(rect.width))
    const height = Math.max(1, Math.floor(rect.height))
    const ratio = window.devicePixelRatio || 1

    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio
      canvas.height = height * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    setSize({ width, height })
    draw(context, canvas, { width, height })
  }, [draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const scheduleRender = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }

      frameRef.current = window.requestAnimationFrame(render)
    }

    scheduleRender()

    const resizeObserver = new ResizeObserver(scheduleRender)
    resizeObserver.observe(canvas)

    window.addEventListener('resize', scheduleRender)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', scheduleRender)
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [render])

  return { canvasRef, size }
}
