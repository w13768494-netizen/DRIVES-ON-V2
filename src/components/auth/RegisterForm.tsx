'use client'

import { useState }      from 'react'
import { Loader2, ShieldCheck, Truck, CheckCircle2 } from 'lucide-react'
import { createClient }  from '@/lib/supabase/client'
import type { AccessRequestRole } from '@/types/accessRequest'

const ROLES: { id: AccessRequestRole; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id:    'assisteur',
    label: 'Assisteur',
    desc:  'Compagnie d\'assurance',
    icon:  <ShieldCheck className="w-5 h-5" />,
  },
  {
    id:    'loueur',
    label: 'Loueur',
    desc:  'Société de location',
    icon:  <Truck className="w-5 h-5" />,
  },
]

export function AccessRequestForm() {
  const [role, setRole]               = useState<AccessRequestRole>('loueur')
  const [fullName, setFullName]       = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail]             = useState('')
  const [phone, setPhone]             = useState('')
  const [message, setMessage]         = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [done, setDone]               = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: err } = await supabase.from('access_requests').insert({
      email:        email.trim(),
      full_name:    fullName.trim(),
      company_name: companyName.trim() || null,
      role,
      phone:        phone.trim() || null,
      message:      message.trim() || null,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }
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
          <h3 className="font-bold text-slate-900 text-lg">Demande envoyée !</h3>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            L'équipe Drives On va examiner votre dossier et vous contacter à{' '}
            <strong>{email}</strong> pour finaliser votre accès.
          </p>
        </div>
        <a href="/login" className="inline-block text-brand-500 hover:text-brand-600 text-sm font-semibold">
          Retour à la connexion →
        </a>
      </div>
    )
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Sélection du type de partenaire */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Votre activité</span>
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

      <input
        type="text"
        value={fullName}
        onChange={e => { setFullName(e.target.value); setError(null) }}
        placeholder="Nom complet *"
        className={inputCls}
        required
      />

      <input
        type="text"
        value={companyName}
        onChange={e => setCompanyName(e.target.value)}
        placeholder="Société / agence *"
        className={inputCls}
        required
      />

      <input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError(null) }}
        placeholder="Email professionnel *"
        className={inputCls}
        autoComplete="email"
        required
      />

      <input
        type="tel"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        placeholder="Téléphone (optionnel)"
        className={inputCls}
      />

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Message (optionnel) — décrivez votre activité, votre zone géographique…"
        rows={3}
        className={`${inputCls} resize-none`}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!email || !fullName || !companyName || loading}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
      >
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi…</>
          : 'Envoyer ma demande →'
        }
      </button>

      <p className="text-center text-xs text-slate-400">
        Déjà partenaire ?{' '}
        <a href="/login" className="text-brand-500 hover:text-brand-600 font-medium">
          Se connecter
        </a>
      </p>
    </form>
  )
}
