'use client'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/hooks/useWorkspace'

export function Topbar({ title }: { title: string }) {
  const { workspace } = useWorkspace()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-14 border-b border-white/5 bg-[#17171f] flex items-center justify-between px-6 shrink-0">
      <h1 className="text-sm font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500">{workspace?.name}</span>
        <button
          className="text-zinc-400 hover:text-zinc-200 relative"
          aria-label="Notificações"
          onClick={() => {}}
        >
          <Bell size={17} />
        </button>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-400 text-xs">
          Sair
        </Button>
      </div>
    </header>
  )
}
