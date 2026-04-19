import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { LaunchCard } from '@/components/dashboard/LaunchCard'
import { AlertsList } from '@/components/dashboard/AlertsList'
import { computePriority } from '@/lib/utils/priority'
import type { Task } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/onboarding')
  if (membership.role !== 'gestor') redirect('/meu-dia')

  const workspaceId = membership.workspace_id

  const [{ data: launches }, { data: allTasks }] = await Promise.all([
    supabase
      .from('launches')
      .select('*, phases:launch_phases(*, tasks(status))')
      .eq('workspace_id', workspaceId)
      .eq('status', 'ativo')
      .order('launch_date'),
    supabase
      .from('tasks')
      .select('*, assignee:profiles!assigned_to(full_name, email)')
      .eq('workspace_id', workspaceId)
      .not('status', 'in', ['aprovado', 'concluido']),
  ])

  const tasks = (allTasks ?? []) as Task[]
  const tasksWithPriority = tasks.map((t) => ({
    ...t,
    priority: computePriority(t, tasks),
  }))

  const pendingApprovals = tasks.length === 0
    ? 0
    : await supabase
        .from('approvals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')
        .in('task_id', tasks.map((t) => t.id))
        .then(({ count }) => count)

  const overdueCount = tasksWithPriority.filter((t) => ['urgente', 'bloqueada'].includes(t.priority)).length
  const completedThisWeek = 0

  const stats = [
    { label: 'Lançamentos Ativos', value: launches?.length ?? 0, sub: 'workspaces ativo', variant: 'default' as const },
    { label: 'Tarefas Atrasadas', value: overdueCount, sub: 'urgente ou bloqueada', variant: overdueCount > 0 ? 'red' as const : 'default' as const },
    { label: 'Aguardando Aprovação', value: pendingApprovals ?? 0, sub: 'no seu inbox', variant: (pendingApprovals ?? 0) > 0 ? 'amber' as const : 'default' as const },
    { label: 'Concluídas (semana)', value: completedThisWeek, sub: '↑ em breve', variant: 'green' as const },
  ]

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <StatsRow stats={stats} />

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-300">Lançamentos Ativos</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(launches ?? []).map((launch) => (
              <LaunchCard key={launch.id} launch={launch as any} />
            ))}
            {!launches?.length && (
              <p className="text-sm text-zinc-600 col-span-2">Nenhum lançamento ativo.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Aprovações Pendentes</h2>
            <p className="text-xs text-zinc-600">Ver em <a href="/aprovacoes" className="text-violet-400 underline">Central de Aprovações →</a></p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Alertas</h2>
            <AlertsList tasks={tasksWithPriority} />
          </div>
        </div>
      </div>
    </>
  )
}
