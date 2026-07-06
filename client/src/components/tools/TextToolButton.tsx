import { Type } from 'lucide-react'
import { ToolButton } from '@/components/toolbar/ToolButton'

interface TextToolButtonProps {
  active?: boolean
  onClick: () => void
}

export const TextToolButton = ({ active, onClick }: TextToolButtonProps) => (
  <ToolButton icon={<Type size={16} />} label="Text" active={active} onClick={onClick} />
)
