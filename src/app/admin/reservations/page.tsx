'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  X, ExternalLink, Phone, Mail, AlertTriangle, CheckCircle2,
  XCircle, Clock, ChevronRight, Zap, ShieldAlert,
} from 'lucide-react'
import { getAdminReservations, computeKpis } from '@/services/adminReservationService'
import { REQUEST_DOCUMENT_TYPE_LABELS }      from '@/types/requestDocument'
import {
  ADMIN_UX_STATUS_LABELS, ADMIN_UX_STATUS_COLORS,
  ADMIN_PAYMENT_LABELS,   ADMIN_PAYMENT_COLORS,
  MISSING_DOC_SHORT_LABELS,
} from '@/types/adminReservation'
import type { AdminReservation, AdminUxStatus, AdminUrgencyLevel, AdminReservationKpis } from '@/types/adminReservation'
import type { AdminAlert, AlertSeverity } from '@/types/adminAlert'
import type { RequestDocumentType } from '@/types/requestDocument'

// ── Helpers ───────────────────────────────────────────────────────────────────

type FilterValue = AdminUxStatus | 'all' | 'alertes_critiques'

function extractCity(address: string): string {
  const parts = address.split(',')
  const last  = (parts[parts.length - 1] ?? address).trim()
  return last.replace(/\b\d{5}\b/g, '').trim() || last
}

function formatTimeAgo(minutes: number): string {
  if (minutes < 60)   return `${minutes}min`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}j`
}

// ── Micro-composants ──────────────────────────────────────────────────────────

function UrgencyDot({ level }: { level: AdminUrgencyLevel }) {
  if (level === 'critique') return (
    <span title="Critique" className="flex items-center justify-center w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
  )
  if (level === 'urgent') return (
    <span title="Urgent" className="flex items-center justify-center w-2 h-2 rounded-full bg-orange-400 shrink-0" />
  )
  if (level === 'attention') return (
    <span title="Attention" className="flex items-center justify-center w-2 h-2 rounded-full bg-amber-300 shrink-0" />
  )
  return <span className="w-2 h-2 shrink-0" />
}

function UxBadge({ status }: { status: AdminUxStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ADMIN_UX_STATUS_COLORS[status]}`}>
      {ADMIN_UX_STATUS_LABELS[status]}
    </span>
  )
}

function PaymentBadge({ status }: { status: AdminReservation['paymentStatus'] }) {
  if (status === 'non_applicable') return null
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ADMIN_PAYMENT_COLORS[status]}`}>
      {ADMIN_PAYMENT_LABELS[status]}
    </span>
  )
}

// Petits points de couleur résumant les alertes d'un dossier
function AlertDots({ alerts }: { alerts: AdminAlert[] }) {
  const rouge  = alerts.filter(a => a.severity === 'rouge').length
  const orange = alerts.filter(a => a.severity === 'orange').length
  const jaune  = alerts.filter(a => a.severity === 'jaune').length
  if (rouge === 0 && orange === 0 && jaune === 0) return null
  return (
    <div className="flex items-center gap-0.5 justify-center">
      {rouge  > 0 && <span title={`${rouge} critique${rouge > 1 ? 's' : ''}`}  className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
      {orange > 0 && <span title={`${orange} orange`}  className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />}
      {jaune  > 0 && <span title={`${jaune} attention`} className="w-1.5 h-1.5 rounded-full bg-amber-300 shrink-0" />}
    </div>
  )
}

// Ligne d'alerte dans le drawer
function AlertRow({ alert }: { alert: AdminAlert }) {
  const styles: Record<AlertSeverity, string> = {
    rouge:  'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    jaune:  'bg-amber-50 border-amber-200 text-amber-700',
  }
  return (
    <div className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${styles[alert.severity]}`}>
      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 opacity-70" />
      <span className="font-semibold">{alert.label}</span>
      {alert.detail && <span className="opacity-60 ml-1">{alert.detail}</span>}
    </div>
  )
}

function MissingDocPills({ docs }: { docs: RequestDocumentType[] }) {
  if (docs.length === 0) return (
    <span className="text-slate-300 text-xs">—</span>
  )
  return (
    <div className="flex gap-1 flex-wrap">
      {docs.map(doc => (
        <span key={doc} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">
          {MISSING_DOC_SHORT_LABELS[doc]}
        </span>
      ))}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, active, alert, onClick,
}: {
  label: string; value: number; active: boolean; alert?: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-0.5 rounded-xl px-4 py-3 text-left transition-all ${
        active
          ? 'bg-white/15 ring-1 ring-white/30'
          : 'bg-white/5 hover:bg-white/10'
      }`}
    >
      <span className={`text-[11px] font-medium ${alert ? 'text-red-300' : 'text-slate-400'}`}>
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${
        alert && value > 0 ? 'text-red-400' : 'text-white'
      }`}>
        {value}
      </span>
    </button>
  )
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function RequiredDocRow({ type, present }: { type: RequestDocumentType; present: boolean }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
      {present
        ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
      }
      <span className={`text-sm ${present ? 'text-slate-700' : 'text-red-700 font-medium'}`}>
        {REQUEST_DOCUMENT_TYPE_LABELS[type]}
      </span>
      {!present && (
        <span className="ml-auto text-xs text-red-500 font-semibold">Manquant</span>
      )}
    </div>
  )
}

function ReservationDrawer({
  reservation,
  onClose,
}: {
  reservation: AdminReservation
  onClose: () => void
}) {
  const { sinistre, location, loueurResponse, confirmedAgencyName, missingDocuments, uxStatus, urgencyLevel, paymentStatus } = reservation

  const requiredDocs: RequestDocumentType[] = [
    'prise_en_charge', 'contrat', 'etat_retour', 'facture',
  ].filter(d =>
    ['acceptee', 'confirmee', 'honoree', 'cloturee'].some(s =>
      s === reservation.status
    )
  ) as RequestDocumentType[]

  // Docs actually required for this status
  const statusDocs: RequestDocumentType[] =
    reservation.status === 'acceptee'  ? ['prise_en_charge'] :
    reservation.status === 'confirmee' ? ['prise_en_charge', 'contrat'] :
    ['honoree', 'cloturee'].includes(reservation.status) ? ['prise_en_charge', 'contrat', 'etat_retour', 'facture'] : []

  const presentSet = new Set(
    statusDocs.filter(d => !missingDocuments.includes(d))
  )

  const urgencyColors: Record<AdminUrgencyLevel, string> = {
    critique: 'bg-red-500',
    urgent:   'bg-orange-400',
    attention: 'bg-amber-300',
    normal:   'bg-transparent',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {urgencyLevel !== 'normal' && (
                <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyColors[urgencyLevel]} ${urgencyLevel === 'critique' ? 'animate-pulse' : ''}`} />
              )}
              <span className="font-mono text-sm font-bold text-slate-800">{reservation.dossierNumber}</span>
              {reservation.requestType === 'immediate' && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                  <Zap className="w-2.5 h-2.5" />Immédiate
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <UxBadge status={uxStatus} />
              <PaymentBadge status={paymentStatus} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Alertes */}
          {reservation.alerts.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                Alertes
                {reservation.alerts.filter(a => a.severity === 'rouge').length > 0 && (
                  <span className="text-red-500 normal-case font-semibold">
                    · {reservation.alerts.filter(a => a.severity === 'rouge').length} critique{reservation.alerts.filter(a => a.severity === 'rouge').length > 1 ? 's' : ''}
                  </span>
                )}
              </p>
              <div className="flex flex-col gap-1.5">
                {reservation.alerts.map(al => <AlertRow key={al.code} alert={al} />)}
              </div>
            </section>
          )}

          {/* Sinistré */}
          <section>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sinistré</p>
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-900">{sinistre.firstName} {sinistre.lastName}</p>
              <a href={`tel:${sinistre.phone}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors">
                <Phone className="w-3.5 h-3.5" />{sinistre.phone}
              </a>
              {sinistre.email && (
                <a href={`mailto:${sinistre.email}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 transition-colors">
                  <Mail className="w-3.5 h-3.5" />{sinistre.email}
                </a>
              )}
              <p className="text-xs text-slate-400">{location.address}</p>
            </div>
          </section>

          {/* Loueur */}
          {(loueurResponse ?? confirmedAgencyName) && (
            <section>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Loueur</p>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900">{loueurResponse?.agencyName ?? confirmedAgencyName}</p>
                {loueurResponse?.pricePerDay && (
                  <p className="text-sm text-slate-600">{loueurResponse.pricePerDay} €/j</p>
                )}
                {loueurResponse?.vehicleModel && (
                  <p className="text-sm text-slate-500">{loueurResponse.vehicleModel}</p>
                )}
              </div>
            </section>
          )}

          {/* Documents */}
          {statusDocs.length > 0 && (
            <section>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Documents
                {missingDocuments.length > 0 && (
                  <span className="ml-2 text-red-500 normal-case">
                    · {missingDocuments.length} manquant{missingDocuments.length > 1 ? 's' : ''}
                  </span>
                )}
              </p>
              <div className="bg-slate-50 rounded-xl px-3">
                {statusDocs.map(type => (
                  <RequiredDocRow
                    key={type}
                    type={type}
                    present={presentSet.has(type)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Infos dossier */}
          <section>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dossier</p>
            <div className="space-y-1 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Créé le</span>
                <span className="font-medium text-slate-800">
                  {new Date(reservation.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Par</span>
                <span className="font-medium text-slate-800">{reservation.createdByName}</span>
              </div>
              <div className="flex justify-between">
                <span>Dernière action</span>
                <span className="font-medium text-slate-800">
                  il y a {formatTimeAgo(reservation.minutesSinceLastActivity)}
                </span>
              </div>
              {reservation.loueurResponse?.pricePerDay && (
                <div className="flex justify-between">
                  <span>Montant estimé</span>
                  <span className="font-semibold text-slate-900">
                    {reservation.loueurResponse.pricePerDay * (reservation.durationDays)} €
                  </span>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-200 bg-slate-50">
          <Link
            href={`/admin/demandes/${reservation.id}`}
            target="_blank"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#2B45D4] hover:bg-[#2338b8] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ouvrir le dossier complet
          </Link>
        </div>
      </div>
    </>
  )
}

// ── Table row (desktop) ───────────────────────────────────────────────────────

function TableRow({
  r,
  selected,
  onClick,
}: {
  r: AdminReservation
  selected: boolean
  onClick: () => void
}) {
  const loueurName = r.loueurResponse?.agencyName ?? r.confirmedAgencyName ?? '—'

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer border-b border-slate-100 transition-colors ${
        selected ? 'bg-blue-50' : 'hover:bg-slate-50'
      }`}
    >
      {/* Urgence + alertes dots */}
      <td className="pl-4 pr-2 py-3 w-8">
        <div className="flex flex-col items-center gap-1">
          <UrgencyDot level={r.urgencyLevel} />
          <AlertDots alerts={r.alerts} />
        </div>
      </td>

      {/* Dossier */}
      <td className="px-3 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-bold text-slate-800">{r.dossierNumber}</span>
          <div className="flex items-center gap-1">
            {r.requestType === 'immediate' && (
              <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-600">
                <Zap className="w-2.5 h-2.5" />Imm.
              </span>
            )}
            <span className="text-[10px] text-slate-400">
              {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
            </span>
          </div>
        </div>
      </td>

      {/* Sinistré */}
      <td className="px-3 py-3">
        <span className="text-sm font-medium text-slate-800 whitespace-nowrap">
          {r.sinistre.firstName} {r.sinistre.lastName}
        </span>
      </td>

      {/* Ville */}
      <td className="px-3 py-3">
        <span className="text-sm text-slate-600 whitespace-nowrap">
          {extractCity(r.location.address)}
        </span>
      </td>

      {/* Loueur */}
      <td className="px-3 py-3">
        <span className="text-sm text-slate-600 whitespace-nowrap max-w-[140px] truncate block">
          {loueurName}
        </span>
      </td>

      {/* Statut */}
      <td className="px-3 py-3">
        <UxBadge status={r.uxStatus} />
      </td>

      {/* Docs manquants */}
      <td className="px-3 py-3">
        {r.uxStatus !== 'cloturee' && r.uxStatus !== 'archivee'
          ? <MissingDocPills docs={r.missingDocuments} />
          : <span className="text-slate-300 text-xs">—</span>
        }
      </td>

      {/* Paiement */}
      <td className="px-3 py-3">
        <PaymentBadge status={r.paymentStatus} />
      </td>

      {/* Dernière activité */}
      <td className="px-3 py-3 pr-4">
        <div className="flex items-center gap-1 text-xs text-slate-400 whitespace-nowrap">
          <Clock className="w-3 h-3" />
          {formatTimeAgo(r.minutesSinceLastActivity)}
        </div>
      </td>
    </tr>
  )
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function MobileCard({
  r,
  onClick,
}: {
  r: AdminReservation
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3 hover:border-slate-300 transition-colors active:bg-slate-50"
    >
      <div className="mt-1.5">
        <UrgencyDot level={r.urgencyLevel} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-slate-800">{r.dossierNumber}</span>
          <UxBadge status={r.uxStatus} />
        </div>
        <p className="text-sm font-medium text-slate-800 mt-0.5">
          {r.sinistre.firstName} {r.sinistre.lastName}
        </p>
        <p className="text-xs text-slate-500">{extractCity(r.location.address)}</p>
        {r.alerts.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <AlertDots alerts={r.alerts} />
            <span className="text-xs text-slate-500">
              {r.alerts.length} alerte{r.alerts.length > 1 ? 's' : ''}
              {r.alerts.some(a => a.severity === 'rouge') && (
                <span className="text-red-600 font-semibold"> · {r.alerts.filter(a => a.severity === 'rouge').length} critique{r.alerts.filter(a => a.severity === 'rouge').length > 1 ? 's' : ''}</span>
              )}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
        <Clock className="w-3 h-3" />
        {formatTimeAgo(r.minutesSinceLastActivity)}
        <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </button>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

const FILTERS: { value: FilterValue; label: string; alert?: boolean }[] = [
  { value: 'all',                label: 'Tout' },
  { value: 'en_attente',         label: 'En attente' },
  { value: 'en_cours',           label: 'En cours' },
  { value: 'docs_manquants',     label: 'Docs manquants', alert: true },
  { value: 'attente_paiement',   label: 'Paiement' },
  { value: 'alertes_critiques',  label: 'Alertes critiques', alert: true },
  { value: 'cloturee',           label: 'Clôturées' },
  { value: 'archivee',           label: 'Archivées' },
]

const KPI_CONFIG: {
  key: keyof Omit<AdminReservationKpis, 'total'>
  label: string
  alert?: boolean
}[] = [
  { key: 'en_attente',         label: 'En attente' },
  { key: 'en_cours',           label: 'En cours' },
  { key: 'docs_manquants',     label: 'Docs manquants', alert: true },
  { key: 'attente_paiement',   label: 'Attente paiement' },
  { key: 'alertes_critiques',  label: 'Alertes critiques', alert: true },
]

export default function AdminReservationsPage() {
  const [reservations, setReservations] = useState<AdminReservation[]>([])
  const [loading, setLoading]           = useState(true)
  const [filter, setFilter]             = useState<FilterValue>('all')
  const [selectedId, setSelectedId]     = useState<string | null>(null)

  useEffect(() => {
    getAdminReservations().then(data => {
      setReservations(data)
      setLoading(false)
    })
  }, [])

  const kpis = useMemo(() => computeKpis(reservations), [reservations])

  const filtered = useMemo(() => {
    if (filter === 'all') return reservations
    if (filter === 'alertes_critiques') return reservations.filter(r => r.alerts.some(a => a.severity === 'rouge'))
    return reservations.filter(r => r.uxStatus === filter)
  }, [reservations, filter])

  const selected = selectedId
    ? (reservations.find(r => r.id === selectedId) ?? null)
    : null

  const handleFilterClick = useCallback((v: FilterValue) => {
    setFilter(f => f === v ? 'all' : v)
    setSelectedId(null)
  }, [])

  const filterCount = useCallback((v: FilterValue): number => {
    if (v === 'all') return reservations.length
    if (v === 'alertes_critiques') return kpis.alertes_critiques
    return kpis[v as keyof typeof kpis] as number
  }, [kpis, reservations.length])

  return (
    <div className="flex flex-col">

      {/* ── Header + KPIs ── */}
      <div className="bg-slate-900 px-6 pt-6 pb-5">
        <div className="mb-5">
          <h1 className="text-white text-xl font-bold">Centre de réservations</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? '…' : `${reservations.length} dossier${reservations.length > 1 ? 's' : ''} au total`}
          </p>
        </div>

        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {KPI_CONFIG.map(({ key, label, alert }) => (
            <KpiCard
              key={key}
              label={label}
              value={loading ? 0 : kpis[key]}
              active={filter === key}
              alert={alert}
              onClick={() => handleFilterClick(key)}
            />
          ))}
        </div>
      </div>

      {/* ── Filtres ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="flex items-center gap-0 overflow-x-auto px-4">
          {FILTERS.map(({ value, label, alert }) => {
            const count   = filterCount(value)
            const active  = filter === value
            return (
              <button
                key={value}
                onClick={() => handleFilterClick(value)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-[#2B45D4] text-[#2B45D4]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                  active
                    ? 'bg-[#2B45D4] text-white'
                    : alert && count > 0
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Contenu ── */}
      {loading ? (
        <div className="flex flex-col gap-2 p-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-slate-400">
          <CheckCircle2 className="w-10 h-10 text-slate-200" />
          <p className="text-sm font-medium">Aucun dossier dans cette catégorie</p>
        </div>
      ) : (
        <>
          {/* Table desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="pl-4 pr-2 py-2.5 w-6" />
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Dossier</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Sinistré</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Ville</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Loueur</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Documents</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Paiement</th>
                  <th className="px-3 py-2.5 pr-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Activité</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <TableRow
                    key={r.id}
                    r={r}
                    selected={r.id === selectedId}
                    onClick={() => setSelectedId(id => id === r.id ? null : r.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="lg:hidden flex flex-col gap-2 p-4">
            {filtered.map(r => (
              <MobileCard
                key={r.id}
                r={r}
                onClick={() => setSelectedId(r.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Drawer ── */}
      {selected && (
        <ReservationDrawer
          reservation={selected}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
