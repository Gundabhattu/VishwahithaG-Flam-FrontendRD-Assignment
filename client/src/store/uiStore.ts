import { create } from 'zustand'
import type { DashStyle, ToolType } from '@/types'

interface UIState {
  theme: 'dark' | 'light'
  activeTool: ToolType
  strokeColor: string
  fillColor: string
  strokeWidth: number
  opacity: number
  dashStyle: DashStyle
  showGrid: boolean
  snapToGrid: boolean
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
  setActiveTool: (tool: ToolType) => void
  setStrokeColor: (color: string) => void
  setFillColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setOpacity: (opacity: number) => void
  setDashStyle: (dashStyle: DashStyle) => void
  toggleGrid: () => void
  toggleSnap: () => void
  resetTooling: () => void
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  activeTool: 'select',
  strokeColor: '#8b5cf6',
  fillColor: '#ffffff',
  strokeWidth: 3,
  opacity: 1,
  dashStyle: 'solid',
  showGrid: true,
  snapToGrid: false,
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setActiveTool: (activeTool) => set({ activeTool }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setOpacity: (opacity) => set({ opacity }),
  setDashStyle: (dashStyle) => set({ dashStyle }),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleSnap: () => set((state) => ({ snapToGrid: !state.snapToGrid })),
  resetTooling: () => set({ activeTool: 'select' }),
}))
