'use client'

import Link            from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { DrivesOnLogo } from '@/components/shared/DrivesOnLogo'
import { Users, MapPin, CalendarClock, UserPlus, BarChart2, CreditCard, LogOut, Zap, Bell } from 'lucide-react'
import { signOut }     from '@/services/authService'

const NAV = [
  { href: '/admin/operations',                icon: Zap,           label: 'Opérations',          exact: false, critical: true },
  { href: '/admin/reservations',              icon: CalendarClock, label: 'Réservations',        exact: false },
  { href: '/admin/finance',                   icon: CreditCard,    label: 'Finance',             exact: false },
  { href: '/admin/demandes-acces',            icon: UserPlus,      label: 'Demandes d\'accès',   exact: false },
  { href: '/admin/utilisateurs',              icon: Users,         label: 'Utilisateurs',        exact: false },
  { href: '/admin/deploiement',               icon: MapPin,        label: 'Déploiement',         exact: true  },
  { href: '/admin/deploiement/national',      icon: BarChart2,     label: 'Analytics nationales', exact: false },
  { href: '/admin/notifications',             icon: Bell,          label: 'Notifications',        exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-dvh bg-slate-50 flex">

      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 bg-slate-900 flex flex-col sticky top-0 h-screen">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-800">
          <Link href="/">
            <DrivesOnLogo variant="dark" size="sm" />
          </Link>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-2">
            Administration
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, icon: Icon, label, exact, critical }) => {
            const active = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? critical ? 'bg-red-500/20 text-red-300' : 'bg-white/10 text-white'
                    : critical ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="relative shrink-0">
                  <Icon className="w-4 h-4" />
                  {critical && !active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  )}
                </span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-white/5 transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Se déconnecter
          </button>
          <p className="text-[10px] text-slate-600 px-3">© {new Date().getFullYear()} Drives On</p>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  )
}
