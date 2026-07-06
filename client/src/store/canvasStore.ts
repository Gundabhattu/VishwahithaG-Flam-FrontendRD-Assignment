import { create } from 'zustand'
import type { CanvasObject } from '@/types'

interface CanvasState {
  objects: CanvasObject[]
  addObject: (object: CanvasObject) => void
  addObjects: (objects: CanvasObject[]) => void
  upsertObject: (object: CanvasObject) => void
  updateObject: (id: string, updater: (object: CanvasObject) => CanvasObject) => void
  deleteObject: (id: string) => void
  bringForward: (id: string) => void
  sendBackward: (id: string) => void
  replaceObjects: (objects: CanvasObject[]) => void
  clearObjects: () => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  objects: [],
  addObject: (object) => set((state) => ({ objects: state.objects.some((candidate) => candidate.id === object.id) ? state.objects : [...state.objects, object] })),
  addObjects: (objects) => set((state) => ({ objects: [...state.objects, ...objects.filter((object) => !state.objects.some((candidate) => candidate.id === object.id))] })),
  upsertObject: (object) =>
    set((state) => ({
      objects: state.objects.some((candidate) => candidate.id === object.id) ? state.objects.map((candidate) => (candidate.id === object.id ? object : candidate)) : [...state.objects, object],
    })),
  updateObject: (id, updater) =>
    set((state) => ({ objects: state.objects.map((object) => (object.id === id ? updater(object) : object)) })),
  deleteObject: (id) => set((state) => ({ objects: state.objects.filter((object) => object.id !== id) })),
  bringForward: (id) =>
    set((state) => {
      const index = state.objects.findIndex((object) => object.id === id)
      if (index < 0 || index === state.objects.length - 1) {
        return state
      }
      const objects = [...state.objects]
      ;[objects[index], objects[index + 1]] = [objects[index + 1], objects[index]]
      return { objects }
    }),
  sendBackward: (id) =>
    set((state) => {
      const index = state.objects.findIndex((object) => object.id === id)
      if (index <= 0) {
        return state
      }
      const objects = [...state.objects]
      ;[objects[index - 1], objects[index]] = [objects[index], objects[index - 1]]
      return { objects }
    }),
  replaceObjects: (objects) => set({ objects }),
  clearObjects: () => set({ objects: [] }),
}))
