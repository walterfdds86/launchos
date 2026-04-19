import { cn } from '@/lib/utils'
import type { TaskPriority } from '@/types'

const labels: Record<TaskPriority, string> = {
  normal: 'Normal',
  atencao: 'Atenção',
  urgente: 'Urgente',
  bloqueada: 'Bloqueada',
}

const styles: Record<TaskPriority, string> = {
  normal: 'text-zinc-500',
  atencao: 'text-amber-400',
  urgente: 'text-red-400',
  bloqueada: 'text-orange-400',
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={cn('text-xs font-semibold', styles[priority])}>
      {labels[priority]}
    </span>
  )
}
