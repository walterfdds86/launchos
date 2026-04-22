import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/ai/client'
import { SYSTEM_PROMPT, kickstartFromDescriptionPrompt } from '@/lib/ai/prompts'
import { parseKickstartResponse } from '@/lib/ai/kickstart'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description, workspace_id } = await req.json()
  if (!description?.trim() || !workspace_id) {
    return NextResponse.json({ error: 'description and workspace_id are required' }, { status: 400 })
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'gestor') {
    return NextResponse.json({ error: 'Only gestores can create projects' }, { status: 403 })
  }

  const today = new Date().toISOString().split('T')[0]

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: kickstartFromDescriptionPrompt(description, today) }],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const plan = parseKickstartResponse(rawText)
    return NextResponse.json({ plan })
  } catch (err) {
    console.error('[kickstart] parse error:', rawText)
    return NextResponse.json({ error: 'AI returned invalid plan. Please try again.' }, { status: 500 })
  }
}
