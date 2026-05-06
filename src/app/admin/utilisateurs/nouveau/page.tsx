'use client'

import { useState }    from 'react'
import { useRouter }   from 'next/navigation'
import { Loader2, ShieldCheck, Truck, Send, ArrowLeft } from 'lucide-react'
import type { AccessRequestRole } from '@/types/accessRequest'

const ROLES: { id: AccessRequestRole; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'loueur',    label: 'Loueur',    desc: 'Société de location',       icon: <Truck       className="w-5 h-5" /> },
  { id: 'assisteur', label: 'Assisteur', desc: 'Compagnie d\'assurance',    icon: <ShieldCheck className="w-5 h-5" /> },
]

const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 transition-all'

export default function NouveauPartenairePage() {
  const router = useRouter()
  const [role, setRole]               = useState<AccessRequestRole>('loueur')
  const [fullName, setFullName]       = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [done, setDone]               = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/admin/invite-user', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.trim(), role, full_name: fullName.trim(), company_name: companyName.trim() || null }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Erreur lors de l\'invitation.'); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
          <Send className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-lg font-black text-slate-900">Invitation envoyée</h2>
        <p className="text-sm text-slate-500 max-w-xs">
          Un email d'invitation a été envoyé à <strong>{email}</strong>.
          Le partenaire recevra un lien pour définir son mot de passe.
        </p>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => { setDone(false); setEmail(''); setFullName(''); setCompanyName('') }}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Inviter un autre partenaire
          </button>
          <button
            onClick={() => router.push('/admin/utilisateurs')}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Retour aux utilisateurs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-6 py-10 gap-6">

      <button
        onClick={() => router.push('/admin/utilisateurs')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div>
        <h1 className="text-2xl font-black text-slate-900">Inviter un partenaire</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Un email avec un lien d'accès sera envoyé automatiquement.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">

        {/* Rôle */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Type de partenaire</span>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id)}
                className={[
                  'flex flex-col gap-2 p-3.5 rounded-2xl border-2 text-left transition-all',
                  role === r.id ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300',
                ].join(' ')}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  role === r.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {r.icon}
                </div>
                <div>
                  <p className={`text-sm font-bold ${role === r.id ? 'text-brand-700' : 'text-slate-700'}`}>{r.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Nom complet *"
            className={inputCls}
            required
          />
          <input
            type="text"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Société / agence"
            className={inputCls}
          />
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            placeholder="Email professionnel *"
            className={inputCls}
            autoComplete="off"
            required
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <p className="text-xs text-slate-400">
          Le rôle sera défini selon votre sélection. Le partenaire ne pourra pas le modifier.
        </p>

        <button
          type="submit"
          disabled={!email || !fullName || loading}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi en cours…</>
            : <><Send className="w-4 h-4" />Envoyer l'invitation</>
          }
        </button>
      </form>
    </div>
  )
}
