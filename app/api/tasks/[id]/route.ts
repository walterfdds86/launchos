import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { computePriority } from '@/lib/utils/priority'
import type { Task } from '@/types'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:profiles!assigned_to(full_name, email),
      checklist:checklist_items(*),
      comments:task_comments(*, user:profiles(full_name, email))
    `)
    .eq('id', id)
    .single()

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500
    return NextResponse.json({ error: error.message }, { status })
  }
  return NextResponse.json(data)
}

const PATCHABLE_FIELDS = ['title', 'description', 'status', 'assigned_to', 'due_date', 'depends_on', 'type']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  // Allowlist fields to prevent mass-assignment
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => PATCHABLE_FIELDS.includes(k))
  )

  // Enforce WIP limit on status transitions
  if (patch.status === 'em_andamento') {
    // Get current task to find assignee
    const { data: currentTask } = await supabase
      .from('tasks')
      .select('assigned_to, workspace_id')
      .eq('id', id)
      .single()

    const assigneeId = patch.assigned_to ?? currentTask?.assigned_to
    const workspaceId = currentTask?.workspace_id

    if (assigneeId && workspaceId) {
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', assigneeId)
        .eq('workspace_id', workspaceId)
        .eq('status', 'em_andamento')
        .neq('id', id) // exclude the task being updated

      if ((count ?? 0) >= 3) {
        return NextResponse.json(
          { error: 'WIP limit atingido: esse membro já tem 3 tarefas em andamento.' },
          { status: 422 }
        )
      }
    }
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
