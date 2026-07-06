import { Pencil } from 'lucide-react'
import { ToolButton } from '@/components/toolbar/ToolButton'

interface PencilToolButtonProps {
  active?: boolean
  onClick: () => void
}

export const PencilToolButton = ({ active, onClick }: PencilToolButtonProps) => (
  <ToolButton icon={<Pencil size={16} />} label="Pencil" active={active} onClick={onClick} />
)
