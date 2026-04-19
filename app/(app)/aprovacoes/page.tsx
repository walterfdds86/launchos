'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Topbar } from '@/components/layout/Topbar'
import { ApprovalsInbox } from '@/components/dashboard/ApprovalsInbox'
import type { Approval } from '@/types'

export default function AprovacoesPage() {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', user.id)
        .single()
      if (membership?.role !== 'gestor') router.replace('/meu-dia')
    }
    checkRole()
  }, [router])

  const fetchApprovals = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('approvals')
      .select(`
        *,
        task:tasks(*, phase:launch_phases(name, launch:launches(name))),
        requester:profiles!requested_by(full_name, email)
      `)
      .eq('status', 'pendente')
      .order('created_at', { ascending: true })

    setApprovals((data ?? []) as Approval[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchApprovals() }, [fetchApprovals])

  async function handleAction(
    _approvalId: string,
    taskId: string,
    action: 'aprovar' | 'revisar',
    feedback?: string
  ) {
    setError(null)
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, feedback }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Erro ao processar aprovação')
        return
      }
      await fetchApprovals()
    } catch {
      setError('Erro de conexão')
    }
  }

  return (
    <>
      <Topbar title="Aprovações" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <p className="text-xs text-zinc-500 mb-4">
            {approvals.length} item{approvals.length !== 1 ? 's' : ''} aguardando sua revisão
          </p>
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          {loading ? (
            <p className="text-sm text-zinc-600">Carregando...</p>
          ) : (
            <ApprovalsInbox approvals={approvals} onAction={handleAction} />
          )}
        </div>
      </div>
    </>
  )
}
