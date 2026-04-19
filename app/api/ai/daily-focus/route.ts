import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai/client'
import { SYSTEM_PROMPT, dailyFocusPrompt } from '@/lib/ai/prompts'
import { buildLaunchContext, buildMemberContext } from '@/lib/ai/context-builder'
import { computePriority } from '@/lib/utils/priority'
import type { Task, WorkspaceMember } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, workspaceId } = await req.json()
  if (!userId || !workspaceId) {
    return NextResponse.json({ error: 'Missing userId or workspaceId' }, { status: 400 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('daily_focus')
    .select('*')
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .eq('date', today)
    .single()

  if (existing) return NextResponse.json(existing)

  const [{ data: memberData }, { data: allTasks }, { data: launches }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('*, user:profiles(full_name, email)')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('tasks')
      .select('*, assignee:profiles!assigned_to(full_name, email)')
      .eq('workspace_id', workspaceId)
      .eq('assigned_to', userId)
      .neq('status', 'aprovado')
      .neq('status', 'concluido'),
    supabase
      .from('launches')
      .select('*, phases:launch_phases(*, tasks(*))')
      .eq('workspace_id', workspaceId)
      .eq('status', 'ativo')
      .limit(1)
      .single(),
  ])

  const tasks = (allTasks ?? []) as Task[]
  const tasksWithPriority = tasks.map((t) => ({
    ...t,
    priority: computePriority(t, tasks),
  }))

  const memberCtx = buildMemberContext(memberData as WorkspaceMember, tasksWithPriority)
  const launchCtx = launches
    ? buildLaunchContext(launches as any, (launches as any).phases ?? [])
    : 'Nenhum lançamento ativo.'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: dailyFocusPrompt(memberCtx, launchCtx) }],
  })

  const aiMessage = message.content[0].type === 'text' ? message.content[0].text : ''

  const { data: focus } = await supabase
    .from('daily_focus')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      date: today,
      tasks_json: tasksWithPriority.map((t) => t.id),
      ai_message: aiMessage,
    })
    .select()
    .single()

  return NextResponse.json(focus)
}
