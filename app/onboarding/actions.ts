'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createWorkspace(name: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const slug = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`

  const { data: workspaceId, error } = await supabase
    .rpc('create_workspace_for_user', { p_name: name, p_slug: slug, p_user_id: user.id })

  if (error || !workspaceId) {
    return { error: 'Erro ao criar workspace: ' + (error?.message ?? 'tente novamente') }
  }

  redirect('/dashboard')
}
