'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DrivesOnLogo } from '@/components/shared/DrivesOnLogo'
import { Users, MapPin, CalendarClock, UserPlus } from 'lucide-react'

const NAV = [
  { href: '/admin/reservations',    icon: CalendarClock, label: 'Réservations'      },
  { href: '/admin/demandes-acces',  icon: UserPlus,      label: 'Demandes d\'accès' },
  { href: '/admin/utilisateurs',    icon: Users,         label: 'Utilisateurs'      },
  { href: '/admin/deploiement',     icon: MapPin,        label: 'Déploiement'       },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

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
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-800">
          <p className="text-[10px] text-slate-600">© {new Date().getFullYear()} Drives On</p>
        </div>
      </aside>

      {/* ── Contenu ── */}
      <main className="flex-1 min-w-0 flex flex-col">
        {children}
      </main>
    </div>
  )
}
