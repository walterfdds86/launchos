import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai/client'
import { SYSTEM_PROMPT, kickstartPrompt } from '@/lib/ai/prompts'
import { addDays, format, parseISO } from 'date-fns'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { launchId, launchName, launchType, launchDate, workspaceId } = await req.json()

  if (!launchId || !launchName || !launchType || !launchDate || !workspaceId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: kickstartPrompt(launchName, launchType, launchDate),
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return NextResponse.json({ error: 'AI response invalid' }, { status: 500 })

  let plan: { phases: Array<{ name: string; objective: string; tasks: Array<{ title: string; type: string; days_offset: number; description: string }> }> }
  try {
    plan = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'AI response parse failed' }, { status: 500 })
  }

  const launchDateObj = parseISO(launchDate)
  const createdPhases = []

  for (let i = 0; i < plan.phases.length; i++) {
    const phaseData = plan.phases[i]
    const { data: phase } = await supabase
      .from('launch_phases')
      .insert({
        launch_id: launchId,
        name: phaseData.name,
        order: i + 1,
        objective: phaseData.objective,
      })
      .select()
      .single()

    if (!phase) continue

    const taskInserts = phaseData.tasks.map((t) => ({
      phase_id: phase.id,
      launch_id: launchId,
      workspace_id: workspaceId,
      title: t.title,
      description: t.description,
      type: t.type,
      due_date: format(addDays(launchDateObj, t.days_offset), 'yyyy-MM-dd'),
      created_by: user.id,
    }))

    await supabase.from('tasks').insert(taskInserts)
    createdPhases.push(phase)
  }

  return NextResponse.json({ phases: createdPhases })
}
