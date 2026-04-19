import { differenceInHours, isPast, parseISO } from 'date-fns'
import type { Task, TaskPriority } from '@/types'

export function computePriority(task: Task, allTasks: Task[]): TaskPriority {
  // Bloqueada: has unfinished dependencies
  if (task.depends_on?.length > 0) {
    const blockers = allTasks.filter(
      (t) =>
        task.depends_on.includes(t.id) &&
        !['aprovado', 'concluido'].includes(t.status)
    )
    if (blockers.length > 0) return 'bloqueada'
  }

  if (!task.due_date) return 'normal'

  const due = parseISO(task.due_date)

  if (isPast(due)) return 'urgente'

  const hoursUntilDue = differenceInHours(due, new Date())
  if (hoursUntilDue <= 48) return 'atencao'

  return 'normal'
}
