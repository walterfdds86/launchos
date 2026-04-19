import { render, screen } from '@testing-library/react'
import { PriorityBadge } from '@/components/tasks/PriorityBadge'
import type { TaskPriority } from '@/types'

describe('PriorityBadge', () => {
  const cases: [TaskPriority, string][] = [
    ['normal', 'Normal'],
    ['atencao', 'Atenção'],
    ['urgente', 'Urgente'],
    ['bloqueada', 'Bloqueada'],
  ]

  it.each(cases)('renders label for priority %s', (priority, label) => {
    render(<PriorityBadge priority={priority} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
