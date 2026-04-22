import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'

export default async function TimePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/onboarding')
  if (membership.role !== 'gestor') redirect('/meu-dia')

  const { data: members } = await supabase
    .from('workspace_members')
    .select('role, joined_at, user:profiles(full_name, email)')
    .eq('workspace_id', membership.workspace_id)

  return (
    <>
      <Topbar title="Time" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-3">
          {(members ?? []).map((m, i) => {
            const profile = m.user as { full_name: string | null; email: string } | null
            const name = profile?.full_name ?? profile?.email ?? '—'
            const initial = name[0].toUpperCase()
            return (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl border"
                style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
              >
                <div className="w-9 h-9 rounded-full bg-violet-950 text-violet-400 text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--app-text)' }}>{name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--app-text-muted)' }}>{profile?.email}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-950/50 text-violet-400 capitalize font-medium">
                  {m.role}
                </span>
              </div>
            )
          })}
          {!members?.length && (
            <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>Nenhum membro ainda.</p>
          )}
        </div>
      </div>
    </>
  )
}
