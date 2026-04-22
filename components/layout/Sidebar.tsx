'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Rocket, CheckSquare, Users, Settings, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/hooks/useWorkspace'

const gestorNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projetos', label: 'Projetos', icon: Rocket },
  { href: '/aprovacoes', label: 'Aprovações', icon: CheckSquare },
  { href: '/time', label: 'Time', icon: Users },
]

const memberNav = [
  { href: '/meu-dia', label: 'Meu Dia', icon: Sun },
  { href: '/projetos', label: 'Projetos', icon: Rocket },
]

export function Sidebar() {
  const pathname = usePathname()
  const { member } = useWorkspace()
  const nav = member?.role === 'gestor' ? gestorNav : memberNav

  return (
    <aside className="w-[220px] border-r flex flex-col shrink-0 h-screen sticky top-0" style={{ background: 'var(--app-surface)', borderColor: 'var(--app-border)' }}>
      <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--app-border)' }}>
        <span className="text-[15px] font-bold" style={{ color: 'var(--app-text)' }}>
          launch<span className="text-violet-500">os</span>
        </span>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-violet-950/50 text-violet-400 font-medium dark:bg-violet-950/50'
                : ''
            )}
            style={
              pathname === href || pathname.startsWith(href + '/')
                ? undefined
                : { color: 'var(--app-text-muted)' }
            }
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
        <div className="pt-4">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: 'var(--app-text-subtle)' }}
          >
            <Settings size={15} />
            Configurações
          </Link>
        </div>
      </nav>
    </aside>
  )
}
