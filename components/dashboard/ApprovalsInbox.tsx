'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Approval } from '@/types'

const typeIcon: Record<string, string> = {
  copy: '📝',
  design: '🎨',
  trafego: '📊',
  estrategia: '🎯',
  outro: '📋',
}

export function ApprovalsInbox({ approvals, onAction }: {
  approvals: Approval[]
  onAction: (id: string, taskId: string, action: 'aprovar' | 'revisar', feedback?: string) => void
}) {
  const [loading, setLoading] = useState<string | null>(null)

  async function handle(approval: Approval, action: 'aprovar' | 'revisar') {
    setLoading(approval.id)
    try {
      await onAction(approval.id, approval.task_id, action)
    } finally {
      setLoading(null)
    }
  }

  if (approvals.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600 text-sm">
        Nenhuma aprovação pendente. 🎉
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {approvals.map((a) => (
        <div key={a.id} className="bg-[#17171f] border border-white/5 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-lg shrink-0">
            {typeIcon[a.task?.type ?? 'outro']}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{a.task?.title ?? '(tarefa removida)'}</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              <strong className="text-zinc-400">{a.requester?.full_name ?? a.requester?.email}</strong>
              {' · '}
              {formatDistanceToNow(parseISO(a.created_at), { locale: ptBR, addSuffix: true })}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handle(a, 'aprovar')}
              disabled={loading === a.id}
              className="border-emerald-800 text-emerald-400 hover:bg-emerald-950 text-xs"
            >
              ✓ Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handle(a, 'revisar')}
              disabled={loading === a.id}
              className="border-white/10 text-zinc-400 text-xs"
            >
              Revisar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
