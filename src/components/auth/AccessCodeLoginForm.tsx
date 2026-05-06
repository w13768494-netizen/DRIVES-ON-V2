'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Eye, EyeOff, ShieldCheck, Truck } from 'lucide-react'
import { authenticate } from '@/services/authMockService'
import type { UserRole } from '@/types/session'

const ROLES: { id: UserRole; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id:    'assisteur',
    label: 'Assisteur',
    desc:  'Créer et suivre les demandes',
    icon:  <ShieldCheck className="w-5 h-5" />,
  },
  {
    id:    'loueur',
    label: 'Loueur',
    desc:  'Recevoir et traiter les demandes',
    icon:  <Truck className="w-5 h-5" />,
  },
]

export function AccessCodeLoginForm() {
  const router = useRouter()
  const [role, setRole]         = useState<UserRole>('assisteur')
  const [username, setUsername] = useState('')
  const [code, setCode]         = useState('')
  const [showCode, setShowCode] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function clearError() { setError(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (role === 'assisteur' && !username.trim()) return
    if (!code.trim()) return
    setError(null)
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))

    const session = role === 'assisteur'
      ? authenticate('assisteur', username.trim().toLowerCase(), code.trim())
      : authenticate('loueur', code.trim())

    if (!session) {
      setError(
        role === 'assisteur'
          ? 'Identifiant ou code incorrect.'
          : 'Code d\'accès incorrect.',
      )
      setLoading(false)
      return
    }
    router.push(role === 'assisteur' ? '/assisteur' : '/loueur/dashboard')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Sélection du rôle */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Votre espace</span>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => { setRole(r.id); clearError() }}
              className={[
                'flex flex-col gap-3 p-4 rounded-2xl border-2 text-left transition-all',
                role === r.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              ].join(' ')}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                role === r.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {r.icon}
              </div>
              <div>
                <p className={`text-sm font-bold leading-tight ${
                  role === r.id ? 'text-brand-700' : 'text-slate-700'
                }`}>
                  {r.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 leading-tight">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Identifiant (assisteur uniquement) */}
      {role === 'assisteur' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Identifiant
          </span>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); clearError() }}
            placeholder="ex : sophie.marchand"
            className={[
              'w-full px-4 py-3 rounded-xl border text-sm',
              'focus:outline-none focus:ring-2 transition-all',
              error
                ? 'border-red-300 bg-red-50 focus:ring-red-200'
                : 'border-slate-200 bg-white focus:ring-brand-300',
            ].join(' ')}
            autoComplete="username"
            spellCheck={false}
          />
        </div>
      )}

      {/* Code d'accès */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {role === 'assisteur' ? 'Code d\'accès' : 'Code d\'accès'}
        </span>
        <div className="relative">
          <input
            type={showCode ? 'text' : 'password'}
            value={code}
            onChange={e => { setCode(e.target.value); clearError() }}
            placeholder="••••••••••••"
            className={[
              'w-full px-4 py-3 pr-11 rounded-xl border text-sm font-mono tracking-widest',
              'focus:outline-none focus:ring-2 transition-all',
              error
                ? 'border-red-300 bg-red-50 focus:ring-red-200'
                : 'border-slate-200 bg-white focus:ring-brand-300',
            ].join(' ')}
            autoComplete="current-password"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setShowCode(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={(role === 'assisteur' && !username.trim()) || !code.trim() || loading}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Vérification…</>
          : 'Accéder à mon espace →'
        }
      </button>
    </form>
  )
}
