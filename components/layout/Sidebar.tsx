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
    <aside className="w-[220px] bg-[#17171f] border-r border-white/5 flex flex-col shrink-0 h-screen sticky top-0">
      <div className="px-4 py-5 border-b border-white/5">
        <span className="text-[15px] font-bold text-white">
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
                ? 'bg-violet-950/50 text-violet-400 font-medium'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
        <div className="pt-4">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <Settings size={15} />
            Configurações
          </Link>
        </div>
      </nav>
    </aside>
  )
}
