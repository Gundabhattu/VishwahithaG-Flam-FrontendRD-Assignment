import { Square } from 'lucide-react'
import { ToolButton } from '@/components/toolbar/ToolButton'

interface RectangleToolButtonProps {
  active?: boolean
  onClick: () => void
}

export const RectangleToolButton = ({ active, onClick }: RectangleToolButtonProps) => (
  <ToolButton icon={<Square size={16} />} label="Rect" active={active} onClick={onClick} />
)
