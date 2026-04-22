'use client'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task, TaskStatus } from '@/types'
import { KanbanCard } from './KanbanCard'

const COLUMN_STYLES: Record<TaskStatus, { title: string; titleClass: string }> = {
  a_fazer:               { title: 'A Fazer',            titleClass: 'text-zinc-400' },
  em_andamento:          { title: 'Em Andamento',        titleClass: 'text-blue-400' },
  em_revisao:            { title: 'Em Revisão',          titleClass: 'text-amber-400' },
  aguardando_aprovacao:  { title: 'Aprovação',           titleClass: 'text-violet-400' },
  aprovado:              { title: 'Aprovado',            titleClass: 'text-emerald-300' },
  concluido:             { title: 'Concluído',           titleClass: 'text-emerald-500' },
}

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  onBriefingRequest: (task: Task) => void
}

export function KanbanColumn({ status, tasks, onBriefingRequest }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } })
  const { title, titleClass } = COLUMN_STYLES[status]

  return (
    <div
      ref={setNodeRef}
      className={`bg-[#17171f] rounded-xl p-3 border transition-colors min-h-[400px] ${isOver ? 'border-violet-500/40 bg-violet-950/10' : 'border-white/5'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-bold uppercase tracking-wider ${titleClass}`}>{title}</span>
        <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onBriefingRequest={onBriefingRequest} />
        ))}
      </SortableContext>
    </div>
  )
}
