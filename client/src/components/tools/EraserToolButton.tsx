import { Eraser } from 'lucide-react'
import { ToolButton } from '@/components/toolbar/ToolButton'

interface EraserToolButtonProps {
  active?: boolean
  onClick: () => void
}

export const EraserToolButton = ({ active, onClick }: EraserToolButtonProps) => (
  <ToolButton icon={<Eraser size={16} />} label="Eraser" active={active} onClick={onClick} />
)
