'use client'

import { useEffect, useState }  from 'react'
import { useRouter }             from 'next/navigation'
import { Loader2, Eye, EyeOff, KeyRound } from 'lucide-react'
import { createClient }          from '@/lib/supabase/client'
import { DrivesOnLogo }          from '@/components/shared/DrivesOnLogo'
import { getProfile }            from '@/services/profileService'
import type { UserRole }         from '@/types/session'

const DEST: Record<UserRole, string> = {
  assisteur: '/assisteur',
  loueur:    '/loueur/dashboard',
  admin:     '/admin',
}

export default function SetPasswordPage() {
  const router = useRouter()
  const [ready, setReady]       = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // getSession() détecte les tokens dans le hash (flux invitation)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setReady(true)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    if (password !== confirm)  { setError('Les mots de passe ne correspondent pas.'); return }
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: updateErr } = await supabase.auth.updateUser({ password })
    if (updateErr) { setError(updateErr.message); setLoading(false); return }

    // Lire le profil pour rediriger au bon espace
    const profile = await getProfile(supabase)
    if (!profile) {
      setError('Votre profil est introuvable. Veuillez contacter l\'administrateur Drives On.')
      setLoading(false)
      return
    }

    router.push(DEST[profile.role] ?? '/login')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="mb-8">
        <DrivesOnLogo variant="light" size="md" />
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-brand-500" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Définir mon mot de passe</h2>
            <p className="text-xs text-slate-500">Choisissez un mot de passe sécurisé pour votre compte.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="Nouveau mot de passe (min. 8 caractères)"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
              autoComplete="new-password"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <input
            type={showPwd ? 'text' : 'password'}
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setError(null) }}
            placeholder="Confirmer le mot de passe"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
            autoComplete="new-password"
            required
          />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={!password || !confirm || loading}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Enregistrement…</>
              : 'Accéder à mon espace →'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
