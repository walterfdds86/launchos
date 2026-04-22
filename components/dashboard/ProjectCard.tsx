import Link from 'next/link'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Project, Phase } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  lancamento: 'Lançamento',
  perpetuo: 'Perpétuo',
  low_ticket: 'Low Ticket',
  campanha: 'Campanha',
  outro: 'Outro',
}

interface ProjectCardProps {
  project: Project & { phases: (Phase & { tasks: { status: string }[] })[] }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const daysLeft = differenceInDays(parseISO(project.launch_date), new Date())

  const badge = daysLeft < 0
    ? { label: 'Atrasado', cls: 'bg-red-950 text-red-400' }
    : daysLeft <= 7
    ? { label: 'Atenção', cls: 'bg-amber-950 text-amber-400' }
    : { label: 'No prazo', cls: 'bg-emerald-950 text-emerald-400' }

  const allTasks = project.phases?.flatMap((p) => p.tasks ?? []) ?? []
  const done = allTasks.filter((t) => ['aprovado', 'concluido'].includes(t.status)).length
  const total = allTasks.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Link href={`/projetos/${project.id}/kanban`}>
      <div className="bg-[#17171f] border border-white/5 rounded-xl p-4 hover:border-violet-500/20 transition-colors cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-white">{project.name}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {TYPE_LABELS[project.type]} · {format(parseISO(project.launch_date), "dd 'de' MMM yyyy", { locale: ptBR })}
            </p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        <div className="space-y-2">
          {project.phases?.map((phase) => {
            const phaseTotal = phase.tasks?.length ?? 0
            const phaseDone = phase.tasks?.filter((t) => ['aprovado', 'concluido'].includes(t.status)).length ?? 0
            const phasePct = phaseTotal > 0 ? Math.round((phaseDone / phaseTotal) * 100) : 0
            return (
              <div key={phase.id}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] text-zinc-500">{phase.name}</span>
                  <span className="text-[10px] text-zinc-600">{phasePct}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full">
                  <div className="h-1 bg-violet-600 rounded-full transition-all" style={{ width: `${phasePct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">{done}/{total} tarefas</span>
          <span className="text-[10px] font-semibold text-violet-400">{pct}% completo</span>
        </div>
      </div>
    </Link>
  )
}
