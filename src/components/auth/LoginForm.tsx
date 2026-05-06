'use client'

import { useState }     from 'react'
import { useRouter }    from 'next/navigation'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { signIn }       from '@/services/authService'
import type { UserRole } from '@/types/session'

const DEST: Record<UserRole, string> = {
  assisteur: '/assisteur',
  loueur:    '/loueur/dashboard',
  admin:     '/admin',
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { session, error: err } = await signIn(email.trim(), password)
    if (err || !session) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }
    router.push(DEST[session.role] ?? '/login')
  }

  function clear() { setError(null) }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Adresse email
        </span>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); clear() }}
          placeholder="vous@entreprise.fr"
          className={[
            'w-full px-4 py-3 rounded-xl border text-sm',
            'focus:outline-none focus:ring-2 transition-all',
            error
              ? 'border-red-300 bg-red-50 focus:ring-red-200'
              : 'border-slate-200 bg-white focus:ring-brand-300',
          ].join(' ')}
          autoComplete="email"
          spellCheck={false}
          required
        />
      </div>

      {/* Mot de passe */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Mot de passe
        </span>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); clear() }}
            placeholder="••••••••••••"
            className={[
              'w-full px-4 py-3 pr-11 rounded-xl border text-sm',
              'focus:outline-none focus:ring-2 transition-all',
              error
                ? 'border-red-300 bg-red-50 focus:ring-red-200'
                : 'border-slate-200 bg-white focus:ring-brand-300',
            ].join(' ')}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={!email.trim() || !password || loading}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Connexion…</>
          : 'Accéder à mon espace →'
        }
      </button>

      <p className="text-center text-xs text-slate-400">
        Pas encore de compte ?{' '}
        <a href="/register" className="text-brand-500 hover:text-brand-600 font-medium">
          Créer un accès
        </a>
      </p>
    </form>
  )
}
