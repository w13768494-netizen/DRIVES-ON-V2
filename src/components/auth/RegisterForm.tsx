'use client'

import { useState }      from 'react'
import { Loader2, Eye, EyeOff, ShieldCheck, Truck, CheckCircle2 } from 'lucide-react'
import { signUp }        from '@/services/authService'
import type { UserRole } from '@/types/session'

type RegistrableRole = Exclude<UserRole, 'admin'>

const ROLES: { id: RegistrableRole; label: string; desc: string; icon: React.ReactNode }[] = [
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

export function RegisterForm() {
  const [role, setRole]               = useState<RegistrableRole>('assisteur')
  const [fullName, setFullName]       = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [done, setDone]               = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setError(null)
    setLoading(true)

    const { error: err } = await signUp(email.trim(), password, role, fullName.trim(), companyName.trim())
    if (err) { setError(err); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-green-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Compte créé !</h3>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Un email de confirmation a été envoyé à <strong>{email}</strong>.
            Cliquez sur le lien pour activer votre compte.
          </p>
        </div>
        <a href="/login" className="inline-block text-brand-500 hover:text-brand-600 text-sm font-semibold">
          Retour à la connexion →
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Sélection du rôle */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Votre espace</span>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={[
                'flex flex-col gap-2.5 p-3.5 rounded-2xl border-2 text-left transition-all',
                role === r.id
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 bg-white hover:border-slate-300',
              ].join(' ')}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                role === r.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                {r.icon}
              </div>
              <div>
                <p className={`text-sm font-bold leading-tight ${
                  role === r.id ? 'text-brand-700' : 'text-slate-700'
                }`}>{r.label}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-tight">{r.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Nom complet */}
      <input
        type="text"
        value={fullName}
        onChange={e => { setFullName(e.target.value); setError(null) }}
        placeholder="Nom complet"
        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
        required
      />

      {/* Entreprise */}
      <input
        type="text"
        value={companyName}
        onChange={e => setCompanyName(e.target.value)}
        placeholder="Entreprise (optionnel)"
        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
      />

      {/* Email */}
      <input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(null) }}
        placeholder="Email professionnel"
        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all"
        autoComplete="email"
        required
      />

      {/* Mot de passe */}
      <div className="relative">
        <input
          type={showPwd ? 'text' : 'password'}
          value={password}
          onChange={e => { setPassword(e.target.value); setError(null) }}
          placeholder="Mot de passe (min. 8 caractères)"
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

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!email || !password || !fullName || loading}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Création…</>
          : 'Créer mon compte →'
        }
      </button>

      <p className="text-center text-xs text-slate-400">
        Déjà un compte ?{' '}
        <a href="/login" className="text-brand-500 hover:text-brand-600 font-medium">
          Se connecter
        </a>
      </p>
    </form>
  )
}
