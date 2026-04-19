'use client'
import { TaskStatusBadge } from './TaskStatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  onStatusChange?: (taskId: string, newStatus: Task['status']) => void | Promise<void>
  highlight?: boolean
}

const nextStatus: Partial<Record<Task['status'], Task['status']>> = {
  a_fazer: 'em_andamento',
  em_andamento: 'aguardando_aprovacao',
}

export function TaskCard({ task, onStatusChange, highlight }: TaskCardProps) {
  return (
    <div
      className={`bg-[#17171f] border rounded-xl p-4 space-y-3 ${
        highlight ? 'border-violet-500/40' : 'border-white/5'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium ${highlight ? 'text-white' : 'text-zinc-200'}`}>
          {task.title}
        </p>
        <PriorityBadge priority={task.priority} />
      </div>

      {task.description && (
        <p className="text-xs text-zinc-500 leading-relaxed">{task.description}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <TaskStatusBadge status={task.status} />
        <div className="flex items-center gap-3">
          {task.due_date && (
            <span className="text-[10px] text-zinc-600">
              {format(parseISO(task.due_date), "dd MMM", { locale: ptBR })}
            </span>
          )}
          {onStatusChange && nextStatus[task.status] && (
            <button
              onClick={() => onStatusChange(task.id, nextStatus[task.status]!)}
              className="text-[11px] text-violet-400 hover:text-violet-300 font-medium"
            >
              {task.status === 'a_fazer' ? 'Iniciar →' : 'Enviar para aprovação →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
