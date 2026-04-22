import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { differenceInDays, parseISO } from 'date-fns'
import type { Phase, Task } from '@/types'

export default async function KanbanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/onboarding')

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', membership.workspace_id)
    .single()

  if (!project) notFound()

  const { data: phases } = await supabase
    .from('launch_phases')
    .select('*, tasks(*, assignee:profiles!assigned_to(full_name, email))')
    .eq('project_id', id)
    .order('order')

  const daysToLaunch = differenceInDays(parseISO(project.launch_date), new Date())

  return (
    <>
      <Topbar title={project.name} />
      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard
          phases={(phases ?? []) as (Phase & { tasks: Task[] })[]}
          projectName={project.name}
          daysToLaunch={daysToLaunch}
        />
      </div>
    </>
  )
}
