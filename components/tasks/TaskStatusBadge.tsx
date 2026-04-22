import { cn } from '@/lib/utils'
import type { TaskStatus } from '@/types'

const labels: Record<TaskStatus, string> = {
  a_fazer: 'A fazer',
  em_andamento: 'Em andamento',
  em_revisao: 'Em revisão',
  aguardando_aprovacao: 'Aguardando aprovação',
  aprovado: 'Aprovado',
  concluido: 'Concluído',
}

const styles: Record<TaskStatus, string> = {
  a_fazer: 'bg-zinc-800 text-zinc-400',
  em_andamento: 'bg-blue-950 text-blue-400',
  em_revisao: 'bg-purple-950 text-purple-400',
  aguardando_aprovacao: 'bg-amber-950 text-amber-400',
  aprovado: 'bg-violet-950 text-violet-400',
  concluido: 'bg-emerald-950 text-emerald-400',
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', styles[status])}>
      {labels[status]}
    </span>
  )
}
