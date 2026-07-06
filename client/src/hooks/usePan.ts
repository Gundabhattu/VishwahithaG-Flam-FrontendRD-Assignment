import { useCallback, useState } from 'react'

export interface PanState {
  x: number
  y: number
}

export interface UsePanResult {
  pan: PanState
  setPan: (x: number, y: number) => void
  panBy: (deltaX: number, deltaY: number) => void
  resetPan: () => void
}

export const usePan = (initialX = 0, initialY = 0): UsePanResult => {
  const [pan, setPanState] = useState<PanState>({ x: initialX, y: initialY })

  const setPan = useCallback((x: number, y: number) => {
    setPanState({ x, y })
  }, [])

  const panBy = useCallback((deltaX: number, deltaY: number) => {
    setPanState((current) => ({ x: current.x + deltaX, y: current.y + deltaY }))
  }, [])

  const resetPan = useCallback(() => setPanState({ x: initialX, y: initialY }), [initialX, initialY])

  return { pan, setPan, panBy, resetPan }
}
