import { render, screen } from '@testing-library/react'
import { TaskStatusBadge } from '@/components/tasks/TaskStatusBadge'
import type { TaskStatus } from '@/types'

describe('TaskStatusBadge', () => {
  const cases: [TaskStatus, string][] = [
    ['a_fazer', 'A fazer'],
    ['em_andamento', 'Em andamento'],
    ['aguardando_aprovacao', 'Aguardando aprovação'],
    ['aprovado', 'Aprovado'],
    ['concluido', 'Concluído'],
  ]

  it.each(cases)('renders label for status %s', (status, label) => {
    render(<TaskStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
