'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format }                               from 'date-fns'
import { fr }                                   from 'date-fns/locale'
import {
  RefreshCw, Building2, AlertTriangle, CalendarCheck, CheckCircle2,
  Loader2, FileText, Car, Bell, CreditCard, ExternalLink, Clock,
} from 'lucide-react'
import { RentalStats }             from '@/components/loueur/RentalStats'
import { LoueurOperationsDrawer }  from '@/components/loueur/LoueurOperationsDrawer'
import type { DrawerState }        from '@/components/loueur/LoueurOperationsDrawer'
import { getMyAgencies, type RentalAgencyRow } from '@/services/rentalAgencyService'
import { getReceivedRequests, loueurConfirmReturn, loueurReportNonReturn } from '@/services/loueurService'
import { respondToExtension }      from '@/services/requestService'
import { getSession }              from '@/services/currentSessionService'
import { getEndDate }              from '@/lib/rentalDates'
import { VEHICLE_CATEGORY_LABELS } from '@/types/vehicleCategory'
import type { ReceivedRequest }    from '@/types/loueur'
import type { MockSession }        from '@/types/session'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr()   { return new Date().toISOString().split('T')[0] }
function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── Inline return form ────────────────────────────────────────────────────────

type ReturnInlineStep = 'idle' | 'confirm' | 'return_form' | 'non_return_form' | 'done'

interface ReturnInlineState {
  step:  ReturnInlineStep
  date:  string
  time:  string
  note:  string
  error: string | null
}

const defaultReturnState = (): ReturnInlineState => ({
  step: 'idle', date: todayStr(), time: nowTimeStr(), note: '', error: null,
})

// ── ActionItem types ──────────────────────────────────────────────────────────

type ActionItemKind =
  | { kind: 'retour';    request: ReceivedRequest }
  | { kind: 'extension'; request: ReceivedRequest; extId: string; days: number }
  | { kind: 'nouvelle';  request: ReceivedRequest }
  | { kind: 'paiement';  request: ReceivedRequest }

// ── Inline Return Action ──────────────────────────────────────────────────────

function InlineReturnAction({
  request,
  state,
  loading,
  onYes,
  onNo,
  onDateChange,
  onTimeChange,
  onNoteChange,
  onConfirmReturn,
  onReportNonReturn,
  onBack,
}: {
  request:           ReceivedRequest
  state:             ReturnInlineState
  loading:           boolean
  onYes:             () => void
  onNo:              () => void
  onDateChange:      (v: string) => void
  onTimeChange:      (v: string) => void
  onNoteChange:      (v: string) => void
  onConfirmReturn:   () => void
  onReportNonReturn: () => void
  onBack:            () => void
}) {
  const endDate   = getEndDate(request)
  const isOverdue = new Date() >= endDate

  if (state.step === 'confirm') {
    return (
      <div className={`mt-3 rounded-xl border p-3 flex flex-col gap-3 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
        <p className={`text-xs font-bold ${isOverdue ? 'text-red-800' : 'text-blue-800'}`}>
          Le véhicule a-t-il bien été restitué ?
        </p>
        <div className="flex gap-2">
          <button
            onClick={onYes}
            className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            ✓ Oui, rentré
          </button>
          <button
            onClick={onNo}
            className="flex-1 py-2 rounded-lg text-xs font-bold bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 transition-colors"
          >
            ✗ Non rendu
          </button>
        </div>
        <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600 text-center transition-colors">
          Annuler
        </button>
      </div>
    )
  }

  if (state.step === 'return_form') {
    return (
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col gap-3">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Date et heure du retour</p>
        <div className="flex gap-2">
          <input
            type="date"
            value={state.date}
            max={todayStr()}
            onChange={e => onDateChange(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400"
          />
          <input
            type="time"
            value={state.time}
            onChange={e => onTimeChange(e.target.value)}
            className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400/50 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          <FileText className="w-3 h-3 shrink-0" />
          <span>Pensez à uploader contrat + facture dans le dossier.</span>
        </div>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onConfirmReturn}
            disabled={loading || !state.date || !state.time}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CalendarCheck className="w-3 h-3" />}
            Confirmer
          </button>
          <button onClick={onBack} className="px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-200 transition-colors">
            ←
          </button>
        </div>
      </div>
    )
  }

  if (state.step === 'non_return_form') {
    return (
      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 flex flex-col gap-3">
        <p className="text-xs font-bold text-red-800">Signalement de non-retour à Drives On</p>
        <textarea
          value={state.note}
          onChange={e => onNoteChange(e.target.value)}
          rows={2}
          placeholder="Précision optionnelle…"
          className="w-full border border-red-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-red-400/50 resize-none bg-white"
        />
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onReportNonReturn}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60 transition-colors"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
            Signaler
          </button>
          <button onClick={onBack} className="px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-200 transition-colors">
            ←
          </button>
        </div>
      </div>
    )
  }

  if (state.step === 'done') {
    return (
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <p className="text-xs text-emerald-800 font-semibold">Confirmé — dossier mis à jour.</p>
      </div>
    )
  }

  return null
}

// ── Action Center ─────────────────────────────────────────────────────────────

function ActionCenter({
  items,
  requests,
  onRequestsChange,
  onOpenDrawer,
}: {
  items:            ActionItemKind[]
  requests:         ReceivedRequest[]
  onRequestsChange: (updated: ReceivedRequest) => void
  onOpenDrawer:     (state: DrawerState) => void
}) {
  const [returnStates,  setReturnStates]  = useState<Record<string, ReturnInlineState>>({})
  const [extLoading,    setExtLoading]    = useState<Record<string, boolean>>({})
  const [extDone,       setExtDone]       = useState<Record<string, 'acceptee' | 'refusee'>>({})
  const [returnLoading, setReturnLoading] = useState<Record<string, boolean>>({})

  function getReturnState(id: string): ReturnInlineState {
    return returnStates[id] ?? defaultReturnState()
  }

  function setReturnState(id: string, patch: Partial<ReturnInlineState>) {
    setReturnStates(prev => ({
      ...prev,
      [id]: { ...(prev[id] ?? defaultReturnState()), ...patch },
    }))
  }

  async function handleConfirmReturn(request: ReceivedRequest) {
    const s = getReturnState(request.id)
    setReturnLoading(prev => ({ ...prev, [request.id]: true }))
    setReturnState(request.id, { error: null })
    try {
      const returnedAt = new Date(`${s.date}T${s.time}`)
      const updated = await loueurConfirmReturn(request.id, returnedAt)
      if (!updated) {
        setReturnState(request.id, { error: "Impossible de confirmer. Ouvrez le dossier." })
        return
      }
      setReturnState(request.id, { step: 'done' })
      onRequestsChange({ ...request, ...updated })
    } catch {
      setReturnState(request.id, { error: 'Une erreur est survenue.' })
    } finally {
      setReturnLoading(prev => ({ ...prev, [request.id]: false }))
    }
  }

  async function handleReportNonReturn(request: ReceivedRequest) {
    const s = getReturnState(request.id)
    setReturnLoading(prev => ({ ...prev, [request.id]: true }))
    setReturnState(request.id, { error: null })
    try {
      const updated = await loueurReportNonReturn(request.id, s.note || undefined)
      if (!updated) {
        setReturnState(request.id, { error: 'Impossible d\'envoyer. Ouvrez le dossier.' })
        return
      }
      setReturnState(request.id, { step: 'done' })
      onRequestsChange({ ...request, ...updated })
    } catch {
      setReturnState(request.id, { error: 'Une erreur est survenue.' })
    } finally {
      setReturnLoading(prev => ({ ...prev, [request.id]: false }))
    }
  }

  async function handleExtension(request: ReceivedRequest, extId: string, response: 'acceptee' | 'refusee') {
    setExtLoading(prev => ({ ...prev, [extId]: true }))
    try {
      const updated = await respondToExtension(request.id, extId, response)
      if (updated) {
        setExtDone(prev => ({ ...prev, [extId]: response }))
        onRequestsChange({ ...request, ...updated })
      }
    } finally {
      setExtLoading(prev => ({ ...prev, [extId]: false }))
    }
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-3 shadow-sm">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Aucune action requise</p>
          <p className="text-xs text-slate-400 mt-0.5">Tout est à jour — revenez plus tard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const r       = item.request
        const vehicle = VEHICLE_CATEGORY_LABELS[r.vehicleCategory] ?? r.vehicleCategory

        if (item.kind === 'retour') {
          const rs      = getReturnState(r.id)
          const loading = returnLoading[r.id] ?? false
          const isOverdue = r.status === 'overdue'

          return (
            <div
              key={`retour-${r.id}`}
              className={`bg-white rounded-2xl border shadow-sm p-4 ${isOverdue ? 'border-red-200' : 'border-orange-200'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? 'bg-red-100' : 'bg-orange-100'}`}>
                    {isOverdue
                      ? <AlertTriangle className="w-4 h-4 text-red-600" />
                      : <Car           className="w-4 h-4 text-orange-600" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                      {r.sinistre.lastName} {r.sinistre.firstName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{vehicle} · {r.dossierNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isOverdue && (
                    <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Overdue</span>
                  )}
                  {rs.step === 'idle' && (
                    <button
                      onClick={() => setReturnState(r.id, { step: 'confirm' })}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                        isOverdue
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                      }`}
                    >
                      Confirmer
                    </button>
                  )}
                  <a
                    href={`/loueur/demandes/${r.id}?tab=retour`}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {rs.step !== 'idle' && (
                <InlineReturnAction
                  request={r}
                  state={rs}
                  loading={loading}
                  onYes={() => setReturnState(r.id, { step: 'return_form' })}
                  onNo={() => setReturnState(r.id, { step: 'non_return_form' })}
                  onDateChange={v => setReturnState(r.id, { date: v })}
                  onTimeChange={v => setReturnState(r.id, { time: v })}
                  onNoteChange={v => setReturnState(r.id, { note: v })}
                  onConfirmReturn={() => handleConfirmReturn(r)}
                  onReportNonReturn={() => handleReportNonReturn(r)}
                  onBack={() => setReturnState(r.id, { step: 'idle' })}
                />
              )}
            </div>
          )
        }

        if (item.kind === 'extension') {
          const { extId, days } = item
          const done    = extDone[extId]
          const loading = extLoading[extId] ?? false

          return (
            <div key={`ext-${extId}`} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                      {r.sinistre.lastName} {r.sinistre.firstName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Prolongation +{days}j · {vehicle} · {r.dossierNumber}
                    </p>
                  </div>
                </div>
                <a
                  href={`/loueur/demandes/${r.id}?tab=prolongations`}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="mt-3">
                {done ? (
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${done === 'acceptee' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${done === 'acceptee' ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <p className={`text-xs font-semibold ${done === 'acceptee' ? 'text-emerald-800' : 'text-slate-600'}`}>
                      Prolongation {done === 'acceptee' ? 'acceptée' : 'refusée'}
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExtension(r, extId, 'acceptee')}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Accepter
                    </button>
                    <button
                      onClick={() => handleExtension(r, extId, 'refusee')}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-60 transition-colors"
                    >
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        }

        if (item.kind === 'nouvelle') {
          return (
            <div key={`new-${r.id}`} className="bg-white rounded-2xl border border-blue-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                      {r.sinistre.lastName} {r.sinistre.firstName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {vehicle} · {r.durationDays}j · {r.dossierNumber}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenDrawer({ request: r, mode: 'repondre' })}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Répondre
                </button>
              </div>
            </div>
          )
        }

        if (item.kind === 'paiement') {
          return (
            <div key={`pay-${r.id}`} className="bg-white rounded-2xl border border-violet-200 shadow-sm p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                      {r.sinistre.lastName} {r.sinistre.firstName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{vehicle} · {r.dossierNumber}</p>
                  </div>
                </div>
                <a
                  href={`/loueur/demandes/${r.id}?tab=finance`}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  Dossier
                </a>
              </div>
            </div>
          )
        }

        return null
      })}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function LoueurDashboardPage() {
  const [requests,   setRequests]     = useState<ReceivedRequest[]>([])
  const [agencies,   setAgencies]     = useState<RentalAgencyRow[] | null>(null)
  const [session,    setSessionState] = useState<MockSession | null>(null)
  const [loading,    setLoading]      = useState(true)
  const [refreshing, setRefreshing]   = useState(false)
  const [drawer,     setDrawer]       = useState<DrawerState | null>(null)
  const agenciesRef = useRef<RentalAgencyRow[]>([])

  async function load(agencies: RentalAgencyRow[]) {
    const received = await getReceivedRequests(agencies)
    setRequests(received)
  }

  useEffect(() => {
    setSessionState(getSession())
    getMyAgencies().then(async myAgencies => {
      agenciesRef.current = myAgencies
      setAgencies(myAgencies)
      await load(myAgencies)
      setLoading(false)
    })
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    await load(agenciesRef.current)
    setRefreshing(false)
  }

  function handleRequestUpdate(updated: ReceivedRequest) {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
  }

  const today = format(new Date(), "EEEE d MMMM", { locale: fr })

  const visible = useMemo(() =>
    requests.filter(r => !(r.confirmedAgencyId && r.confirmedAgencyId !== r.agencyId)),
    [requests]
  )

  const actionItems = useMemo<ActionItemKind[]>(() => {
    const items: ActionItemKind[] = []

    visible
      .filter(r => r.status === 'overdue')
      .forEach(r => items.push({ kind: 'retour', request: r }))

    visible
      .filter(r => !['overdue', 'litige_degat', 'cloturee', 'refusee'].includes(r.status))
      .forEach(r => {
        const pending = (r.extensions ?? []).filter(e => e.status === 'en_attente')
        pending.forEach(ext => items.push({ kind: 'extension', request: r, extId: ext.id, days: ext.requestedDays }))
      })

    visible
      .filter(r => r.status === 'confirmee' && getEndDate(r) <= new Date())
      .forEach(r => items.push({ kind: 'retour', request: r }))

    visible
      .filter(r => ['envoyee', 'recue'].includes(r.status))
      .forEach(r => items.push({ kind: 'nouvelle', request: r }))

    visible
      .filter(r => r.status === 'honoree')
      .forEach(r => items.push({ kind: 'paiement', request: r }))

    return items
  }, [visible])

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-1 capitalize">{today}</p>
        <h1 className="text-2xl font-black text-slate-900">
          {session ? `Bonjour, ${session.userName.split(' ')[0]}` : 'Tableau de bord'}
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {session?.company ?? 'Demandes reçues par vos agences'}
        </p>
      </div>
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 mt-1"
        aria-label="Actualiser"
      >
        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <StatsSkeleton />
      </div>
    )
  }

  if (agencies !== null && agencies.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <div className="flex flex-col items-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-brand-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-700">Votre espace loueur est en cours de configuration</p>
            <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Aucune agence n'est encore rattachée à votre compte.
              L'équipe Drives On configurera votre espace prochainement.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6">

        {header}

        <RentalStats requests={visible} />

        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Actions requises</h2>
            {actionItems.length > 0 && (
              <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full tabular-nums">
                {actionItems.length}
              </span>
            )}
          </div>
          <ActionCenter
            items={actionItems}
            requests={visible}
            onRequestsChange={handleRequestUpdate}
            onOpenDrawer={setDrawer}
          />
        </section>

      </div>

      <LoueurOperationsDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        onSuccess={updated => {
          handleRequestUpdate(updated)
          setDrawer(null)
        }}
      />
    </>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-3 shadow-sm animate-pulse">
          <div className="w-8 h-8 rounded-xl bg-slate-100" />
          <div className="space-y-2">
            <div className="h-8 w-10 bg-slate-200 rounded" />
            <div className="h-3 w-16 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
