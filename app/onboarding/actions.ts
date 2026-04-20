'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createWorkspace(name: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const slug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name, slug })
    .select()
    .single()

  if (wsError || !workspace) {
    return { error: 'Erro ao criar workspace: ' + (wsError?.message ?? 'tente novamente') }
  }

  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'gestor' })

  if (memberError) {
    return { error: 'Erro ao configurar seu acesso: ' + memberError.message }
  }

  redirect('/dashboard')
}
