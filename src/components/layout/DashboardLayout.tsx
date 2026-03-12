'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '@/lib/utils'
import { type UserRole } from '@/types/auth-types'

type Period = 'today' | '7d' | '30d' | 'custom'

interface DashboardLayoutProps {
  children: React.ReactNode
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    phone?: string | null
  }
  period?: Period
  onPeriodChange?: (period: Period) => void
}

export function DashboardLayout({ children, user, period, onPeriodChange }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        user={user}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        mobileSidebarOpen={mobileSidebarOpen}
        onMobileSidebarOpenChange={setMobileSidebarOpen}
      />
      {/* Content shifts right on desktop only */}
      <div
        className={cn(
          'transition-all duration-300 min-h-screen',
          sidebarCollapsed ? 'md:ml-[70px]' : 'md:ml-64'
        )}
      >
        <Header
          user={user}
          sidebarCollapsed={sidebarCollapsed}
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
          period={period}
          onPeriodChange={onPeriodChange}
        />
        <main className="pt-14 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
