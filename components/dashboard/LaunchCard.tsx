import Link from 'next/link'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Launch, Phase } from '@/types'

interface LaunchCardProps {
  launch: Launch & { phases: (Phase & { tasks: { status: string }[] })[] }
}

export function LaunchCard({ launch }: LaunchCardProps) {
  const daysLeft = differenceInDays(parseISO(launch.launch_date), new Date())

  const badge = daysLeft < 0
    ? { label: 'Atrasado', cls: 'bg-red-950 text-red-400' }
    : daysLeft <= 7
    ? { label: 'Atenção', cls: 'bg-amber-950 text-amber-400' }
    : { label: 'No prazo', cls: 'bg-emerald-950 text-emerald-400' }

  return (
    <Link href={`/lancamentos/${launch.id}`}>
      <div className="bg-[#17171f] border border-white/5 rounded-xl p-4 hover:border-violet-500/20 transition-colors cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-white">{launch.name}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              Lançamento: {format(parseISO(launch.launch_date), "dd 'de' MMM yyyy", { locale: ptBR })}
            </p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        </div>

        <div className="space-y-2">
          {launch.phases?.map((phase) => {
            const total = phase.tasks?.length ?? 0
            const done = phase.tasks?.filter((t) =>
              ['aprovado', 'concluido'].includes(t.status)
            ).length ?? 0
            const pct = total > 0 ? Math.round((done / total) * 100) : 0

            return (
              <div key={phase.id} className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 w-28 shrink-0">{phase.name}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-600 w-7 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}
