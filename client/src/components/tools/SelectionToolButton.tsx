import { MousePointer2 } from 'lucide-react'
import { ToolButton } from '@/components/toolbar/ToolButton'

interface SelectionToolButtonProps {
  active?: boolean
  onClick: () => void
}

export const SelectionToolButton = ({ active, onClick }: SelectionToolButtonProps) => (
  <ToolButton icon={<MousePointer2 size={16} />} label="Select" active={active} onClick={onClick} />
)
