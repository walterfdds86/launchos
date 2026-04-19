'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWorkspace } from '@/hooks/useWorkspace'

const LAUNCH_TYPES = [
  { value: 'curso', label: 'Curso Online' },
  { value: 'mentoria', label: 'Mentoria' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'ebook', label: 'E-book' },
  { value: 'evento', label: 'Evento' },
  { value: 'outro', label: 'Outro' },
]

export default function NovoLancamentoPage() {
  const router = useRouter()
  const { workspace } = useWorkspace()
  const [name, setName] = useState('')
  const [type, setType] = useState('curso')
  const [launchDate, setLaunchDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'generating'>('form')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!workspace) return
    setError(null)
    setLoading(true)
    setStep('generating')

    try {
      const launchRes = await fetch('/api/launches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, type, launch_date: launchDate,
          workspace_id: workspace.id,
          status: 'ativo',
        }),
      })

      if (!launchRes.ok) {
        const body = await launchRes.json().catch(() => ({}))
        throw new Error(body.error ?? 'Erro ao criar lançamento')
      }

      const launch = await launchRes.json()

      await fetch('/api/ai/kickstart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          launchId: launch.id,
          launchName: name,
          launchType: type,
          launchDate,
          workspaceId: workspace.id,
        }),
      })

      router.push(`/lancamentos/${launch.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
      setStep('form')
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar title="Novo Lançamento" />
      <div className="flex-1 overflow-y-auto p-6 max-w-lg">
        {step === 'generating' ? (
          <div className="py-16 text-center space-y-3">
            <p className="text-2xl">🤖</p>
            <p className="text-sm font-medium text-zinc-300">
              Gerando plano de lançamento com IA...
            </p>
            <p className="text-xs text-zinc-600">
              Criando fases e tarefas automaticamente. Isso leva alguns segundos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-950/30 border border-red-900/30 rounded-lg p-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome do Lançamento</Label>
              <Input
                placeholder="Ex: Super Águias Ciclo 2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-[#0f0f13] border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Lançamento</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full h-9 rounded-md border border-white/10 bg-[#0f0f13] px-3 text-sm text-zinc-200"
                required
              >
                {LAUNCH_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Data de Lançamento</Label>
              <Input
                type="date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                required
                className="bg-[#0f0f13] border-white/10"
              />
            </div>
            <div className="bg-violet-950/30 border border-violet-800/30 rounded-lg p-3">
              <p className="text-xs text-violet-400">
                🤖 A IA vai gerar automaticamente todas as fases e tarefas do lançamento com prazos calculados.
              </p>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-700"
            >
              {loading ? 'Criando...' : 'Criar Lançamento com IA'}
            </Button>
          </form>
        )}
      </div>
    </>
  )
}
