import type { Project, Phase, Task, WorkspaceMember } from '@/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function buildLaunchContext(launch: Project, phases: Phase[]): string {
  const lines: string[] = [
    `LANÇAMENTO: ${launch.name}`,
    `TIPO: ${launch.type}`,
    `DATA DE LANÇAMENTO: ${launch.launch_date ? format(parseISO(launch.launch_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'data não definida'}`,
    `STATUS: ${launch.status ?? 'ativo'}`,
    '',
    'FASES E TAREFAS:',
  ]

  for (const phase of [...phases].sort((a, b) => a.order - b.order)) {
    const tasks = phase.tasks ?? []
    const done = tasks.filter((t) => ['aprovado', 'concluido'].includes(t.status)).length
    lines.push(`\n  Fase: ${phase.name} (${done}/${tasks.length} concluídas)`)
    if (phase.objective) lines.push(`  Objetivo: ${phase.objective}`)

    for (const task of tasks) {
      lines.push(
        `    - [${task.status}] ${task.title} (${task.type}) — responsável: ${
          (task as any).assignee?.full_name ?? 'não atribuído'
        }${task.due_date ? ` — prazo: ${task.due_date}` : ''}`
      )
    }
  }

  return lines.join('\n')
}

export function buildMemberContext(member: WorkspaceMember, tasks: Task[]): string {
  return [
    `MEMBRO: ${(member as any).user?.full_name ?? (member as any).user?.email ?? 'desconhecido'}`,
    `PAPEL: ${member.role}`,
    `TAREFAS ATIVAS (${tasks.filter((t) => t.status === 'em_andamento').length}/3 no limite WIP):`,
    ...tasks.map(
      (t) =>
        `  - [${t.status}][${t.priority}] ${t.title}${t.due_date ? ` — prazo: ${t.due_date}` : ''}`
    ),
  ].join('\n')
}
