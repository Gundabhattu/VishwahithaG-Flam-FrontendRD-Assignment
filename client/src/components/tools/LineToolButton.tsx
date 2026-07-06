import { Minus } from 'lucide-react'
import { ToolButton } from '@/components/toolbar/ToolButton'

interface LineToolButtonProps {
  active?: boolean
  onClick: () => void
}

export const LineToolButton = ({ active, onClick }: LineToolButtonProps) => (
  <ToolButton icon={<Minus size={16} />} label="Line" active={active} onClick={onClick} />
)
