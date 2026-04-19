'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (otpError) {
      setError(otpError.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm space-y-6 p-8 rounded-xl border border-white/10 bg-[#17171f]">
      <div>
        <h1 className="text-2xl font-bold text-white">
          launch<span className="text-violet-500">os</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Gestão inteligente de lançamentos</p>
      </div>
      {sent ? (
        <p className="text-sm text-zinc-300">
          Link enviado para <strong>{email}</strong>. Verifique seu e-mail.
        </p>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-[#0f0f13] border-white/10"
            />
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={loading}>
            {loading ? 'Enviando...' : 'Entrar com Magic Link'}
          </Button>
        </form>
      )}
    </div>
  )
}
