'use client'

import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import { Loader2 }             from 'lucide-react'
import { createClient }        from '@/lib/supabase/client'
import { setSession }          from '@/services/currentSessionService'
import type { UserRole, AppSession } from '@/types/session'

interface Props {
  requiredRole: UserRole
  children:     React.ReactNode
}

// Garde côté client — évite le flash de contenu protégé pendant la navigation.
// Le middleware.ts est la barrière principale (serveur). Ce composant est
// une défense secondaire qui s'applique après l'hydratation React.
//
// Lit le rôle depuis profiles (source de vérité), jamais user_metadata.
export function ProtectedRoute({ requiredRole, children }: Props) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      const role = profile?.role as UserRole | undefined
      if (profileError || !role || role !== requiredRole) {
        router.replace('/login')
        return
      }

      // Ré-hydrater le cache localStorage après rechargement de page
      const meta = user.user_metadata
      const session: AppSession = {
        role,
        userId:    user.id,
        userName:  meta.full_name ?? user.email ?? '',
        company:   meta.company_name ?? '',
        createdAt: new Date().toISOString(),
      }
      setSession(session)
      setAuthorized(true)
    })
  }, [requiredRole, router])

  if (authorized !== true) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
