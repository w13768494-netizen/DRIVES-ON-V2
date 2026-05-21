'use client'

import { useState, useEffect }         from 'react'
import { X, ExternalLink, Loader2, CheckCircle2, Lock, CalendarCheck } from 'lucide-react'
import { format }                       from 'date-fns'
import { fr }                           from 'date-fns/locale'
import { addDays }                      from 'date-fns'
import { RentalResponseForm }           from '@/components/loueur/RentalResponseForm'
import { respondToRequest, loueurConfirmReturn } from '@/services/loueurService'
import { getEffectiveDuration }         from '@/types/request'
import { VEHICLE_CATEGORY_LABELS }      from '@/types/vehicleCategory'
import type { ReceivedRequest, LoueurAction } from '@/types/loueur'

// ── Types ─────────────────────────────────────────────────────────────────────

export type DrawerMode = 'repondre' | 'retour'

export interface DrawerState {
  request: ReceivedRequest
  mode:    DrawerMode
}

interface Props {
  state:     DrawerState | null
  onClose:   () => void
  onSuccess: (updated: ReceivedRequest) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr()  { return new Date().toISOString().split('T')[0] }
function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── Panel retour ──────────────────────────────────────────────────────────────

function ReturnPanel({
  request,
  onSuccess,
  onClose,
}: {
  request:   ReceivedRequest
  onSuccess: (r: ReceivedRequest) => void
  onClose:   () => void
}) {
  const [date,     setDate]     = useState(todayStr)
  const [time,     setTime]     = useState(nowTimeStr)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [done,     setDone]     = useState(false)

  const effectiveDays = getEffectiveDuration(request)
  const endDate       = addDays(new Date(request.dateNeeded), effectiveDays)
  const vehicle       = VEHICLE_CATEGORY_LABELS[request.vehicleCategory] ?? request.vehicleCategory

  async function handleConfirm() {
    setError(null)
    setLoading(true)
    try {
      const returnedAt = new Date(`${date}T${time}`)
      const updated    = await loueurConfirmReturn(request.id, returnedAt)
      if (!updated) {
        setError("Impossible de confirmer le retour — le dossier n'est peut-être plus dans le bon état.")
        return
      }
      setDone(true)
      setTimeout(() => onSuccess({ ...request, ...updated }), 800)
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer ou ouvrir le dossier.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <div>
          <p className="font-bold text-slate-900">Retour confirmé</p>
          <p className="text-sm text-slate-500 mt-1">Le dossier passe en attente de paiement.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Résumé dossier */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
        <p className="text-xs text-slate-500">{vehicle}</p>
        <p className="text-xs text-slate-400 mt-1">
          Retour prévu : {format(endDate, 'd MMM yyyy', { locale: fr })}
          {new Date() >= endDate && (
            <span className="ml-1.5 text-red-500 font-semibold">· Dépassé</span>
          )}
        </p>
      </div>

      {/* Date/heure */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Date et heure du retour</p>
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-xs text-slate-500">Date</label>
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={e => setDate(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
            />
          </div>
          <div className="w-28 flex flex-col gap-1">
            <label className="text-xs text-slate-500">Heure</label>
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400"
            />
          </div>
        </div>
      </div>

      {/* Erreur */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
        >
          {loading
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <CalendarCheck className="w-4 h-4" />
          }
          Confirmer le retour
        </button>
        <a
          href={`/loueur/demandes/${request.id}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir le dossier complet
        </a>
      </div>
    </div>
  )
}

// ── Panel répondre ────────────────────────────────────────────────────────────

function RepondrePanel({
  request,
  onSuccess,
  onClose,
}: {
  request:   ReceivedRequest
  onSuccess: (r: ReceivedRequest) => void
  onClose:   () => void
}) {
  const [error,  setError]  = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [done,   setDone]   = useState(false)

  const vehicle = VEHICLE_CATEGORY_LABELS[request.vehicleCategory] ?? request.vehicleCategory

  async function handleSubmit(action: LoueurAction) {
    setError(null)
    const updated = await respondToRequest(request.id, action)
    if (!updated) {
      setLocked(true)
      return
    }
    setDone(true)
    setTimeout(() => onSuccess({ ...request, ...updated }), 800)
  }

  if (locked) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center">
          <Lock className="w-7 h-7 text-slate-400" />
        </div>
        <div>
          <p className="font-bold text-slate-900">Demande déjà prise en charge</p>
          <p className="text-sm text-slate-500 mt-1">
            Cette demande vient d'être validée par un autre loueur.
            Restez réactif pour les prochaines — la rapidité fait toute la différence !
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Fermer
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <div>
          <p className="font-bold text-slate-900">Réponse envoyée</p>
          <p className="text-sm text-slate-500 mt-1">Le dossier a été mis à jour.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Résumé dossier */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex flex-col gap-1">
        <p className="text-xs text-slate-400 font-mono">{request.dossierNumber}</p>
        <p className="font-semibold text-slate-900">
          {request.sinistre.lastName} {request.sinistre.firstName}
        </p>
        <p className="text-xs text-slate-500">{vehicle} · {request.durationDays}j</p>
        <p className="text-xs text-slate-500 mt-0.5">{request.location.address}</p>
      </div>

      {/* Formulaire de réponse */}
      <RentalResponseForm
        request={request}
        onSubmit={handleSubmit}
      />

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <a
        href={`/loueur/demandes/${request.id}`}
        className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        Ouvrir le dossier complet
      </a>
    </div>
  )
}

// ── Drawer principal ──────────────────────────────────────────────────────────

export function LoueurOperationsDrawer({ state, onClose, onSuccess }: Props) {
  // Fermer avec Escape
  useEffect(() => {
    if (!state) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, onClose])

  const title = state?.mode === 'retour' ? 'Confirmer le retour' : 'Répondre à la demande'

  return (
    <>
      {/* Overlay */}
      <div
        className={[
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-200',
          state ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={[
          'fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-50',
          'flex flex-col transition-transform duration-300 ease-in-out',
          state ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto">
          {state?.mode === 'retour' && (
            <ReturnPanel
              request={state.request}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          )}
          {state?.mode === 'repondre' && (
            <RepondrePanel
              request={state.request}
              onSuccess={onSuccess}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </>
  )
}
