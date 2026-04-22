import { describe, it, expect } from 'vitest'
import { parseKickstartResponse } from '@/lib/ai/kickstart'

describe('parseKickstartResponse', () => {
  it('parses valid JSON plan', () => {
    const raw = JSON.stringify({
      name: 'Curso Test',
      type: 'lancamento',
      launch_date: '2026-06-01',
      phases: [
        {
          name: 'Pre-lancamento',
          order: 1,
          start_date: '2026-05-01',
          end_date: '2026-05-25',
          objective: 'Gerar leads',
          tasks: [
            { title: 'Pagina de captura', type: 'copy', due_date: '2026-05-10', priority: 'normal' }
          ]
        }
      ]
    })
    const result = parseKickstartResponse(raw)
    expect(result.name).toBe('Curso Test')
    expect(result.phases).toHaveLength(1)
    expect(result.phases[0].tasks).toHaveLength(1)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseKickstartResponse('not json')).toThrow('Invalid JSON')
  })

  it('throws when phases is missing', () => {
    expect(() => parseKickstartResponse(JSON.stringify({ name: 'x', type: 'lancamento' }))).toThrow('Missing phases')
  })

  it('strips markdown code fences if present', () => {
    const raw = '```json\n{"name":"x","type":"lancamento","launch_date":"2026-06-01","phases":[]}\n```'
    const result = parseKickstartResponse(raw)
    expect(result.name).toBe('x')
  })
})
