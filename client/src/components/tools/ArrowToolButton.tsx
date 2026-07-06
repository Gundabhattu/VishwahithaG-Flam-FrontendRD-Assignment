import { ArrowRight } from 'lucide-react'
import { ToolButton } from '@/components/toolbar/ToolButton'

interface ArrowToolButtonProps {
  active?: boolean
  onClick: () => void
}

export const ArrowToolButton = ({ active, onClick }: ArrowToolButtonProps) => (
  <ToolButton icon={<ArrowRight size={16} />} label="Arrow" active={active} onClick={onClick} />
)
