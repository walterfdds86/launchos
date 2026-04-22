import { describe, it, expect } from 'vitest'
import { buildLaunchContext } from '@/lib/ai/context-builder'
import type { Project, Phase, Task } from '@/types'

describe('buildLaunchContext', () => {
  it('produces a string containing launch name and phase names', () => {
    const launch: Partial<Project> = { name: 'Super Águias', launch_date: '2026-05-10', type: 'lancamento' }
    const phases: Partial<Phase>[] = [
      { name: 'Pré-Lançamento', order: 1, tasks: [] },
      { name: 'Lançamento', order: 2, tasks: [] },
    ]
    const result = buildLaunchContext(launch as Project, phases as Phase[])
    expect(result).toContain('Super Águias')
    expect(result).toContain('Pré-Lançamento')
    expect(result).toContain('Lançamento')
  })

  it('includes task titles and status per phase', () => {
    const launch: Partial<Project> = { name: 'Test', launch_date: '2026-06-01', type: 'outro' }
    const tasks: Partial<Task>[] = [
      { title: 'Write copy', status: 'a_fazer', type: 'copy' },
      { title: 'Design banner', status: 'concluido', type: 'design' },
    ]
    const phases: Partial<Phase>[] = [{ name: 'Fase 1', order: 1, tasks: tasks as Task[] }]
    const result = buildLaunchContext(launch as Project, phases as Phase[])
    expect(result).toContain('Write copy')
    expect(result).toContain('concluido')
  })
})
