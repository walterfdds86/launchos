'use client'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/hooks/useWorkspace'
import { ThemeToggle } from '@/components/theme-toggle'

export function Topbar({ title }: { title: string }) {
  const { workspace } = useWorkspace()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 border-b flex items-center justify-between px-6 shrink-0" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
      <h1 className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>{title}</h1>
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--app-text-muted)' }}>{workspace?.name}</span>
        <button className="relative p-1.5 rounded-md transition-colors" style={{ color: 'var(--app-text-muted)' }} aria-label="Notificações">
          <Bell size={16} />
        </button>
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
          Sair
        </Button>
      </div>
    </header>
  )
}
