interface Stat {
  label: string
  value: number | string
  sub: string
  variant?: 'default' | 'red' | 'amber' | 'green'
}

const valueStyles = {
  default: 'text-white',
  red: 'text-red-400',
  amber: 'text-amber-400',
  green: 'text-emerald-400',
}

export function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-[#17171f] border border-white/5 rounded-xl p-4"
          style={s.variant === 'red' ? { borderColor: 'rgba(248,113,113,0.2)' } : {}}
        >
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">{s.label}</p>
          <p className={`text-2xl font-bold ${valueStyles[s.variant ?? 'default']}`}>{s.value}</p>
          <p className="text-[11px] text-zinc-600 mt-1">{s.sub}</p>
        </div>
      ))}
    </div>
  )
}
