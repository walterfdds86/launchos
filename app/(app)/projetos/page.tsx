import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { ProjectCard } from '@/components/dashboard/ProjectCard'
import { Button } from '@/components/ui/button'
import type { Project, Phase } from '@/types'

export default async function ProjetosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/onboarding')

  const { data: projects } = await supabase
    .from('projects')
    .select('*, phases:launch_phases(*, tasks(id, status))')
    .eq('workspace_id', membership.workspace_id)
    .order('launch_date')

  return (
    <>
      <Topbar title="Projetos" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-zinc-500">{projects?.length ?? 0} projetos</p>
          {membership.role === 'gestor' && (
            <Link href="/projetos/novo">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700">
                + Novo Projeto
              </Button>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(projects ?? []).map((p) => (
            <ProjectCard key={p.id} project={p as Project & { phases: (Phase & { tasks: { status: string }[] })[] }} />
          ))}
          {!projects?.length && (
            <p className="text-sm text-zinc-600 col-span-2">Nenhum projeto criado ainda.</p>
          )}
        </div>
      </div>
    </>
  )
}
