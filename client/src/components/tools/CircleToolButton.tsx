import { Circle } from 'lucide-react'
import { ToolButton } from '@/components/toolbar/ToolButton'

interface CircleToolButtonProps {
  active?: boolean
  onClick: () => void
}

export const CircleToolButton = ({ active, onClick }: CircleToolButtonProps) => (
  <ToolButton icon={<Circle size={16} />} label="Circle" active={active} onClick={onClick} />
)
