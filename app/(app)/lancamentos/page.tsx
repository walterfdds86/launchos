import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { LaunchCard } from '@/components/dashboard/LaunchCard'
import { Button } from '@/components/ui/button'

export default async function LancamentosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/login')

  const { data: launches } = await supabase
    .from('launches')
    .select('*, phases:launch_phases(*, tasks(id, status))')
    .eq('workspace_id', membership.workspace_id)
    .order('launch_date')

  return (
    <>
      <Topbar title="Lançamentos" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-zinc-500">{launches?.length ?? 0} lançamentos</p>
          {membership.role === 'gestor' && (
            <Link href="/lancamentos/novo">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                + Novo Lançamento
              </Button>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(launches ?? []).map((l) => (
            <LaunchCard key={l.id} launch={l as any} />
          ))}
          {!launches?.length && (
            <p className="text-sm text-zinc-600 col-span-2">Nenhum lançamento criado ainda.</p>
          )}
        </div>
      </div>
    </>
  )
}
