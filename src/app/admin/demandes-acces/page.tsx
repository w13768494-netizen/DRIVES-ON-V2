'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, ShieldCheck, Truck, Mail, Phone, Clock, CheckCircle2, XCircle, MessageSquare, Send } from 'lucide-react'
import { format }        from 'date-fns'
import { fr }            from 'date-fns/locale'
import type { AccessRequest } from '@/types/accessRequest'

const ROLE_LABELS = { loueur: 'Loueur', assisteur: 'Assisteur' } as const
const ROLE_ICONS  = {
  loueur:    <Truck      className="w-3.5 h-3.5" />,
  assisteur: <ShieldCheck className="w-3.5 h-3.5" />,
}
const ROLE_COLORS = {
  loueur:    'bg-orange-50 text-brand-600',
  assisteur: 'bg-blue-50 text-blue-600',
}

type Tab = 'pending' | 'approved' | 'rejected'

export default function DemandesAccesPage() {
  const [tab, setTab]               = useState<Tab>('pending')
  const [requests, setRequests]     = useState<AccessRequest[]>([])
  const [loading, setLoading]       = useState(true)
  const [inviting, setInviting]     = useState<string | null>(null)
  const [rejecting, setRejecting]   = useState<string | null>(null)
  const [feedback, setFeedback]     = useState<Record<string, string>>({})
  const [loadError, setLoadError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const res = await fetch(`/api/admin/access-requests?status=${tab}`)
    const json = await res.json()
    if (!res.ok) { setLoadError(json.error ?? 'Erreur de chargement'); setLoading(false); return }
    setRequests(json as AccessRequest[])
    setLoading(false)
  }, [tab])

  useEffect(() => { load() }, [load])

  async function invite(req: AccessRequest) {
    setInviting(req.id)
    setFeedback(f => ({ ...f, [req.id]: '' }))

    const res = await fetch('/api/admin/invite-user', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        email:        req.email,
        role:         req.role,
        full_name:    req.full_name,
        company_name: req.company_name,
        requestId:    req.id,
      }),
    })
    const json = await res.json()
    if (res.ok) {
      setFeedback(f => ({ ...f, [req.id]: 'Invitation envoyée ✓' }))
      setTimeout(load, 1500)
    } else if (res.status === 409) {
      setFeedback(f => ({ ...f, [req.id]: '__EXISTS__' }))
    } else {
      setFeedback(f => ({ ...f, [req.id]: json.error ?? 'Erreur' }))
    }
    setInviting(null)
  }

  async function sendReset(req: AccessRequest) {
    const res = await fetch('/api/admin/send-reset', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: req.email, full_name: req.full_name }),
    })
    if (res.ok) {
      setFeedback(f => ({ ...f, [req.id]: 'Lien de connexion envoyé ✓' }))
    } else {
      const json = await res.json()
      setFeedback(f => ({ ...f, [req.id]: json.error ?? 'Erreur' }))
    }
  }

  async function reject(req: AccessRequest) {
    setRejecting(req.id)
    await fetch('/api/admin/access-requests', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: req.id, status: 'rejected' }),
    })
    setTimeout(load, 400)
    setRejecting(null)
  }

  const tabs: { id: Tab; label: string; color: string }[] = [
    { id: 'pending',  label: 'En attente',  color: 'text-amber-600' },
    { id: 'approved', label: 'Approuvées',  color: 'text-green-600' },
    { id: 'rejected', label: 'Refusées',    color: 'text-slate-400' },
  ]

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-6 py-10 gap-6">

      <div>
        <h1 className="text-2xl font-black text-slate-900">Demandes d'accès</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Validez les candidatures partenaires et envoyez les invitations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === t.id
                ? 'bg-slate-900 text-white shadow-sm'
                : `text-slate-500 hover:text-slate-800 hover:bg-slate-50`
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Erreur de chargement */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
          Erreur Supabase : {loadError}
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <CheckCircle2 className="w-8 h-8 text-slate-200" />
          <p className="text-sm text-slate-400">Aucune demande {tab === 'pending' ? 'en attente' : tab === 'approved' ? 'approuvée' : 'refusée'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-2">
                  {/* En-tête */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[req.role]}`}>
                      {ROLE_ICONS[req.role]} {ROLE_LABELS[req.role]}
                    </span>
                    <span className="text-sm font-black text-slate-900">{req.full_name}</span>
                    {req.company_name && (
                      <span className="text-sm text-slate-500">· {req.company_name}</span>
                    )}
                  </div>

                  {/* Coordonnées */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{req.email}</span>
                    {req.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{req.phone}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(req.created_at), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                    </span>
                  </div>

                  {/* Message */}
                  {req.message && (
                    <div className="flex gap-2 bg-slate-50 rounded-xl p-3 mt-1">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-600 leading-relaxed">{req.message}</p>
                    </div>
                  )}

                  {/* Feedback inline */}
                  {feedback[req.id] && feedback[req.id] !== '__EXISTS__' && (
                    <p className={`text-xs font-medium ${feedback[req.id].includes('✓') ? 'text-green-600' : 'text-red-500'}`}>
                      {feedback[req.id]}
                    </p>
                  )}
                  {feedback[req.id] === '__EXISTS__' && (
                    <p className="text-xs text-amber-600 font-medium">
                      Ce compte existe déjà —{' '}
                      <button
                        type="button"
                        onClick={() => sendReset(req)}
                        className="underline underline-offset-2 font-semibold hover:text-amber-800"
                      >
                        Renvoyer un lien
                      </button>
                    </p>
                  )}
                </div>

                {/* Actions (uniquement sur les demandes en attente) */}
                {tab === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => reject(req)}
                      disabled={!!rejecting || !!inviting}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      {rejecting === req.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <XCircle className="w-3.5 h-3.5" />
                      }
                      Refuser
                    </button>
                    <button
                      onClick={() => invite(req)}
                      disabled={!!inviting || !!rejecting}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold disabled:opacity-40 transition-colors"
                    >
                      {inviting === req.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Send className="w-3.5 h-3.5" />
                      }
                      Inviter
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
