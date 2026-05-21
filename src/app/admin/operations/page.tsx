'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link                                            from 'next/link'
import {
  AlertTriangle, Zap, FileWarning, ArrowRightLeft,
  CreditCard, Building2, CheckCircle2, RefreshCw,
  ChevronRight, Clock, ShieldAlert, Bell, StickyNote,
  Flag, FileText, CheckCheck,
} from 'lucide-react'
import { getAdminReservations, computeKpis }           from '@/services/adminReservationService'
import { VEHICLE_CATEGORY_LABELS }                     from '@/types/vehicleCategory'
import { ADMIN_UX_STATUS_LABELS, ADMIN_UX_STATUS_COLORS } from '@/types/adminReservation'
import {
  AdminOperationsDrawer,
} from '@/components/admin/AdminOperationsDrawer'
import type { AdminDrawerState }                       from '@/components/admin/AdminOperationsDrawer'
import type { AdminReservation, AdminReservationKpis } from '@/types/adminReservation'

// ── Helpers ───────────────────────────────────────────────────────────────────

function minutesSince(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 60_000)
}

function fmtDelay(minutes: number): string {
  if (minutes < 60)   return `${minutes}min`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}j`
}

function hasAgencies(r: AdminReservation): boolean {
  return !!(r.assignedAgencyId || (r.assignedAgencyIds ?? []).length > 0)
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

// ── Carte de base (lecture seule) ─────────────────────────────────────────────

function AdminCard({
  r, badge, badgeColor, accentColor, borderColor, bgColor, sub,
}: {
  r:           AdminReservation
  badge:       string
  badgeColor:  string
  accentColor: string
  borderColor: string
  bgColor:     string
  sub?:        string
}) {
  const vehicle     = VEHICLE_CATEGORY_LABELS[r.vehicleCategory] ?? r.vehicleCategory
  const rougeAlerts = r.alerts.filter(a => a.severity === 'rouge')

  return (
    <Link
      href={`/admin/demandes/${r.id}`}
      className={`flex items-stretch rounded-xl border overflow-hidden transition-all hover:shadow-md hover:-translate-y-px ${borderColor} ${bgColor}`}
    >
      <div className={`w-1 shrink-0 ${accentColor}`} />
      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-mono text-xs text-slate-400 shrink-0">{r.dossierNumber}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {badge}
          </span>
        </div>
        <p className="font-semibold text-slate-900 text-sm truncate">
          {r.sinistre.lastName} {r.sinistre.firstName}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {vehicle} · {r.location.address}
        </p>
        {sub && <p className="text-xs font-semibold text-red-700 mt-1">{sub}</p>}
        {rougeAlerts.length > 0 && !sub && (
          <p className="text-xs font-semibold text-red-700 mt-1 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            {rougeAlerts[0].label}
            {rougeAlerts.length > 1 && ` +${rougeAlerts.length - 1}`}
          </p>
        )}
      </div>
      <div className="flex items-center px-3 border-l border-slate-100 text-slate-400 shrink-0">
        <ChevronRight className="w-4 h-4" />
      </div>
    </Link>
  )
}

// ── Carte avec actions inline ─────────────────────────────────────────────────

function ActionCard({
  r, badge, badgeColor, accentColor, borderColor, bgColor, sub, actions,
}: {
  r:           AdminReservation
  badge:       string
  badgeColor:  string
  accentColor: string
  borderColor: string
  bgColor:     string
  sub?:        string
  actions:     React.ReactNode
}) {
  const vehicle     = VEHICLE_CATEGORY_LABELS[r.vehicleCategory] ?? r.vehicleCategory
  const rougeAlerts = r.alerts.filter(a => a.severity === 'rouge')

  return (
    <div className={`flex items-stretch rounded-xl border overflow-hidden ${borderColor} ${bgColor}`}>
      <div className={`w-1 shrink-0 ${accentColor}`} />
      <div className="flex-1 px-4 py-3 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-mono text-xs text-slate-400 shrink-0">{r.dossierNumber}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {badge}
          </span>
        </div>
        <p className="font-semibold text-slate-900 text-sm truncate">
          {r.sinistre.lastName} {r.sinistre.firstName}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {vehicle} · {r.location.address}
        </p>
        {sub && <p className="text-xs font-semibold text-red-700 mt-1">{sub}</p>}
        {rougeAlerts.length > 0 && !sub && (
          <p className="text-xs font-semibold text-red-700 mt-1 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            {rougeAlerts[0].label}
            {rougeAlerts.length > 1 && ` +${rougeAlerts.length - 1}`}
          </p>
        )}
      </div>
      {/* Actions + lien dossier */}
      <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-slate-100 shrink-0">
        {actions}
        <Link
          href={`/admin/demandes/${r.id}`}
          className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}

// ── KPI bar ───────────────────────────────────────────────────────────────────

function KpiBar({ kpis }: { kpis: AdminReservationKpis }) {
  const items = [
    { label: 'En attente',  value: kpis.en_attente,        color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
    { label: 'En cours',    value: kpis.en_cours,          color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200'  },
    { label: 'Docs manq.',  value: kpis.docs_manquants,    color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200'   },
    { label: 'Paiements',   value: kpis.attente_paiement,  color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200'},
    { label: 'Alertes 🔴',  value: kpis.alertes_critiques, color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   bold: true },
  ]
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map(({ label, value, color, bg, border, bold }) => (
        <div key={label} className={`flex flex-col items-center py-2.5 px-1 rounded-xl border ${bg} ${border}`}>
          <span className={`text-xl font-black tabular-nums ${color} ${bold ? 'animate-pulse' : ''}`}>{value}</span>
          <span className={`text-[10px] font-semibold ${color} mt-0.5 text-center leading-tight`}>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOperationsPage() {
  const [reservations, setReservations] = useState<AdminReservation[]>([])
  const [loading,      setLoading]      = useState(true)
  const [drawer,       setDrawer]       = useState<AdminDrawerState | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const data = await getAdminReservations()
    setReservations(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const kpis = useMemo(() => computeKpis(reservations), [reservations])

  function openDrawer(request: AdminReservation, mode: AdminDrawerState['mode']) {
    setDrawer({ request, mode })
  }

  // ── Catégorisation ────────────────────────────────────────────────────────────

  const overdue      = reservations.filter(r => r.status === 'overdue')
  const litiges      = reservations.filter(r => r.status === 'litige_degat')
  const urgences     = reservations.filter(r =>
    r.requestType === 'immediate' &&
    r.uxStatus === 'en_attente' &&
    r.minutesSinceLastActivity > 45
  )
  const transferts   = reservations.filter(r => r.status === 'transfert_valide')
  const docsCritiques = reservations.filter(r =>
    r.uxStatus === 'docs_manquants' &&
    r.alerts.some(a => a.severity === 'rouge') &&
    !['overdue', 'litige_degat'].includes(r.status)
  )
  const paiements    = reservations.filter(r =>
    r.uxStatus === 'attente_paiement' &&
    !['overdue', 'litige_degat'].includes(r.status)
  )
  const sansLoueur   = reservations.filter(r =>
    r.alerts.some(a => a.code === 'sans_loueur') &&
    !['overdue', 'litige_degat'].includes(r.status) &&
    r.uxStatus !== 'attente_paiement'
  )

  const total = overdue.length + litiges.length + urgences.length +
                transferts.length + docsCritiques.length + paiements.length + sansLoueur.length

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-5 gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Zap className="w-6 h-6 text-red-500" />
              Tour d'opérations
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {total === 0
                ? 'Aucune action requise — plateforme opérationnelle.'
                : `${total} point${total > 1 ? 's' : ''} d'attention`}
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

        {/* KPIs */}
        <KpiBar kpis={kpis} />

        {/* État vide */}
        {total === 0 && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">Plateforme opérationnelle</p>
              <p className="text-sm text-slate-400 mt-1">Aucun dossier ne nécessite une intervention immédiate.</p>
            </div>
            <Link
              href="/admin/reservations"
              className="text-sm font-semibold text-brand-600 hover:text-brand-700 underline underline-offset-2"
            >
              Voir toutes les réservations
            </Link>
          </div>
        )}

        {/* OVERDUE */}
        <Section
          icon={<AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
          label="Overdue — retour non effectué"
          count={overdue.length}
          color="bg-red-500"
          pulse
        >
          {overdue.map(r => (
            <ActionCard
              key={r.id} r={r}
              badge="OVERDUE"
              badgeColor="bg-red-100 text-red-700 border-red-200"
              accentColor="bg-red-500"
              borderColor="border-red-200"
              bgColor="bg-red-50/40"
              sub={`Sans retour depuis ${fmtDelay(r.minutesSinceLastActivity)}`}
              actions={
                <button
                  onClick={() => openDrawer(r, 'resolve')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <CheckCheck className="w-3 h-3" />
                  Résoudre
                </button>
              }
            />
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
            <ActionCard
              key={r.id} r={r}
              badge="SINISTRE"
              badgeColor="bg-red-100 text-red-700 border-red-200"
              accentColor="bg-red-400"
              borderColor="border-red-200"
              bgColor="bg-red-50/30"
              actions={
                <button
                  onClick={() => openDrawer(r, 'resolve')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <CheckCheck className="w-3 h-3" />
                  Résoudre
                </button>
              }
            />
          ))}
        </Section>

        {/* URGENCES */}
        <Section
          icon={<Zap className="w-3.5 h-3.5 text-orange-600" />}
          label="Urgences sans réponse"
          count={urgences.length}
          color="bg-orange-500"
          pulse
        >
          {urgences.map(r => {
            const mins = r.minutesSinceLastActivity
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
                    Sans réponse depuis {fmtDelay(mins)}
                  </p>
                </div>
                <div className="flex flex-col items-stretch justify-center gap-1 px-3 border-l border-orange-100 shrink-0">
                  {hasAgencies(r) && (
                    <button
                      onClick={() => openDrawer(r, 'relance')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      <Bell className="w-3 h-3" />
                      Relancer
                    </button>
                  )}
                  <Link
                    href={`/admin/demandes/${r.id}`}
                    className="flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors text-xs"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </Section>

        {/* TRANSFERTS BLOQUÉS */}
        <Section
          icon={<ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />}
          label="Transferts en attente"
          count={transferts.length}
          color="bg-amber-400"
        >
          {transferts.map(r => (
            <ActionCard
              key={r.id} r={r}
              badge="TRANSFERT"
              badgeColor="bg-amber-100 text-amber-700 border-amber-200"
              accentColor="bg-amber-400"
              borderColor="border-amber-200"
              bgColor="bg-amber-50/20"
              sub={`En attente depuis ${fmtDelay(r.minutesSinceLastActivity)}`}
              actions={
                <button
                  onClick={() => openDrawer(r, 'resolve')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors whitespace-nowrap"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  Débloquer
                </button>
              }
            />
          ))}
        </Section>

        {/* DOCS MANQUANTS CRITIQUES */}
        <Section
          icon={<ShieldAlert className="w-3.5 h-3.5 text-red-600" />}
          label="Alertes — docs manquants"
          count={docsCritiques.length}
          color="bg-red-300"
        >
          {docsCritiques.map(r => (
            <ActionCard
              key={r.id} r={r}
              badge={ADMIN_UX_STATUS_LABELS[r.uxStatus]}
              badgeColor={`${ADMIN_UX_STATUS_COLORS[r.uxStatus]} border-transparent`}
              accentColor="bg-red-300"
              borderColor="border-red-100"
              bgColor="bg-red-50/20"
              actions={
                <>
                  <button
                    onClick={() => openDrawer(r, 'docs')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-3 h-3" />
                    Docs
                  </button>
                  <button
                    onClick={() => openDrawer(r, 'note')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <StickyNote className="w-3 h-3" />
                    Note
                  </button>
                </>
              }
            />
          ))}
        </Section>

        {/* PAIEMENTS */}
        <Section
          icon={<CreditCard className="w-3.5 h-3.5 text-violet-600" />}
          label="Paiements à valider"
          count={paiements.length}
          color="bg-violet-400"
        >
          {paiements.map(r => (
            <ActionCard
              key={r.id} r={r}
              badge="PAIEMENT"
              badgeColor="bg-violet-100 text-violet-700 border-violet-200"
              accentColor="bg-violet-400"
              borderColor="border-violet-200"
              bgColor="bg-violet-50/20"
              actions={
                <>
                  {r.paymentStatus === 'en_attente' && (
                    <button
                      onClick={() => openDrawer(r, 'finance')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      <CreditCard className="w-3 h-3" />
                      Prêt à payer
                    </button>
                  )}
                  <button
                    onClick={() => openDrawer(r, 'note')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <StickyNote className="w-3 h-3" />
                    Note
                  </button>
                </>
              }
            />
          ))}
        </Section>

        {/* SANS LOUEUR */}
        <Section
          icon={<Building2 className="w-3.5 h-3.5 text-slate-500" />}
          label="Sans loueur assigné"
          count={sansLoueur.length}
          color="bg-slate-400"
        >
          {sansLoueur.map(r => (
            <ActionCard
              key={r.id} r={r}
              badge={r.requestType === 'immediate' ? 'IMMÉDIATE' : 'Planifiée'}
              badgeColor="bg-slate-100 text-slate-600 border-slate-200"
              accentColor="bg-slate-300"
              borderColor="border-slate-200"
              bgColor="bg-white"
              sub={`En attente depuis ${fmtDelay(r.minutesSinceLastActivity)}`}
              actions={
                <>
                  {hasAgencies(r) && (
                    <button
                      onClick={() => openDrawer(r, 'relance')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      <Bell className="w-3 h-3" />
                      Relancer
                    </button>
                  )}
                  <button
                    onClick={() => openDrawer(r, 'flags')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    <Flag className="w-3 h-3" />
                    Flags
                  </button>
                </>
              }
            />
          ))}
        </Section>

      </div>

      {/* Drawer latéral */}
      <AdminOperationsDrawer
        state={drawer}
        onClose={() => setDrawer(null)}
        onSuccess={() => { setDrawer(null); load() }}
      />
    </>
  )
}
