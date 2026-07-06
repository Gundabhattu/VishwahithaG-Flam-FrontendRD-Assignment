import { create } from 'zustand'

interface SelectionState {
  selectedObjectId: string | null
  setSelectedObjectId: (id: string | null) => void
  clearSelection: () => void
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectedObjectId: null,
  setSelectedObjectId: (selectedObjectId) => set({ selectedObjectId }),
  clearSelection: () => set({ selectedObjectId: null }),
}))
