'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Package,
  Phone,
  Truck,
  Warehouse,
  DollarSign,
  Users,
  Settings,
  Package as PackageIcon,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  FileText,
  Upload,
  Link2,
  Banknote,
  Activity,
  Wallet,
  ShoppingBag,
  PackageSearch,
  Key,
  TrendingUp,
} from 'lucide-react'
import { roleLabels, type UserRole } from '@/types/auth-types'

interface SidebarProps {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    phone?: string | null
  }
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
  mobileSidebarOpen?: boolean
  onMobileSidebarOpenChange?: (open: boolean) => void
}

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
  section?: string
}

const navItems: NavItem[] = [
  // ── Admin & shared ──────────────────────────────────────────
  {
    title: 'Dashboard',
    href: '/',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['ADMIN', 'CALL_CENTER', 'DELIVERY'],
    section: 'Overview'
  },
  {
    title: 'Orders',
    href: '/orders',
    icon: <Package className="h-4 w-4" />,
    roles: ['ADMIN', 'CALL_CENTER', 'DELIVERY'],
    section: 'Management'
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: <BarChart2 className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Management'
  },
  {
    title: 'Call Center',
    href: '/call-center',
    icon: <Phone className="h-4 w-4" />,
    roles: ['ADMIN', 'CALL_CENTER'],
    section: 'Operations'
  },
  {
    title: 'CC Overview',
    href: '/admin/call-center',
    icon: <Users className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Operations'
  },
  {
    title: 'CC Performance',
    href: '/call-center/performance',
    icon: <BarChart2 className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Operations'
  },
  {
    title: 'Delivery Overview',
    href: '/admin/delivery',
    icon: <Truck className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Operations'
  },
  {
    title: 'Delivery Performance',
    href: '/delivery/performance',
    icon: <BarChart2 className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Operations'
  },
  {
    title: 'Delivery',
    href: '/delivery',
    icon: <Truck className="h-4 w-4" />,
    roles: ['ADMIN', 'DELIVERY'],
    section: 'Operations'
  },
  {
    title: 'Remittance',
    href: '/delivery/remittance',
    icon: <Banknote className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Finance'
  },
  {
    title: 'Stock',
    href: '/stock',
    icon: <Warehouse className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Operations'
  },
  {
    title: 'Finance',
    href: '/finance',
    icon: <DollarSign className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Finance'
  },
  {
    title: 'Invoices',
    href: '/finance/invoices',
    icon: <FileText className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Finance'
  },
  {
    title: 'Users',
    href: '/users',
    icon: <Users className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'System'
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: <Settings className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'System'
  },
  {
    title: 'Activity Logs',
    href: '/activity-logs',
    icon: <Activity className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'System'
  },
  {
    title: 'Seller Wallets',
    href: '/finance/wallets',
    icon: <Wallet className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Finance'
  },
  {
    title: 'Catalog',
    href: '/admin/catalog',
    icon: <ShoppingBag className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Marketplace'
  },
  {
    title: 'Sourcing',
    href: '/admin/sourcing',
    icon: <PackageSearch className="h-4 w-4" />,
    roles: ['ADMIN'],
    section: 'Marketplace'
  },

  // ── Seller ──────────────────────────────────────────────────
  {
    title: 'My Dashboard',
    href: '/seller',
    icon: <LayoutDashboard className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Overview'
  },
  {
    title: 'My Orders',
    href: '/seller/orders',
    icon: <Package className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Store'
  },
  {
    title: 'My Stock',
    href: '/seller/stock',
    icon: <Warehouse className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Store'
  },
  {
    title: 'My Finance',
    href: '/seller/finance',
    icon: <DollarSign className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Finance'
  },
  {
    title: 'My Invoices',
    href: '/seller/finance/invoices',
    icon: <FileText className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Finance'
  },
  {
    title: 'Import Orders',
    href: '/seller/import',
    icon: <Upload className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Tools'
  },
  {
    title: 'Integrations',
    href: '/seller/integrations',
    icon: <Link2 className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Tools'
  },
  {
    title: 'My Wallet',
    href: '/seller/wallet',
    icon: <Wallet className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Finance'
  },
  {
    title: 'Catalog',
    href: '/catalog',
    icon: <ShoppingBag className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Marketplace'
  },
  {
    title: 'Sourcing',
    href: '/seller/sourcing',
    icon: <PackageSearch className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Marketplace'
  },
  {
    title: 'My Team',
    href: '/seller/team',
    icon: <Users className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Account'
  },
  {
    title: 'API Access',
    href: '/seller/api',
    icon: <Key className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Account'
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: <TrendingUp className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Overview'
  },
  {
    title: 'Products Analytics',
    href: '/seller/analytics/products',
    icon: <BarChart2 className="h-4 w-4" />,
    roles: ['SELLER'],
    section: 'Analytics'
  }
]

// ─── Shared nav content (used by both desktop sidebar + mobile sheet) ───────

interface NavContentProps {
  user: SidebarProps['user']
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
  onNavClick?: () => void
}

function NavContent({ user, collapsed, onCollapsedChange, onNavClick }: NavContentProps) {
  const pathname = usePathname()

  const filtered = navItems.filter(item => item.roles.includes(user.role))
  const sections = filtered.reduce((acc, item) => {
    const s = item.section || 'General'
    if (!acc[s]) acc[s] = []
    acc[s].push(item)
    return acc
  }, {} as Record<string, NavItem[]>)

  const userInitials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        'flex h-16 items-center px-4 mb-2 shrink-0',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 shadow-lg shadow-indigo-500/20">
              <PackageIcon className="h-5 w-5 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Gabon COD
            </span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md">
            <PackageIcon className="h-5 w-5 text-white" />
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(!collapsed)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent/50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-6 py-2">
          {Object.entries(sections).map(([sectionName, items]) => (
            <div key={sectionName} className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500 mb-3">
                  {sectionName}
                </h3>
              )}
              <nav className="space-y-[2px]">
                {items.map(item => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/' && item.href !== '/seller' && pathname.startsWith(item.href))
                  return (
                    <Link key={item.href} href={item.href} onClick={onNavClick}>
                      <div
                        className={cn(
                          'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 cursor-pointer',
                          isActive
                            ? 'bg-indigo-50/50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200',
                          collapsed && 'justify-center px-0 h-10 w-10 mx-auto'
                        )}
                      >
                        <div className={cn(
                          'transition-transform duration-200 group-hover:scale-110',
                          isActive && 'text-indigo-600 dark:text-indigo-400'
                        )}>
                          {item.icon}
                        </div>
                        {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
                        {isActive && !collapsed && (
                          <div className="absolute left-0 h-6 w-0.5 rounded-r-full bg-indigo-600 dark:bg-indigo-400" />
                        )}
                        {collapsed && <div className="sr-only">{item.title}</div>}
                      </div>
                    </Link>
                  )
                })}
              </nav>
              {!collapsed && <div className="mx-3 h-[1px] bg-border/40 mt-4" />}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* User profile */}
      <div className={cn(
        'mt-auto border-t border-border/40 p-4 bg-muted/30 backdrop-blur-sm shrink-0',
        collapsed ? 'flex justify-center' : ''
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-3 group cursor-default">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-background bg-gradient-to-tr from-indigo-100 to-violet-100 text-indigo-700 dark:from-indigo-900 dark:to-violet-900 dark:text-indigo-300 font-semibold text-xs shadow-sm">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <p className="text-sm font-semibold truncate text-foreground leading-none mb-1">
                {user.name}
              </p>
              <span className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight leading-none w-fit',
                user.role === 'ADMIN' && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
                user.role === 'SELLER' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
                user.role === 'CALL_CENTER' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
                user.role === 'DELIVERY' && 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
              )}>
                {roleLabels[user.role]}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCollapsedChange(!collapsed)}
              className="h-8 w-8 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(!collapsed)}
            className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950 p-0 overflow-hidden border border-border/50"
          >
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
              {userInitials}
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Main Sidebar export ─────────────────────────────────────────────────────

export function Sidebar({
  user,
  collapsed,
  onCollapsedChange,
  mobileSidebarOpen = false,
  onMobileSidebarOpenChange,
}: SidebarProps) {
  return (
    <>
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside
        className={cn(
          'hidden md:flex fixed left-0 top-0 z-40 h-screen border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ease-in-out flex-col',
          collapsed ? 'w-[70px]' : 'w-64'
        )}
      >
        <NavContent
          user={user}
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
        />
      </aside>

      {/* ── Mobile sidebar (Sheet, visible on mobile only) ── */}
      <Sheet open={mobileSidebarOpen} onOpenChange={onMobileSidebarOpenChange}>
        <SheetContent side="left" className="p-0 w-64 md:hidden">
          <NavContent
            user={user}
            collapsed={false}
            onCollapsedChange={() => {}}
            onNavClick={() => onMobileSidebarOpenChange?.(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
