import { create } from 'zustand'
import type { CanvasObject } from '@/types'

interface HistoryState {
  undoStack: CanvasObject[][]
  redoStack: CanvasObject[][]
  pushSnapshot: (snapshot: CanvasObject[]) => void
  undo: (currentSnapshot: CanvasObject[]) => CanvasObject[]
  redo: (currentSnapshot: CanvasObject[]) => CanvasObject[]
  clear: () => void
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  pushSnapshot: (snapshot) => {
    set((state) => ({ undoStack: [...state.undoStack, snapshot], redoStack: [] }))
  },
  undo: (currentSnapshot) => {
    const previous = get().undoStack.at(-1)
    if (!previous) {
      return currentSnapshot
    }

    const nextUndoStack = get().undoStack.slice(0, -1)
    set((state) => ({ undoStack: nextUndoStack, redoStack: [...state.redoStack, currentSnapshot] }))
    return previous
  },
  redo: (currentSnapshot) => {
    const next = get().redoStack.at(-1)
    if (!next) {
      return currentSnapshot
    }

    const nextRedoStack = get().redoStack.slice(0, -1)
    set((state) => ({ redoStack: nextRedoStack, undoStack: [...state.undoStack, currentSnapshot] }))
    return next
  },
  clear: () => set({ undoStack: [], redoStack: [] }),
}))
