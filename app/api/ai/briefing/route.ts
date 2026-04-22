import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai/client'
import { SYSTEM_PROMPT, briefingPrompt } from '@/lib/ai/prompts'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { task_id, task_title, task_type, project_name } = await req.json()
  if (!task_title || !task_type || !project_name) {
    return NextResponse.json({ error: 'task_title, task_type, and project_name are required' }, { status: 400 })
  }

  // Fetch project type for context
  let projectDescription = ''
  if (task_id) {
    const { data: task } = await supabase
      .from('tasks')
      .select('description, project_id')
      .eq('id', task_id)
      .single()

    if (task?.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('name, type')
        .eq('id', task.project_id)
        .single()
      if (project) projectDescription = `Tipo: ${project.type}`
    }
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: briefingPrompt(task_title, task_type, project_name, projectDescription),
    }],
  })

  const briefing = message.content[0].type === 'text' ? message.content[0].text : ''

  // Save briefing to task description
  if (task_id) {
    await supabase.from('tasks').update({ description: briefing }).eq('id', task_id)
  }

  return NextResponse.json({ briefing })
}
