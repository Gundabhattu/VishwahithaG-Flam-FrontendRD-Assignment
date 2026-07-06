import { CircleEllipsis } from 'lucide-react'
import { ToolButton } from '@/components/toolbar/ToolButton'

interface EllipseToolButtonProps {
  active?: boolean
  onClick: () => void
}

export const EllipseToolButton = ({ active, onClick }: EllipseToolButtonProps) => (
  <ToolButton icon={<CircleEllipsis size={16} />} label="Ellipse" active={active} onClick={onClick} />
)
