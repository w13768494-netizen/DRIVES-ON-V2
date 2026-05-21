'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link                                           from 'next/link'
import { format, addDays }                            from 'date-fns'
import { fr }                                         from 'date-fns/locale'
import {
  AlertTriangle, Zap, CalendarPlus, CreditCard, FileWarning,
  CheckCircle2, RefreshCw, ChevronRight, Clock, Building2,
  Bell, Check, X, Loader2,
} from 'lucide-react'
import { getAllRequests, respondToExtension }         from '@/services/requestService'
import { filterRequestsForUser }                      from '@/services/assistanceUserService'
import { getSession }                                 from '@/services/currentSessionService'
import { getEffectiveDuration }                       from '@/types/request'
import { VEHICLE_CATEGORY_LABELS }                    from '@/types/vehicleCategory'
import {
  computeOperationalFlags, relativeTime, PRIORITY_COLORS,
} from '@/lib/operationalPriority'
import {
  AssisteurOperationsDrawer,
} from '@/components/assisteur/AssisteurOperationsDrawer'
import type { AssisteurDrawerState }                  from '@/components/assisteur/AssisteurOperationsDrawer'
import type { AssistanceRequest }                     from '@/types/request'
import type { MockSession }                           from '@/types/session'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtensionModal {
  request:     AssistanceRequest
  extensionId: string
  days:        number
  response:    'acceptee' | 'refusee'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function endDate(r: AssistanceRequest): Date {
  return addDays(new Date(r.dateNeeded), getEffectiveDuration(r))
}

function fmtDate(d: Date): string {
  return format(d, 'd MMM', { locale: fr })
}

function minutesSince(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60_000)
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  icon, label, count, color, pulse, children,
}: {
  icon:     React.ReactNode
  label:    string
  count:    number
  color:    string
  pulse?:   boolean
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
          {icon}
          {label}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
          pulse
            ? 'bg-red-100 text-red-700 border-red-200'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  )
}

// ── Carte compacte (lecture seule) ────────────────────────────────────────────

function OpCard({ r, hint, accent }: { r: AssistanceRequest; hint: string; accent: string }) {
  const flags  = computeOperationalFlags(r)
  const colors = PRIORITY_COLORS[flags.priority]
  const vehicle = VEHICLE_CATEGORY_LABELS[r.vehicleCategory] ?? r.vehicleCategory

  return (
    <Link
      href={`/assisteur/demandes/${r.id}`}
      className={`flex items-stretch rounded-xl border overflow-hidden transition-all hover:shadow-md hover:-translate-y-px ${colors.border} ${colors.bg}`}
    >
      <div className={`w-1 shrink-0 ${accent}`} />
      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-mono text-xs text-slate-400 shrink-0">{r.dossierNumber}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
            {hint}
          </span>
        </div>
        <p className="font-semibold text-slate-900 text-sm truncate">
          {r.sinistre.lastName} {r.sinistre.firstName}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {vehicle} · {r.location.address}
        </p>
        {flags.deadlineLabel && (
          <p className={`text-xs font-semibold mt-1 ${colors.text}`}>
            {flags.deadlineLabel}
          </p>
        )}
      </div>
      <div className="flex items-center px-3 border-l border-slate-100 text-slate-400 shrink-0">
        <ChevronRight className="w-4 h-4" />
      </div>
    </Link>
  )
}

// ── Modal confirmation prolongation ───────────────────────────────────────────

function ExtensionConfirmModal({
  modal,
  onConfirm,
  onCancel,
  loading,
}: {
  modal:     ExtensionModal
  onConfirm: () => void
  onCancel:  () => void
  loading:   boolean
}) {
  const isAccept = modal.response === 'acceptee'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 flex flex-col gap-4">
        <div className={`flex items-center gap-3 p-3 rounded-xl ${isAccept ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
          {isAccept
            ? <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            : <X     className="w-5 h-5 text-red-600 shrink-0" />
          }
          <div>
            <p className={`font-semibold text-sm ${isAccept ? 'text-emerald-800' : 'text-red-800'}`}>
              {isAccept ? 'Accepter la prolongation' : 'Refuser la prolongation'}
            </p>
            <p className={`text-xs mt-0.5 ${isAccept ? 'text-emerald-700' : 'text-red-700'}`}>
              {modal.days} jour{modal.days > 1 ? 's' : ''} supplémentaire{modal.days > 1 ? 's' : ''} — dossier{' '}
              <span className="font-mono">{modal.request.dossierNumber}</span>
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600">
          {isAccept
            ? 'La durée de location sera prolongée. Le loueur sera notifié.'
            : 'Le loueur sera notifié du refus et pourra proposer une alternative.'}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-60 ${
              isAccept ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isAccept ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssisteurOperationsPage() {
  const [requests,   setRequests]   = useState<AssistanceRequest[]>([])
  const [session,    setSession]    = useState<MockSession | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [drawer,     setDrawer]     = useState<AssisteurDrawerState | null>(null)
  const [extModal,   setExtModal]   = useState<ExtensionModal | null>(null)
  const [extLoading, setExtLoading] = useState(false)
  const [extSuccess, setExtSuccess] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const s = getSession()
    setSession(s)
    const all = await getAllRequests()
    const filtered = s?.companyRole
      ? filterRequestsForUser(all, s.userId, s.companyRole)
      : all
    setRequests(filtered)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const now = useMemo(() => new Date(), [])

  function updateLocal(updated: AssistanceRequest) {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
    setDrawer(null)
  }

  async function handleExtensionConfirm() {
    if (!extModal) return
    setExtLoading(true)
    const updated = await respondToExtension(
      extModal.request.id,
      extModal.extensionId,
      extModal.response,
    )
    setExtLoading(false)
    if (updated) {
      setRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
      setExtSuccess(extModal.request.id + '-' + extModal.extensionId)
    }
    setExtModal(null)
  }

  void session

  // ── Catégorisation ────────────────────────────────────────────────────────────

  const overdue    = requests.filter(r => r.status === 'overdue')
  const litiges    = requests.filter(r => r.status === 'litige_degat')

  const urgences   = requests.filter(r =>
    r.requestType === 'immediate' &&
    ['envoyee', 'recue'].includes(r.status) &&
    minutesSince(r.createdAt) > 45
  )

  const extensions = requests.filter(r =>
    (r.extensions ?? []).some(e => e.status === 'en_attente') &&
    !['overdue', 'litige_degat', 'cloturee', 'refusee'].includes(r.status)
  )

  const sansLoueur = requests.filter(r =>
    ['envoyee', 'recue'].includes(r.status) &&
    !r.assignedAgencyId &&
    !(r.requestType === 'immediate' && minutesSince(r.createdAt) > 45)
  )

  const paiements  = requests.filter(r => r.status === 'honoree')

  const total = overdue.length + litiges.length + urgences.length +
                extensions.length + sansLoueur.length + paiements.length

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-red-500" />
              Opérations
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {total === 0
                ? 'Aucune action requise — tout est à jour.'
                : `${total} action${total > 1 ? 's' : ''} requise${total > 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>

        {/* État vide */}
        {total === 0 && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Tout est traité</p>
              <p className="text-sm text-slate-400 mt-1">Aucune demande ne nécessite votre attention immédiate.</p>
            </div>
          </div>
        )}

        {/* OVERDUE */}
        <Section
          icon={<AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
          label="Overdue — retour urgent"
          count={overdue.length}
          color="bg-red-500"
          pulse
        >
          {overdue.map(r => (
            <div
              key={r.id}
              className="flex items-stretch rounded-xl border border-red-200 bg-red-50/20 overflow-hidden"
            >
              <div className="w-1 shrink-0 bg-red-500" />
              <div className="flex-1 px-4 py-3 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-200">
                    OVERDUE
                  </span>
                </div>
                <p className="font-semibold text-slate-900 text-sm truncate">
                  {r.sinistre.lastName} {r.sinistre.firstName}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · {r.location.address}
                </p>
              </div>
              <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-red-100 shrink-0">
                <button
                  onClick={() => setDrawer({ request: r, mode: 'overdue' })}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  Régulariser
                </button>
                <Link
                  href={`/assisteur/demandes/${r.id}`}
                  className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </Section>

        {/* LITIGES */}
        <Section
          icon={<FileWarning className="w-3.5 h-3.5 text-red-700" />}
          label="Sinistres déclarés"
          count={litiges.length}
          color="bg-red-400"
          pulse
        >
          {litiges.map(r => (
            <OpCard key={r.id} r={r} hint="SINISTRE" accent="bg-red-400" />
          ))}
        </Section>

        {/* URGENCES IMMÉDIATES */}
        <Section
          icon={<Zap className="w-3.5 h-3.5 text-orange-600" />}
          label="Urgences sans réponse"
          count={urgences.length}
          color="bg-orange-500"
          pulse
        >
          {urgences.map(r => {
            const mins = minutesSince(r.createdAt)
            const label = mins >= 60
              ? `Sans réponse depuis ${Math.floor(mins / 60)}h${mins % 60 > 0 ? String(mins % 60).padStart(2, '0') : ''}`
              : `Sans réponse depuis ${mins}min`
            const hasAgencies = !!(r.assignedAgencyId || (r.assignedAgencyIds ?? []).length > 0)
            return (
              <div
                key={r.id}
                className="flex items-stretch rounded-xl border border-orange-200 bg-orange-50/30 overflow-hidden"
              >
                <div className="w-1 shrink-0 bg-orange-500" />
                <div className="flex-1 px-4 py-3 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-orange-100 text-orange-700 border-orange-200">
                      IMMÉDIATE
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {r.sinistre.lastName} {r.sinistre.firstName}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · {r.location.address}
                  </p>
                  <p className="text-xs font-semibold text-orange-700 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {label}
                  </p>
                </div>
                <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-orange-100 shrink-0">
                  {hasAgencies && (
                    <button
                      onClick={() => setDrawer({ request: r, mode: 'relance' })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      <Bell className="w-3 h-3" />
                      Relancer
                    </button>
                  )}
                  <Link
                    href={`/assisteur/demandes/${r.id}`}
                    className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </Section>

        {/* PROLONGATIONS EN ATTENTE */}
        <Section
          icon={<CalendarPlus className="w-3.5 h-3.5 text-amber-600" />}
          label="Prolongations en attente"
          count={extensions.length}
          color="bg-amber-400"
        >
          {extensions.map(r => {
            const pendingExts = (r.extensions ?? []).filter(e => e.status === 'en_attente')
            return (
              <div
                key={r.id}
                className="rounded-xl border border-amber-200 bg-amber-50/20 overflow-hidden"
              >
                <div className="flex items-stretch">
                  <div className="w-1 shrink-0 bg-amber-400" />
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200">
                        {pendingExts.length} prolongation{pendingExts.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm truncate">
                      {r.sinistre.lastName} {r.sinistre.firstName}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · {r.location.address}
                    </p>
                  </div>
                  <Link
                    href={`/assisteur/demandes/${r.id}`}
                    className="flex items-center px-3 border-l border-amber-100 text-slate-400 hover:text-slate-700 shrink-0 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>

                {/* Extensions en attente */}
                <div className="border-t border-amber-100 px-4 py-2 flex flex-col gap-2">
                  {pendingExts.map(ext => {
                    const key = `${r.id}-${ext.id}`
                    const isSuccess = extSuccess === key
                    return (
                      <div key={ext.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-amber-800">
                            +{ext.requestedDays} jour{ext.requestedDays > 1 ? 's' : ''}
                          </span>
                          {ext.note && (
                            <span className="text-xs text-slate-400 ml-1.5 truncate">· {ext.note}</span>
                          )}
                        </div>
                        {isSuccess ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Traité
                          </span>
                        ) : (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => setExtModal({ request: r, extensionId: ext.id, days: ext.requestedDays, response: 'acceptee' })}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              Accepter
                            </button>
                            <button
                              onClick={() => setExtModal({ request: r, extensionId: ext.id, days: ext.requestedDays, response: 'refusee' })}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors"
                            >
                              <X className="w-3 h-3" />
                              Refuser
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </Section>

        {/* SANS LOUEUR */}
        <Section
          icon={<Building2 className="w-3.5 h-3.5 text-slate-500" />}
          label="Sans loueur assigné"
          count={sansLoueur.length}
          color="bg-slate-400"
        >
          {sansLoueur.map(r => (
            <div
              key={r.id}
              className="flex items-stretch rounded-xl border border-slate-200 bg-white overflow-hidden"
            >
              <div className="w-1 shrink-0 bg-slate-300" />
              <div className="flex-1 px-4 py-3 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                    {r.requestType === 'immediate' ? 'IMMÉDIATE' : 'Planifiée'}
                  </span>
                </div>
                <p className="font-semibold text-slate-900 text-sm truncate">
                  {r.sinistre.lastName} {r.sinistre.firstName}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · {r.durationDays}j
                  · {fmtDate(new Date(r.dateNeeded))}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{relativeTime(r.createdAt)}</p>
              </div>
              <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-slate-100 shrink-0">
                <button
                  onClick={() => setDrawer({ request: r, mode: 'relance' })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <Bell className="w-3 h-3" />
                  Relancer
                </button>
                <Link
                  href={`/assisteur/demandes/${r.id}`}
                  className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </Section>

        {/* PAIEMENTS EN ATTENTE */}
        <Section
          icon={<CreditCard className="w-3.5 h-3.5 text-blue-600" />}
          label="Paiements à valider"
          count={paiements.length}
          color="bg-blue-400"
        >
          {paiements.map(r => {
            const end = endDate(r)
            const daysAgo = Math.floor((now.getTime() - end.getTime()) / 86_400_000)
            return (
              <div
                key={r.id}
                className="flex items-stretch rounded-xl border border-blue-200 bg-blue-50/30 overflow-hidden"
              >
                <div className="w-1 shrink-0 bg-blue-400" />
                <div className="flex-1 px-4 py-3 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-mono text-xs text-slate-400">{r.dossierNumber}</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                      PAIEMENT
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm truncate">
                    {r.sinistre.lastName} {r.sinistre.firstName}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {VEHICLE_CATEGORY_LABELS[r.vehicleCategory]} · retour {fmtDate(end)}
                  </p>
                  {daysAgo > 0 && (
                    <p className="text-xs font-semibold text-blue-700 mt-1">
                      Retour il y a {daysAgo}j
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-blue-100 shrink-0">
                  <button
                    onClick={() => setDrawer({ request: r, mode: 'docs' })}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    Docs
                  </button>
                  <Link
                    href={`/assisteur/demandes/${r.id}`}
                    className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </Section>

      </div>

      {/* Drawer latéral */}
      <AssisteurOperationsDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        onSuccess={updateLocal}
      />

      {/* Modal confirmation prolongation */}
      {extModal && (
        <ExtensionConfirmModal
          modal={extModal}
          onConfirm={handleExtensionConfirm}
          onCancel={() => setExtModal(null)}
          loading={extLoading}
        />
      )}
    </>
  )
}
