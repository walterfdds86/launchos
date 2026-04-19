import { describe, it, expect } from 'vitest'
import { computePriority } from '@/lib/utils/priority'
import type { Task } from '@/types'

const baseTask: Partial<Task> = {
  status: 'a_fazer',
  depends_on: [],
}

describe('computePriority', () => {
  it('returns urgente when due_date is in the past', () => {
    const task = { ...baseTask, due_date: '2020-01-01' } as Task
    expect(computePriority(task, [])).toBe('urgente')
  })

  it('returns atencao when due_date is within 48 hours', () => {
    const soon = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString().split('T')[0]
    const task = { ...baseTask, due_date: soon } as Task
    expect(computePriority(task, [])).toBe('atencao')
  })

  it('returns bloqueada when a dependency is in_progress or pending_approval', () => {
    const task = { ...baseTask, depends_on: ['dep-1'] } as Task
    const deps: Partial<Task>[] = [{ id: 'dep-1', status: 'em_andamento' }]
    expect(computePriority(task, deps as Task[])).toBe('bloqueada')
  })

  it('returns normal when no deadline pressure and no blockers', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const task = { ...baseTask, due_date: future } as Task
    expect(computePriority(task, [])).toBe('normal')
  })

  it('returns normal when due_date is null', () => {
    const task = { ...baseTask, due_date: null } as Task
    expect(computePriority(task, [])).toBe('normal')
  })

  it('returns normal when dependency is concluido (not blocked)', () => {
    const task = { ...baseTask, depends_on: ['dep-1'] } as Task
    const deps: Partial<Task>[] = [{ id: 'dep-1', status: 'concluido' }]
    expect(computePriority(task, deps as Task[])).toBe('normal')
  })

  it('returns bloqueada when dependency is aguardando_aprovacao', () => {
    const task = { ...baseTask, depends_on: ['dep-1'] } as Task
    const deps: Partial<Task>[] = [{ id: 'dep-1', status: 'aguardando_aprovacao' }]
    expect(computePriority(task, deps as Task[])).toBe('bloqueada')
  })
})
