import { useCallback, useState } from 'react'

export interface UseZoomResult {
  zoom: number
  setZoom: (nextZoom: number) => void
  zoomBy: (delta: number) => void
  resetZoom: () => void
}

const MIN_ZOOM = 0.35
const MAX_ZOOM = 3.2

export const useZoom = (initialZoom = 1): UseZoomResult => {
  const [zoom, setZoomState] = useState(initialZoom)

  const setZoom = useCallback((nextZoom: number) => {
    setZoomState(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom)))
  }, [])

  const zoomBy = useCallback((delta: number) => {
    setZoomState((current) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta)))
  }, [])

  const resetZoom = useCallback(() => setZoomState(initialZoom), [initialZoom])

  return { zoom, setZoom, zoomBy, resetZoom }
}
