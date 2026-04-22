'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import type { KickstartPlan } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const TYPE_LABELS: Record<string, string> = {
  lancamento: 'Lançamento', perpetuo: 'Perpétuo',
  low_ticket: 'Low Ticket', campanha: 'Campanha', outro: 'Outro',
}

const TASK_TYPE_COLORS: Record<string, string> = {
  copy: 'text-blue-400', design: 'text-pink-400',
  trafego: 'text-amber-400', estrategia: 'text-emerald-400', outro: 'text-zinc-400',
}

interface PlanPreviewProps {
  plan: KickstartPlan
  workspaceId: string
  onBack: () => void
}

export function PlanPreview({ plan, workspaceId, onBack }: PlanPreviewProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalTasks = plan.phases.reduce((acc, p) => acc + p.tasks.length, 0)

  async function handleConfirm() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/projects/kickstart/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, workspace_id: workspaceId }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok || data.error) {
      setError(data.error ?? 'Erro ao criar projeto. Tente novamente.')
      return
    }

    router.push(`/projetos/${data.project_id}/kanban`)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-[#17171f] border border-white/10 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">{plan.name}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {TYPE_LABELS[plan.type]} · Data-chave: {format(parseISO(plan.launch_date), "dd 'de' MMM yyyy", { locale: ptBR })} · {totalTasks} tarefas
            </p>
          </div>
          <span className="text-xs bg-violet-950 text-violet-400 px-2 py-1 rounded-full font-semibold">
            {plan.phases.length} fases
          </span>
        </div>

        <div className="space-y-4">
          {plan.phases.map((phase) => (
            <div key={phase.order} className="border border-white/5 rounded-lg overflow-hidden">
              <div className="bg-white/5 px-4 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">{phase.name}</span>
                <span className="text-xs text-zinc-500">
                  {format(parseISO(phase.start_date), 'dd/MM')} → {format(parseISO(phase.end_date), 'dd/MM')} · {phase.tasks.length} tarefas
                </span>
              </div>
              <div className="divide-y divide-white/5">
                {phase.tasks.map((task, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-zinc-300">{task.title}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${TASK_TYPE_COLORS[task.type]}`}>{task.type}</span>
                      <span className="text-xs text-zinc-500">{format(parseISO(task.due_date), 'dd/MM')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 border-white/10" onClick={onBack} disabled={loading}>
          ← Refazer descrição
        </Button>
        <Button
          className="flex-1 bg-violet-600 hover:bg-violet-700"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? 'Criando projeto...' : '✓ Aprovar e criar projeto →'}
        </Button>
      </div>
    </div>
  )
}
