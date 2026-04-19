import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai/client'
import { SYSTEM_PROMPT, suggestAssigneePrompt } from '@/lib/ai/prompts'
import { buildMemberContext } from '@/lib/ai/context-builder'
import type { Task, WorkspaceMember } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { taskTitle, taskType, workspaceId } = await req.json()
  if (!taskTitle || !taskType || !workspaceId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: members } = await supabase
    .from('workspace_members')
    .select('*, user:profiles(full_name, email)')
    .eq('workspace_id', workspaceId)
    .in('role', ['copy', 'designer', 'trafego'])

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'em_andamento')

  const membersContext = (members ?? [])
    .map((m) => {
      const memberTasks = (tasks ?? [] as Task[]).filter((t) => t.assigned_to === m.user_id)
      return buildMemberContext(m as WorkspaceMember, memberTasks as Task[])
    })
    .join('\n\n---\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: suggestAssigneePrompt(taskTitle, taskType, membersContext) }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  let suggestion = {}
  if (jsonMatch) {
    try { suggestion = JSON.parse(jsonMatch[0]) } catch { /* malformed AI response — return empty */ }
  }

  return NextResponse.json(suggestion)
}
