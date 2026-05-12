'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, FolderOpen, TrendingUp, PieChart, BarChart2,
  Target, Calendar, Settings, LogOut, ChevronLeft, ChevronRight,
  Wallet, Tag, Grid3X3
} from 'lucide-react'

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pastas', label: 'Pastas', icon: FolderOpen },
  { href: '/transacoes', label: 'Transações', icon: Wallet },
  { href: '/investimentos', label: 'Investimentos', icon: TrendingUp },
  { href: '/orcamentos', label: 'Orçamentos', icon: PieChart },
  { href: '/relatorios', label: 'Relatórios', icon: BarChart2 },
  { href: '/objetivos', label: 'Objetivos', icon: Target },
  { href: '/calendario', label: 'Calendário', icon: Calendar },
]

const manageNavItems = [
  { href: '/categorias', label: 'Categorias', icon: Grid3X3 },
  { href: '/tags', label: 'Tags', icon: Tag },
]

interface SidebarProps {
  userName?: string
  userEmail?: string
  collapsed?: boolean
  onToggle?: () => void
  onNavClick?: () => void
}

export function Sidebar({ userName, userEmail, collapsed = false, onToggle, onNavClick }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    toast.success('Até logo!')
  }

  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        onClick={onNavClick}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
          collapsed ? 'justify-center' : '',
          isActive
            ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/15'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
        )}
      >
        <Icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4', isActive ? 'text-indigo-400' : '')} />
        {!collapsed && <span>{label}</span>}
      </Link>
    )
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-[#0d0d10] border-r border-zinc-800/60 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-zinc-800/60', collapsed && 'justify-center')}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5 flex-1">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-zinc-100 text-lg tracking-tight">FinanceApp</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
            Principal
          </p>
        )}
        {mainNavItems.map(item => <NavLink key={item.href} {...item} />)}

        <div className="pt-2">
          {!collapsed && (
            <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
              Gerenciar
            </p>
          )}
          {manageNavItems.map(item => <NavLink key={item.href} {...item} />)}
        </div>

        <div className="pt-2">
          {!collapsed && (
            <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">
              Conta
            </p>
          )}
          <NavLink href="/configuracoes" label="Configurações" icon={Settings} />
        </div>
      </nav>

      {/* User section */}
      <div className={cn('p-3 border-t border-zinc-800/60', collapsed && 'flex flex-col items-center gap-2')}>
        {collapsed ? (
          <>
            <button
              onClick={onToggle}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-300 text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 truncate">{userName || 'Usuário'}</p>
              <p className="text-xs text-zinc-500 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
