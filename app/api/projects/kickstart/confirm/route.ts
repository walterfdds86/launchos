import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { KickstartPlan } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan, workspace_id }: { plan: KickstartPlan; workspace_id: string } = await req.json()
  if (!plan || !workspace_id) {
    return NextResponse.json({ error: 'plan and workspace_id are required' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'gestor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Create project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      workspace_id,
      name: plan.name,
      type: plan.type,
      launch_date: plan.launch_date,
      status: 'ativo',
      created_by: user.id,
    })
    .select()
    .single()

  if (projectError || !project) {
    return NextResponse.json({ error: 'Failed to create project: ' + projectError?.message }, { status: 500 })
  }

  // Create phases and tasks in sequence
  for (const phaseData of plan.phases) {
    const { data: phase, error: phaseError } = await supabase
      .from('launch_phases')
      .insert({
        project_id: project.id,
        name: phaseData.name,
        order: phaseData.order,
        start_date: phaseData.start_date,
        end_date: phaseData.end_date,
        objective: phaseData.objective,
      })
      .select()
      .single()

    if (phaseError || !phase) {
      return NextResponse.json({ error: 'Failed to create phase: ' + phaseError?.message }, { status: 500 })
    }

    if (phaseData.tasks.length > 0) {
      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(
          phaseData.tasks.map((t) => ({
            phase_id: phase.id,
            project_id: project.id,
            workspace_id,
            title: t.title,
            type: t.type,
            due_date: t.due_date,
            priority: t.priority,
            status: 'a_fazer',
            created_by: user.id,
            depends_on: [],
          }))
        )

      if (tasksError) {
        return NextResponse.json({ error: 'Failed to create tasks: ' + tasksError.message }, { status: 500 })
      }
    }
  }

  return NextResponse.json({ project_id: project.id })
}
