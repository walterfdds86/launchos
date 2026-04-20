'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { createWorkspace } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function OnboardingPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await createWorkspace(name)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-xl border border-white/10 bg-[#17171f]">
        <div>
          <h1 className="text-2xl font-bold text-white">
            launch<span className="text-violet-500">os</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Bem-vindo! Vamos configurar seu workspace.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do seu time ou empresa</Label>
            <Input
              id="name"
              placeholder="Ex: Agência Águias"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="bg-[#0f0f13] border-white/10"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700"
          >
            {loading ? 'Criando...' : 'Criar Workspace →'}
          </Button>
        </form>
      </div>
    </div>
  )
}
