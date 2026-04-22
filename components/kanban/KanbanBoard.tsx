'use client'
import { useState, useTransition } from 'react'
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { Task, TaskStatus, Phase } from '@/types'
import { KanbanColumn } from './KanbanColumn'
import { updateTaskStatus } from '@/app/(app)/projetos/[id]/kanban/actions'

const COLUMNS: TaskStatus[] = ['a_fazer', 'em_andamento', 'em_revisao', 'aguardando_aprovacao', 'concluido']

interface KanbanBoardProps {
  phases: (Phase & { tasks: Task[] })[]
  projectName: string
  daysToLaunch: number
}

export function KanbanBoard({ phases, projectName, daysToLaunch }: KanbanBoardProps) {
  const [activePhaseId, setActivePhaseId] = useState(phases[0]?.id ?? '')
  const [activeFilter, setActiveFilter] = useState<string>('todos')
  const [tasks, setTasks] = useState<Task[]>(phases.flatMap((p) => p.tasks ?? []))
  const [briefingTask, setBriefingTask] = useState<Task | null>(null)
  const [briefingContent, setBriefingContent] = useState<string | null>(null)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [, startTransition] = useTransition()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const phaseTasks = tasks.filter((t) => t.phase_id === activePhaseId)
  const filtered = activeFilter === 'todos' ? phaseTasks : phaseTasks.filter((t) => t.type === activeFilter)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const newStatus = over.data.current?.status as TaskStatus | undefined
    if (!newStatus) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return

    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t))
    startTransition(() => { updateTaskStatus(taskId, newStatus).catch(console.error) })
  }

  async function handleBriefingRequest(task: Task) {
    setBriefingTask(task)
    setBriefingContent(null)
    setBriefingLoading(true)
    const res = await fetch('/api/ai/briefing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_id: task.id, task_title: task.title, task_type: task.type, project_name: projectName }),
    })
    const data = await res.json()
    setBriefingLoading(false)
    setBriefingContent(data.briefing ?? data.error ?? 'Erro ao gerar briefing.')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Phase tabs + countdown */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {phases.map((phase) => (
          <button
            key={phase.id}
            onClick={() => setActivePhaseId(phase.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${activePhaseId === phase.id ? 'bg-violet-950 text-violet-400 border border-violet-700' : 'bg-[#17171f] text-zinc-400 border border-white/5 hover:border-zinc-600'}`}
          >
            {phase.name}
            <span className="ml-1.5 text-[10px] opacity-60">{(phase.tasks ?? []).length}</span>
          </button>
        ))}
        <div className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-950/50 text-emerald-400 border border-emerald-800/30">
          {daysToLaunch > 0 ? `D-${daysToLaunch}` : daysToLaunch === 0 ? 'Hoje!' : `D+${Math.abs(daysToLaunch)}`}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['todos', 'copy', 'design', 'trafego', 'estrategia'].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1 rounded-md text-xs transition-colors ${activeFilter === f ? 'bg-violet-950 text-violet-400' : 'bg-[#17171f] text-zinc-500 hover:text-zinc-300'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-3 flex-1 overflow-x-auto">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={filtered.filter((t) => t.status === status)}
              onBriefingRequest={handleBriefingRequest}
            />
          ))}
        </div>
      </DndContext>

      {/* Briefing modal */}
      {briefingTask && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setBriefingTask(null)}>
          <div className="bg-[#17171f] border border-white/10 rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">🤖 Briefing IA — {briefingTask.title}</h3>
              <button onClick={() => setBriefingTask(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            {briefingLoading ? (
              <p className="text-sm text-zinc-400 animate-pulse">Gerando briefing...</p>
            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{briefingContent}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
