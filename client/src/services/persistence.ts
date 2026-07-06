import type { CanvasObject } from '@/types'
import type { CanvasDocument } from '@/lib/canvas/exporters'

export const getAutosaveKey = (roomId: string) => `flam-canvas:${roomId}:autosave`

export const saveRoomLocally = (roomId: string, objects: CanvasObject[]) => {
  if (!roomId) {
    return
  }
  const document: CanvasDocument = { version: 1, exportedAt: new Date().toISOString(), objects }
  window.localStorage.setItem(getAutosaveKey(roomId), JSON.stringify(document))
}

export const loadRoomLocally = (roomId: string): CanvasObject[] | null => {
  const saved = window.localStorage.getItem(getAutosaveKey(roomId))
  if (!saved) {
    return null
  }
  try {
    const parsed = JSON.parse(saved) as Partial<CanvasDocument>
    return Array.isArray(parsed.objects) ? parsed.objects : null
  } catch {
    return null
  }
}
