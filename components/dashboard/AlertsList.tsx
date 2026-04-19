import type { Task } from '@/types'

interface Alert {
  id: string
  message: string
  detail: string
  variant: 'red' | 'amber'
  taskId: string
}

export function AlertsList({ tasks }: { tasks: Task[] }) {
  const alerts: Alert[] = tasks
    .filter((t) => ['urgente', 'bloqueada'].includes(t.priority))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      message: t.priority === 'urgente'
        ? `Tarefa atrasada: ${t.title}`
        : `Tarefa bloqueada: ${t.title}`,
      detail: t.assignee?.full_name ?? t.assignee?.email ?? 'Sem responsável',
      variant: t.priority === 'urgente' ? 'red' : 'amber',
      taskId: t.id,
    }))

  if (alerts.length === 0) {
    return <p className="text-xs text-zinc-600">Nenhum alerta no momento.</p>
  }

  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-2 p-2.5 rounded-lg text-xs border ${
            a.variant === 'red'
              ? 'bg-red-950/30 border-red-900/30 text-red-400'
              : 'bg-amber-950/30 border-amber-900/30 text-amber-400'
          }`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-current mt-1 shrink-0" />
          <div>
            <p>{a.message}</p>
            <p className="opacity-60 mt-0.5">{a.detail}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
