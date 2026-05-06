'use client'

import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import { LogOut, UserCircle2 } from 'lucide-react'
import { signOut, refreshSession } from '@/services/authService'
import { ASSISTANCE_USER_ROLE_LABELS, ASSISTANCE_USER_ROLE_COLORS } from '@/types/assistanceUser'
import type { AppSession } from '@/types/session'

export function SessionNavItem() {
  const router = useRouter()
  const [session, setSession] = useState<AppSession | null>(null)

  useEffect(() => {
    refreshSession().then(s => setSession(s))
  }, [])

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  if (!session) return null

  return (
    <div className="flex items-center gap-2">
      {/* Infos utilisateur */}
      <div className="hidden md:flex flex-col items-end leading-none gap-0.5">
        <span className="text-xs font-semibold text-slate-700">{session.userName}</span>
        <span className="text-xs text-slate-400">{session.company}</span>
      </div>

      {/* Badge rôle */}
      <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-2 py-1.5">
        <UserCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
        {session.companyRole ? (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full hidden sm:inline ${ASSISTANCE_USER_ROLE_COLORS[session.companyRole]}`}>
            {ASSISTANCE_USER_ROLE_LABELS[session.companyRole]}
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline capitalize">
            {session.role}
          </span>
        )}
      </div>

      {/* Déconnexion */}
      <button
        onClick={handleLogout}
        title="Se déconnecter"
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Déco.</span>
      </button>
    </div>
  )
}
