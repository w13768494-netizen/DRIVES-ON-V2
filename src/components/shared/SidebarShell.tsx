'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { DrivesOnLogo } from '@/components/shared/DrivesOnLogo'
import {
  ChevronLeft, ChevronRight, Menu,
  LayoutDashboard, Plus, Users, Building2,
  LogOut, RotateCcw, UserCircle2, Bell,
} from 'lucide-react'
import { getSession } from '@/services/currentSessionService'
import { signOut }    from '@/services/authService'
import { getUnreadCount } from '@/services/notificationService'
import { ASSISTANCE_USER_ROLE_LABELS, ASSISTANCE_USER_ROLE_COLORS } from '@/types/assistanceUser'
import type { MockSession } from '@/types/session'

// ── Nav items config ──────────────────────────────────────────────────────────

type IconKey = 'dashboard' | 'plus' | 'users' | 'building' | 'bell'

const ICONS: Record<IconKey, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-5 h-5" />,
  plus:      <Plus            className="w-5 h-5" />,
  users:     <Users           className="w-5 h-5" />,
  building:  <Building2       className="w-5 h-5" />,
  bell:      <Bell            className="w-5 h-5" />,
}

interface NavItem {
  href:       string
  icon:       IconKey
  label:      string
  exact?:     boolean
  cta?:       boolean
  adminOnly?: boolean
  hasBadge?:  boolean
}

const NAV: Record<'assisteur' | 'loueur', NavItem[]> = {
  assisteur: [
    { href: '/assisteur',                    icon: 'dashboard', label: 'Tableau de bord', exact: true },
    { href: '/assisteur/nouvelle-demande',   icon: 'plus',      label: 'Nouvelle demande', cta: true  },
    { href: '/assisteur/utilisateurs',       icon: 'users',     label: 'Utilisateurs', adminOnly: true },
  ],
  loueur: [
    { href: '/loueur/dashboard',      icon: 'dashboard', label: 'Tableau de bord', exact: true },
    { href: '/loueur/notifications',  icon: 'bell',      label: 'Notifications',   hasBadge: true },
    { href: '/loueur/profil',         icon: 'building',  label: 'Mon profil'                   },
  ],
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  role:     'assisteur' | 'loueur'
  children: React.ReactNode
}

export function SidebarShell({ role, children }: Props) {
  const [collapsed,    setCollapsed]    = useState(false)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [session,      setSession]      = useState<MockSession | null>(null)
  const [unreadCount,  setUnreadCount]  = useState(0)
  const pathname = usePathname()
  const router   = useRouter()

  useEffect(() => {
    setSession(getSession())
    if (localStorage.getItem('driveson:sidebar') === 'collapsed') setCollapsed(true)
  }, [])

  // Polling notifications toutes les 30s (loueur uniquement)
  useEffect(() => {
    if (role !== 'loueur') return
    const load = () => getUnreadCount().then(setUnreadCount)
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [role])

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('driveson:sidebar', next ? 'collapsed' : 'expanded')
  }

  async function handleLogout() { await signOut(); router.push('/login') }

  function handleReset() {
    if (!confirm('Réinitialiser toutes les données de démo ?')) return
    localStorage.removeItem('driveson:requests:v2')
    localStorage.removeItem('driveson:documents:v2')
    localStorage.removeItem('driveson:assistance-users')
    window.location.reload()
  }

  const isAdmin = session?.companyRole === 'admin' || session?.companyRole === 'superviseur'
  const visibleItems = NAV[role].filter(item => !item.adminOnly || isAdmin)

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={[
        'fixed top-0 left-0 h-screen z-40',
        'bg-white border-r border-slate-200 flex flex-col',
        'transition-all duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0',
        collapsed ? 'lg:w-16' : 'lg:w-60',
        'w-60',
      ].join(' ')}>

        {/* Logo + toggle desktop */}
        <div className="h-14 flex items-center px-3 border-b border-slate-100 shrink-0 gap-2">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="shrink-0 transition-opacity"
          >
            <DrivesOnLogo variant="light" size="sm" iconOnly={collapsed} />
          </Link>

          {/* Desktop toggle */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Développer' : 'Réduire'}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-auto shrink-0"
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft  className="w-4 h-4" />
            }
          </button>

          {/* Mobile close */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 ml-auto shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
          {visibleItems.map(item => {
            const active = isActive(item)
            const icon   = ICONS[item.icon]

            if (item.cta) {
              return (
                <Tooltip key={item.href} label={item.label} show={collapsed}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={[
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors mt-1',
                      'bg-brand-500 hover:bg-brand-600 text-white',
                      collapsed ? 'lg:justify-center lg:px-0' : '',
                    ].join(' ')}
                  >
                    <span className="shrink-0">{icon}</span>
                    <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  </Link>
                </Tooltip>
              )
            }

            const badgeCount = item.hasBadge ? unreadCount : 0

            return (
              <Tooltip key={item.href} label={item.label} show={collapsed}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                    collapsed ? 'lg:justify-center lg:px-0' : '',
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                  ].join(' ')}
                >
                  <span className="relative shrink-0">
                    {icon}
                    {badgeCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-brand-500 text-white text-[9px] font-black rounded-full leading-none">
                        {badgeCount > 9 ? '9+' : badgeCount}
                      </span>
                    )}
                  </span>
                  <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                  {!collapsed && badgeCount > 0 && (
                    <span className="ml-auto bg-brand-100 text-brand-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center tabular-nums">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                </Link>
              </Tooltip>
            )
          })}
        </nav>

        {/* Session + actions */}
        <div className="border-t border-slate-100 p-2 shrink-0">
          {session && !collapsed && (
            <div className="px-3 py-2 mb-1">
              <div className="flex items-center gap-2">
                <UserCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{session.userName}</p>
                  <p className="text-xs text-slate-400 truncate">{session.company}</p>
                </div>
              </div>
              {session.companyRole && (
                <span className={`inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${ASSISTANCE_USER_ROLE_COLORS[session.companyRole]}`}>
                  {ASSISTANCE_USER_ROLE_LABELS[session.companyRole]}
                </span>
              )}
            </div>
          )}

          <div className={`flex gap-1 ${collapsed ? 'lg:flex-col' : ''}`}>
            <Tooltip label="Réinitialiser les données démo" show={collapsed}>
              <button
                onClick={handleReset}
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium',
                  'text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors',
                  collapsed ? 'lg:justify-center lg:w-full lg:px-0' : 'flex-1',
                ].join(' ')}
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className={collapsed ? 'lg:hidden' : ''}>Reset données</span>
              </button>
            </Tooltip>

            <Tooltip label="Se déconnecter" show={collapsed}>
              <button
                onClick={handleLogout}
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium',
                  'text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors',
                  collapsed ? 'lg:justify-center lg:w-full lg:px-0' : 'flex-1',
                ].join(' ')}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className={collapsed ? 'lg:hidden' : ''}>Déconnexion</span>
              </button>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <div className={[
        'flex-1 flex flex-col min-w-0 transition-[margin-left] duration-300',
        collapsed ? 'lg:ml-16' : 'lg:ml-60',
      ].join(' ')}>

        {/* Barre mobile */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center h-14 px-4 gap-3 bg-white border-b border-slate-200 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/">
            <DrivesOnLogo variant="light" size="sm" />
          </Link>
        </div>

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}

// ── Tooltip (icône uniquement) ────────────────────────────────────────────────

function Tooltip({
  label, show, children,
}: {
  label: string; show: boolean; children: React.ReactNode
}) {
  if (!show) return <>{children}</>
  return (
    <div className="relative group/tip hidden lg:block">
      {children}
      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
        {label}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
      </div>
    </div>
  )
}
