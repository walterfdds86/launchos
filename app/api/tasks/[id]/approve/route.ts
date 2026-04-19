import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, feedback } = await req.json()
  if (action !== 'aprovar' && action !== 'revisar') {
    return NextResponse.json({ error: 'action must be "aprovar" or "revisar"' }, { status: 400 })
  }

  const newStatus = action === 'aprovar' ? 'aprovado' : 'em_andamento'

  // Sequential updates — short-circuit on first failure
  const taskResult = await supabase
    .from('tasks')
    .update({ status: newStatus })
    .eq('id', id)

  if (taskResult.error) {
    return NextResponse.json({ error: taskResult.error.message }, { status: 500 })
  }

  const approvalResult = await supabase
    .from('approvals')
    .update({
      status: action === 'aprovar' ? 'aprovado' : 'revisao',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      feedback: feedback ?? null,
    })
    .eq('task_id', id)
    .eq('status', 'pendente')

  if (approvalResult.error) {
    return NextResponse.json({ error: approvalResult.error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
