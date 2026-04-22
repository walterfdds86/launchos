import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspace:workspaces(name, slug)')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/onboarding')

  const workspace = membership.workspace as { name: string; slug: string } | null

  return (
    <>
      <Topbar title="Configurações" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg space-y-6">
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>Workspace</h2>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--app-text-muted)' }}>Nome</p>
              <p className="text-sm font-medium" style={{ color: 'var(--app-text)' }}>{workspace?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--app-text-muted)' }}>Slug</p>
              <p className="text-sm font-mono" style={{ color: 'var(--app-text-muted)' }}>{workspace?.slug ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--app-text-muted)' }}>Seu papel</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-950/50 text-violet-400 capitalize font-medium">
                {membership.role}
              </span>
            </div>
          </div>

          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>Conta</h2>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--app-text-muted)' }}>E-mail</p>
              <p className="text-sm" style={{ color: 'var(--app-text)' }}>{user.email}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
