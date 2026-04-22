'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { KickstartPlan } from '@/types'

interface KickstartChatProps {
  workspaceId: string
  onPlanGenerated: (plan: KickstartPlan) => void
}

export function KickstartChat({ workspaceId, onPlanGenerated }: KickstartChatProps) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!description.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/projects/kickstart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, workspace_id: workspaceId }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok || data.error) {
      setError(data.error ?? 'Erro ao gerar plano. Tente novamente.')
      return
    }

    onPlanGenerated(data.plan)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="bg-violet-950/30 border border-violet-800/30 rounded-xl p-4">
        <p className="text-xs text-violet-400 font-semibold mb-1">🤖 LaunchOS IA</p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Me conta sobre o projeto. Pode descrever à vontade — produto, público-alvo, prazo, equipe disponível, meta principal. Quanto mais contexto, melhor o plano.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Ex: Vou lançar um curso de Instagram para pequenos negócios. Lançamento em 30 dias. Tenho uma copy, um designer e um gestor de tráfego. Meta: 200 alunos a R$297."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full bg-[#0f0f13] border border-white/10 rounded-md px-3 py-2 resize-none text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-600 disabled:opacity-50"
          disabled={loading}
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <Button
          type="submit"
          disabled={loading || !description.trim()}
          className="w-full bg-violet-600 hover:bg-violet-700"
        >
          {loading ? '🤖 Gerando seu plano...' : 'Gerar plano com IA →'}
        </Button>
      </form>
    </div>
  )
}
