import type { KickstartPlan } from '@/types'

export function parseKickstartResponse(raw: string): KickstartPlan {
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Invalid JSON from AI response')
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid JSON from AI response')
  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.phases)) throw new Error('Missing phases in AI response')

  return obj as unknown as KickstartPlan
}
