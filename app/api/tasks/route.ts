import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { computePriority } from '@/lib/utils/priority'
import type { Task } from '@/types'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const phaseId = searchParams.get('phase_id')
  const assignedTo = searchParams.get('assigned_to')
  const workspaceId = searchParams.get('workspace_id')

  let query = supabase
    .from('tasks')
    .select('*, assignee:profiles!assigned_to(full_name, email), checklist:checklist_items(*)')
    .order('created_at', { ascending: true })

  if (phaseId) query = query.eq('phase_id', phaseId)
  if (assignedTo) query = query.eq('assigned_to', assignedTo)
  if (workspaceId) query = query.eq('workspace_id', workspaceId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tasks = data as Task[]
  const withPriority = tasks.map((t) => ({
    ...t,
    priority: computePriority(t, tasks),
  }))

  return NextResponse.json(withPriority)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Enforce WIP limit: max 3 in_progress tasks per assignee
  if (body.assigned_to && body.status === 'em_andamento') {
    if (!body.workspace_id) {
      return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
    }
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', body.assigned_to)
      .eq('workspace_id', body.workspace_id)
      .eq('status', 'em_andamento')

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'WIP limit atingido: esse membro já tem 3 tarefas em andamento.' },
        { status: 422 }
      )
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...body, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
