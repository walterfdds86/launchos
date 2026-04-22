'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
    <div className="w-full max-w-md">
      {/* card */}
      <div className="rounded-2xl border border-white/10 p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>

        {/* logo */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white text-sm font-black">L</div>
            <span className="text-xl font-bold text-white tracking-tight">
              launch<span className="text-violet-400">os</span>
            </span>
          </div>
          <p className="text-2xl font-bold text-white leading-snug">
            Gerencie lançamentos<br />com inteligência
          </p>
          <p className="text-sm text-zinc-400 mt-2">
            Kanban, Kickstart IA e briefings automáticos — tudo em um só lugar.
          </p>
        </div>

        {/* features */}
        <div className="flex gap-4 mb-8">
          {[
            { icon: '🤖', label: 'Kickstart IA' },
            { icon: '📋', label: 'Kanban' },
            { icon: '✅', label: 'Aprovações' },
          ].map((f) => (
            <div key={f.label} className="flex-1 rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
              <div className="text-base mb-0.5">{f.icon}</div>
              <div className="text-[10px] text-zinc-400 font-medium">{f.label}</div>
            </div>
          ))}
        </div>

        {/* form */}
        {sent ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 p-4 text-center">
            <div className="text-2xl mb-2">📬</div>
            <p className="text-sm text-zinc-200 font-medium">Link enviado!</p>
            <p className="text-xs text-zinc-400 mt-1">
              Verifique <strong className="text-white">{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-1.5 block">E-mail profissional</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 h-11 focus:border-violet-500 focus:ring-violet-500/20"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : (
                'Entrar com Magic Link →'
              )}
            </Button>

            <p className="text-center text-[11px] text-zinc-600">
              Sem senha — enviamos um link direto pro seu e-mail
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
