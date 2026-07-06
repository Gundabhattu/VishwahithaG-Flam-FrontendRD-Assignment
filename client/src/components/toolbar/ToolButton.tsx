import type { ReactNode } from 'react'

interface ToolButtonProps {
  icon: ReactNode
  label: string
  active?: boolean
  onClick: () => void
}

export const ToolButton = ({ icon, label, active, onClick }: ToolButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${
        active
          ? 'border-violet-400/40 bg-violet-500/15 text-violet-200 shadow-lg shadow-violet-950/30'
          : 'border-white/10 bg-slate-950/70 text-slate-300 hover:bg-white/10'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}
