'use client'
import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '@/types'
import { format, parseISO, isPast } from 'date-fns'

const ROLE_BORDER: Record<string, string> = {
  copy: 'border-l-blue-500',
  design: 'border-l-pink-500',
  trafego: 'border-l-amber-500',
  estrategia: 'border-l-emerald-500',
  outro: 'border-l-zinc-600',
  urgente: 'border-l-red-500',
}

const ROLE_TAG: Record<string, string> = {
  copy: 'bg-blue-950 text-blue-400',
  design: 'bg-pink-950 text-pink-400',
  trafego: 'bg-amber-950 text-amber-400',
  estrategia: 'bg-emerald-950 text-emerald-400',
  outro: 'bg-zinc-800 text-zinc-400',
}

interface KanbanCardProps {
  task: Task
  onBriefingRequest: (task: Task) => void
}

export function KanbanCard({ task, onBriefingRequest }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const borderClass = task.priority === 'urgente'
    ? ROLE_BORDER.urgente
    : ROLE_BORDER[task.type] ?? ROLE_BORDER.outro

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isLate = task.due_date && isPast(parseISO(task.due_date)) && !['aprovado', 'concluido'].includes(task.status)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-[#1a1a2e] rounded-lg p-3 mb-2 border-l-[3px] ${borderClass} relative select-none cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-zinc-200 font-medium leading-snug flex-1">{task.title}</p>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
          className="text-zinc-600 hover:text-zinc-400 text-base leading-none mt-0.5 flex-shrink-0"
          onPointerDown={(e) => e.stopPropagation()}
        >
          ···
        </button>
      </div>

      {menuOpen && (
        <div
          className="absolute right-2 top-8 z-20 bg-[#0f0f13] border border-white/10 rounded-lg py-1 shadow-xl min-w-[160px]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onBriefingRequest(task) }}
          >
            🤖 Gerar Briefing IA
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${ROLE_TAG[task.type] ?? ROLE_TAG.outro}`}>
          {task.type}
        </span>
        {task.due_date && (
          <span className={`text-[10px] ${isLate ? 'text-red-400' : 'text-zinc-500'}`}>
            {isLate ? '⚠ ' : ''}{format(parseISO(task.due_date), 'dd/MM')}
          </span>
        )}
        {task.assignee && (
          <span className="ml-auto w-5 h-5 rounded-full bg-violet-950 text-violet-400 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
            {(task.assignee.full_name ?? task.assignee.email)[0].toUpperCase()}
          </span>
        )}
      </div>

      {task.status === 'em_andamento' && task.description && (
        <div className="mt-2 h-1 bg-zinc-800 rounded-full">
          <div className="h-1 bg-violet-600 rounded-full w-2/5" />
        </div>
      )}
    </div>
  )
}
