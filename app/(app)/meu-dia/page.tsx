import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { TaskCard } from '@/components/tasks/TaskCard'
import { computePriority } from '@/lib/utils/priority'
import type { Task } from '@/types'
import { updateTaskStatus } from './actions'

export default async function MeuDiaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')

  const [{ data: rawMyTasks }, { data: rawAllTasks }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, assignee:profiles!assigned_to(full_name, email)')
      .eq('workspace_id', membership.workspace_id)
      .eq('assigned_to', user.id)
      .neq('status', 'aprovado')
      .neq('status', 'concluido')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('tasks')
      .select('id, status, depends_on, due_date, assigned_to')
      .eq('workspace_id', membership.workspace_id)
      .neq('status', 'aprovado')
      .neq('status', 'concluido'),
  ])

  const allWorkspaceTasks = (rawAllTasks ?? []) as Task[]
  const myTasks = (rawMyTasks ?? []).map((t) => ({
    ...t,
    priority: computePriority(t as Task, allWorkspaceTasks),
  }))

  const priorityOrder: Record<string, number> = { urgente: 0, bloqueada: 1, atencao: 2, normal: 3 }
  const sorted = [...myTasks].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  )

  const actionable = sorted.filter((t) => t.priority !== 'bloqueada')
  const topTask = actionable[0]
  const rest = actionable.slice(1, 6)

  const today = new Date().toISOString().split('T')[0]
  const { data: focus } = await supabase
    .from('daily_focus')
    .select('ai_message')
    .eq('user_id', user.id)
    .eq('workspace_id', membership.workspace_id)
    .eq('date', today)
    .single()

  return (
    <>
      <Topbar title="Meu Dia" />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-6">

        {focus?.ai_message && (
          <div className="bg-violet-950/30 border border-violet-800/30 rounded-xl p-4">
            <p className="text-xs text-violet-400 font-semibold mb-1">🤖 Foco do dia (IA)</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{focus.ai_message}</p>
          </div>
        )}

        {topTask && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Faça agora</p>
            <TaskCard task={topTask} highlight onStatusChange={updateTaskStatus} />
          </div>
        )}

        {rest.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Em seguida</p>
            <div className="space-y-2">
              {rest.map((t) => (
                <TaskCard key={t.id} task={t} onStatusChange={updateTaskStatus} />
              ))}
            </div>
          </div>
        )}

        {(() => {
          const blocked = sorted.filter((t) => t.priority === 'bloqueada')
          if (blocked.length === 0) return null
          return (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Aguardando desbloqueio</p>
              <div className="space-y-2">
                {blocked.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            </div>
          )
        })()}

        {sorted.length === 0 && (
          <div className="text-center py-16">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-sm text-zinc-400">Nenhuma tarefa pendente para hoje.</p>
          </div>
        )}
      </div>
    </>
  )
}
