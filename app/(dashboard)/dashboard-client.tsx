'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/sidebar'
import { Menu, X } from 'lucide-react'

interface DashboardClientProps {
  children: React.ReactNode
  userName: string
  userEmail: string
}

export default function DashboardClient({ children, userName, userEmail }: DashboardClientProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-[#09090b]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          userName={userName}
          userEmail={userEmail}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Sidebar - Mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          userName={userName}
          userEmail={userEmail}
          collapsed={false}
          onToggle={() => setMobileOpen(false)}
          onNavClick={() => setMobileOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center h-14 px-4 border-b border-zinc-800/60 bg-[#0d0d10]">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <span className="ml-3 font-bold text-zinc-100">FinanceApp</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
