'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Lock, Loader2,
  CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Ban, CalendarCheck, Clock,
  ArrowRightLeft, User, Building2, CalendarPlus, Euro, FileText, RotateCcw, History,
  Phone, Mail, MapPin, Navigation, Car, Calendar, Shield, Fuel, Tag, Copy,
  MessageSquare, Zap, CalendarClock,
} from 'lucide-react'
import { RentalResponseForm }        from '@/components/loueur/RentalResponseForm'
import { SharedRequestDocuments }    from '@/components/shared/SharedRequestDocuments'
import { RequestTimeline }           from '@/components/shared/RequestTimeline'
import { LoueurStatusBadge }         from '@/components/loueur/LoueurStatusBadge'
import {
  getReceivedRequestById, respondToRequest, loueurConfirmReturn,
} from '@/services/loueurService'
import { respondToExtension }        from '@/services/requestService'
import { getAgencyById }             from '@/services/rentalAgencyService'
import { getDisplayStatus }          from '@/lib/displayStatus'
import { getEndDate, getRentalAlertState } from '@/lib/rentalDates'
import { calculatePricing, getEffectivePrice } from '@/lib/rentalPricing'
import {
  getEffectiveDuration, CREDIT_TYPE_LABELS, REQUEST_TYPE_LABELS,
} from '@/types/request'
import { VEHICLE_CATEGORY_LABELS, VEHICLE_GROUP_LABELS } from '@/types/vehicleCategory'
import type { ReceivedRequest, LoueurAction } from '@/types/loueur'
import type { RentalAgencyRow }      from '@/services/rentalAgencyService'

// ── Constants ────────────────────────────────────────────────────────────────

const RESPONDED_STATUSES = [
  'acceptee', 'confirmee', 'refusee', 'transfert_propose', 'transfert_valide',
  'transferee', 'honoree', 'cloturee', 'overdue', 'litige_degat',
]

type TabId = 'sinistre' | 'envoi' | 'prolongations' | 'finance' | 'documents' | 'retour' | 'historique'

function getDefaultTab(req: ReceivedRequest): TabId {
  if (req.status === 'overdue' || req.status === 'honoree') return 'retour'
  if (req.extensions?.some(e => e.status === 'en_attente')) return 'prolongations'
  return 'sinistre'
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateLong(d: Date | string) {
  return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
function fmtTime(d: Date | string) {
  const x = new Date(d)
  return `${String(x.getHours()).padStart(2, '0')}h${String(x.getMinutes()).padStart(2, '0')}`
}
function todayStr() { return new Date().toISOString().split('T')[0] }
function nowTimeStr() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, action }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="mt-0.5 text-slate-400 shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
      </div>
      {action && <div className="shrink-0 mt-0.5">{action}</div>}
    </div>
  )
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {title && (
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{title}</h3>
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
    >
      <Copy className="w-3 h-3" />{ok ? 'Copié !' : 'Copier'}
    </button>
  )
}

// ── Status banners ────────────────────────────────────────────────────────────

function BannerRow({ icon, title, description, accent, bg, border }: {
  icon: React.ReactNode; title: string; description: string
  accent: string; bg: string; border: string
}) {
  return (
    <div className={`flex overflow-hidden rounded-xl border ${border} ${bg}`}>
      <div className={`w-1 shrink-0 ${accent}`} />
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div><p className="text-sm font-semibold">{title}</p><p className="text-xs mt-0.5 opacity-80">{description}</p></div>
      </div>
    </div>
  )
}

function StatusBanner({ status }: { status: string }) {
  if (status === 'acceptee') return <BannerRow icon={<CheckCircle2 className="w-5 h-5 text-teal-600" />} title="Prix proposé — en attente de validation" description="L'assisteur examine votre proposition." accent="bg-teal-500" bg="bg-teal-50 text-teal-700" border="border-teal-200" />
  if (status === 'confirmee') return <BannerRow icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} title="Demande confirmée" description="Vous vous êtes engagé à honorer cette location." accent="bg-green-500" bg="bg-green-50 text-green-700" border="border-green-200" />
  if (status === 'transfert_propose') return <BannerRow icon={<ArrowRightLeft className="w-5 h-5 text-orange-600" />} title="Transfert proposé" description="En attente de validation par l'assisteur." accent="bg-orange-500" bg="bg-orange-50 text-orange-700" border="border-orange-200" />
  if (status === 'transfert_valide' || status === 'transferee') return <BannerRow icon={<ArrowRightLeft className="w-5 h-5 text-blue-600" />} title="Demande transférée" description="Le transfert a été validé par l'assisteur." accent="bg-blue-500" bg="bg-blue-50 text-blue-700" border="border-blue-200" />
  if (status === 'refusee') return <BannerRow icon={<XCircle className="w-5 h-5 text-red-600" />} title="Demande refusée" description="Vous avez refusé cette demande." accent="bg-red-500" bg="bg-red-50 text-red-700" border="border-red-200" />
  if (status === 'honoree') return <BannerRow icon={<CalendarCheck className="w-5 h-5 text-blue-600" />} title="Retour confirmé — en attente de paiement" description="Le véhicule a bien été rendu. L'assisteur va valider le paiement." accent="bg-blue-500" bg="bg-blue-50 text-blue-700" border="border-blue-200" />
  if (status === 'cloturee') return <BannerRow icon={<Ban className="w-5 h-5 text-slate-500" />} title="Dossier clôturé" description="Le paiement a été validé. Ce dossier est archivé." accent="bg-slate-400" bg="bg-slate-50 text-slate-600" border="border-slate-200" />
  if (status === 'overdue') return <BannerRow icon={<AlertTriangle className="w-5 h-5 text-red-600" />} title="Véhicule en retard" description="Le véhicule aurait dû être rendu. Confirmez le retour dans l'onglet Retour." accent="bg-red-500" bg="bg-red-50 text-red-700" border="border-red-200" />
  if (status === 'litige_degat') return <BannerRow icon={<ShieldAlert className="w-5 h-5 text-red-600" />} title="Litige en cours" description="Un sinistre a été déclaré. Le dossier est bloqué en attente de résolution admin." accent="bg-red-500" bg="bg-red-50 text-red-700" border="border-red-200" />
  return null
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LoueurRequestDetailPage() {
  const { id } = useParams<{ id: string }>()

  const [request,       setRequest]       = useState<ReceivedRequest | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [notFound,      setNotFound]      = useState(false)
  const [agency,        setAgency]        = useState<RentalAgencyRow | null>(null)
  const [activeTab,     setActiveTab]     = useState<TabId>('sinistre')
  const [extLoading,    setExtLoading]    = useState(false)
  const [returnDate,    setReturnDate]    = useState(todayStr)
  const [returnTime,    setReturnTime]    = useState(nowTimeStr)
  const [returnLoading, setReturnLoading] = useState(false)
  const [damageDesc,    setDamageDesc]    = useState('')
  const [damageLoading, setDamageLoading] = useState(false)
  const [damageError,   setDamageError]   = useState<string | null>(null)

  useEffect(() => {
    getReceivedRequestById(id).then(found => {
      if (found) {
        setRequest(found)
        setActiveTab(getDefaultTab(found))
        getAgencyById(found.agencyId).then(a => setAgency(a))
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })
  }, [id])

  const handleResponse = useCallback(async (action: LoueurAction) => {
    if (!request) return
    const updated = await respondToRequest(request.id, action)
    if (updated) setRequest(r => r ? { ...r, ...updated } : r)
  }, [request])

  const handleExtensionResponse = useCallback(async (extensionId: string, response: 'acceptee' | 'refusee') => {
    if (!request) return
    setExtLoading(true)
    const updated = await respondToExtension(request.id, extensionId, response)
    if (updated) setRequest(r => r ? { ...r, ...updated } : r)
    setExtLoading(false)
  }, [request])

  const handleConfirmReturn = useCallback(async () => {
    if (!request) return
    setReturnLoading(true)
    const updated = await loueurConfirmReturn(request.id, new Date(`${returnDate}T${returnTime}`))
    if (updated) setRequest(r => r ? { ...r, ...updated } : r)
    setReturnLoading(false)
  }, [request, returnDate, returnTime])

  const handleDeclareDamage = useCallback(async () => {
    if (!request) return
    setDamageLoading(true)
    setDamageError(null)
    try {
      const res = await fetch(`/api/loueur/requests/${request.id}/declare-damage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: damageDesc }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erreur lors de la déclaration')
      }
      setRequest(r => r ? { ...r, hasDamageClaim: true } : r)
    } catch (err) {
      setDamageError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setDamageLoading(false)
    }
  }, [request, damageDesc])

  if (loading) return (
    <div className="flex flex-col gap-4 -mt-6">
      <div className="h-20 bg-slate-100 animate-pulse rounded-b-2xl" />
      <div className="h-10 bg-slate-100 animate-pulse rounded-xl mx-0" />
      <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
    </div>
  )

  if (notFound || !request) return (
    <div className="flex flex-col items-center gap-4 py-20">
      <p className="text-slate-500 text-sm">Demande introuvable ou ne vous appartient pas.</p>
      <Link href="/loueur/dashboard" className="text-brand-500 text-sm underline underline-offset-2">← Retour au tableau de bord</Link>
    </div>
  )

  const isLockedByOther = !!(request.confirmedAgencyId && request.confirmedAgencyId !== request.agencyId)
  const canRespond      = !RESPONDED_STATUSES.includes(request.status) && !isLockedByOther
  const pendingExt      = request.extensions?.find(e => e.status === 'en_attente')
  const alertState      = getRentalAlertState(request)
  const startDate       = new Date(request.dateNeeded)
  const endDate         = getEndDate(request)

  const retourNeedsAction =
    (request.status === 'confirmee' && getDisplayStatus(request.status, request.dateNeeded) === 'en_cours') ||
    request.status === 'overdue' ||
    request.status === 'honoree'

  const tabs: { id: TabId; label: string; icon: React.ReactNode; dot?: boolean }[] = [
    { id: 'sinistre',      label: 'Sinistré',     icon: <User         className="w-3.5 h-3.5" /> },
    { id: 'envoi',         label: 'Envoyer',       icon: <Building2    className="w-3.5 h-3.5" /> },
    { id: 'prolongations', label: 'Prolongations', icon: <CalendarPlus className="w-3.5 h-3.5" />, dot: !!pendingExt },
    { id: 'finance',       label: 'Finance',       icon: <Euro         className="w-3.5 h-3.5" /> },
    { id: 'documents',     label: 'Documents',     icon: <FileText     className="w-3.5 h-3.5" /> },
    { id: 'retour',        label: 'Retour',        icon: <RotateCcw    className="w-3.5 h-3.5" />, dot: retourNeedsAction },
    { id: 'historique',    label: 'Historique',    icon: <History      className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="flex flex-col -mt-6">

      {/* ── Sticky header + tabs ──────────────────────────────────────────── */}
      <div className="sticky top-14 lg:top-0 z-20 bg-white border-b border-slate-200 shadow-sm -mx-4">

        {/* Header row */}
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/loueur/dashboard"
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors shrink-0 p-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 font-mono leading-none">#{request.dossierNumber}</p>
              <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                {request.sinistre.firstName} {request.sinistre.lastName}
              </p>
            </div>

            <LoueurStatusBadge status={request.status} pulse />

            <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
              <Building2 className="w-3 h-3" />{request.agencyName}
            </span>

            <span className="hidden lg:flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
              <Calendar className="w-3 h-3" />{fmtDate(startDate)} → {fmtDate(endDate)}
            </span>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={`tel:${request.sinistre.phone}`}
              title={`Appeler ${request.sinistre.firstName}`}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Appeler</span>
            </a>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(request.location.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Voir sur Maps"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Maps</span>
            </a>
            {alertState !== 'none' && (
              <button
                onClick={() => setActiveTab('retour')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Urgent</span>
              </button>
            )}
            {isLockedByOther && <Lock className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto scrollbar-none border-t border-slate-100 px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-colors relative shrink-0 border-b-2',
                activeTab === tab.id
                  ? 'text-brand-600 border-brand-500'
                  : 'text-slate-500 hover:text-slate-800 border-transparent',
              ].join(' ')}
            >
              {tab.icon}
              {tab.label}
              {tab.dot && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Banners + response form ───────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-3">
        {isLockedByOther && (
          <BannerRow
            icon={<Lock className="w-5 h-5 text-slate-500" />}
            title="Demande déjà prise en charge"
            description="Cette demande a été validée par un autre loueur."
            accent="bg-slate-400" bg="bg-slate-50 text-slate-700" border="border-slate-200"
          />
        )}
        {!isLockedByOther && !canRespond && <StatusBanner status={request.status} />}
        {canRespond && <RentalResponseForm request={request} onSubmit={handleResponse} />}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="mt-4">
        {activeTab === 'sinistre' && <SinistreTab request={request} />}
        {activeTab === 'envoi' && (
          <EnvoiTab request={request} agency={agency} startDate={startDate} endDate={endDate} />
        )}
        {activeTab === 'prolongations' && (
          <ProlongationsTab request={request} onExtensionResponse={handleExtensionResponse} extLoading={extLoading} />
        )}
        {activeTab === 'finance' && <FinanceTab request={request} />}
        {activeTab === 'documents' && <DocumentsTab request={request} />}
        {activeTab === 'retour' && (
          <RetourTab
            request={request}
            returnDate={returnDate} returnTime={returnTime}
            onDateChange={setReturnDate} onTimeChange={setReturnTime}
            onConfirmReturn={handleConfirmReturn} returnLoading={returnLoading}
            damageDesc={damageDesc} onDamageDescChange={setDamageDesc}
            onDeclareDamage={handleDeclareDamage} damageLoading={damageLoading} damageError={damageError}
          />
        )}
        {activeTab === 'historique' && <HistoriqueTab request={request} />}
      </div>
    </div>
  )
}

// ── Tab A — Sinistré ──────────────────────────────────────────────────────────

function SinistreTab({ request }: { request: ReceivedRequest }) {
  const { sinistre, coverage, location, vehicleGroup, vehicleCategory, requestType, dossierNumber, referenceNumber, notes } = request
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Identité du sinistré">
        <InfoRow icon={<User className="w-4 h-4" />} label="Nom complet" value={`${sinistre.firstName} ${sinistre.lastName}`} />
        <InfoRow
          icon={<Phone className="w-4 h-4" />} label="Téléphone" value={sinistre.phone}
          action={<a href={`tel:${sinistre.phone}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold"><Phone className="w-3 h-3" />Appeler</a>}
        />
        {sinistre.email && (
          <InfoRow
            icon={<Mail className="w-4 h-4" />} label="Email" value={sinistre.email}
            action={<a href={`mailto:${sinistre.email}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold"><Mail className="w-3 h-3" />Email</a>}
          />
        )}
        {sinistre.licenseNumber && (
          <InfoRow icon={<FileText className="w-4 h-4" />} label="N° permis" value={sinistre.licenseNumber} />
        )}
      </Card>

      <Card title="Véhicule immobilisé">
        <InfoRow icon={<Car className="w-4 h-4" />} label="Type" value={VEHICLE_GROUP_LABELS[vehicleGroup]} />
        <InfoRow icon={<Car className="w-4 h-4" />} label="Catégorie" value={VEHICLE_CATEGORY_LABELS[vehicleCategory]} />
        <InfoRow
          icon={<MapPin className="w-4 h-4" />} label="Lieu du sinistre" value={location.address}
          action={
            <a href={`https://maps.google.com/?q=${encodeURIComponent(location.address)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold">
              <MapPin className="w-3 h-3" />Maps
            </a>
          }
        />
        <InfoRow icon={<Navigation className="w-4 h-4" />} label="Distance agence" value={`${request.distanceKm} km`} />
      </Card>

      <Card title="Type de demande">
        <InfoRow
          icon={requestType === 'immediate' ? <Zap className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
          label="Urgence"
          value={<span className={`font-semibold ${requestType === 'immediate' ? 'text-red-600' : 'text-brand-600'}`}>{REQUEST_TYPE_LABELS[requestType]}</span>}
        />
        <InfoRow icon={<FileText className="w-4 h-4" />} label="N° dossier" value={`#${dossierNumber}`} />
        {referenceNumber && <InfoRow icon={<Tag className="w-4 h-4" />} label="Référence" value={referenceNumber} />}
      </Card>

      <Card title="Couverture assurance">
        <InfoRow
          icon={<Shield className="w-4 h-4" />} label="Type de prise en charge"
          value={<span className={coverage.creditType === 'full' ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>{CREDIT_TYPE_LABELS[coverage.creditType]}</span>}
        />
        <InfoRow icon={<Car className="w-4 h-4" />} label="Location du véhicule"
          value={<span className="flex items-center gap-1.5 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" />Prise en charge</span>} />
        <InfoRow icon={<FileText className="w-4 h-4" />} label="Franchise dégâts"
          value={coverage.creditType === 'full'
            ? <span className="flex items-center gap-1.5 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" />Prise en charge</span>
            : <span className="flex items-center gap-1.5 text-slate-400"><XCircle className="w-3.5 h-3.5" />À la charge du sinistré</span>} />
        <InfoRow icon={<Fuel className="w-4 h-4" />} label="Carburant"
          value={coverage.creditType === 'full'
            ? <span className="flex items-center gap-1.5 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" />Pris en charge</span>
            : <span className="flex items-center gap-1.5 text-slate-400"><XCircle className="w-3.5 h-3.5" />À la charge du sinistré</span>} />
      </Card>

      {notes && (
        <div className="lg:col-span-2">
          <Card title="Notes de l'assisteur">
            <p className="text-sm text-slate-700 leading-relaxed">{notes}</p>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Tab B — Envoyer le client ─────────────────────────────────────────────────

function EnvoiTab({ request, agency, startDate, endDate }: {
  request: ReceivedRequest; agency: RentalAgencyRow | null
  startDate: Date; endDate: Date
}) {
  const effectiveDays   = getEffectiveDuration(request)
  const confirmedPrice  = request.loueurResponse?.pricePerDay
  const agencyAddress   = agency
    ? [agency.address, agency.city, agency.postal_code].filter(Boolean).join(', ')
    : null
  const mapsUrl = agencyAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(agencyAddress)}`
    : null
  const smsBody = encodeURIComponent(
    `Bonjour, votre véhicule de remplacement est disponible chez ${request.agencyName}${agencyAddress ? ` (${agencyAddress})` : ''}. Prise en charge : ${fmtDate(startDate)}.`
  )
  const emailSubject = encodeURIComponent(`Votre véhicule de remplacement — ${request.agencyName}`)
  const emailBody = encodeURIComponent(
    `Bonjour ${request.sinistre.firstName},\n\nVotre véhicule de remplacement est disponible :\n\n${request.agencyName}${agencyAddress ? `\n${agencyAddress}` : ''}${agency?.phone ? `\nTél : ${agency.phone}` : ''}\n\nDates :\n• Prise en charge : ${fmtDateLong(startDate)} à ${fmtTime(startDate)}\n• Retour prévu : ${fmtDateLong(endDate)} à ${fmtTime(endDate)}${confirmedPrice ? `\n\nTarif : ${confirmedPrice} €/jour` : ''}\n\nCordialement`
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Agence de prise en charge">
        <InfoRow icon={<Building2 className="w-4 h-4" />} label="Agence" value={<span className="font-semibold">{request.agencyName}</span>} />
        {agencyAddress && (
          <InfoRow
            icon={<MapPin className="w-4 h-4" />} label="Adresse" value={agencyAddress}
            action={<CopyBtn text={agencyAddress} />}
          />
        )}
        {agency?.phone && (
          <InfoRow
            icon={<Phone className="w-4 h-4" />} label="Téléphone agence" value={agency.phone}
            action={<a href={`tel:${agency.phone}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold"><Phone className="w-3 h-3" />Appeler</a>}
          />
        )}
        {agency?.email && <InfoRow icon={<Mail className="w-4 h-4" />} label="Email agence" value={agency.email} />}
        {(agency?.opening_hours_weekdays || agency?.opening_hours_saturday) && (
          <div className="pt-2 flex flex-col gap-1">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide">Horaires</p>
            {agency?.opening_hours_weekdays && <p className="text-sm text-slate-700">Lun–Ven : {agency.opening_hours_weekdays}</p>}
            {agency?.opening_hours_saturday && <p className="text-sm text-slate-700">Samedi : {agency.opening_hours_saturday}</p>}
            {agency?.opening_hours_sunday && <p className="text-sm text-slate-700">Dimanche : {agency.opening_hours_sunday}</p>}
          </div>
        )}
      </Card>

      <Card title="Détails de la location">
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Prise en charge" value={`${fmtDateLong(startDate)} à ${fmtTime(startDate)}`} />
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Retour prévu" value={`${fmtDateLong(endDate)} à ${fmtTime(endDate)}`} />
        <InfoRow icon={<Clock className="w-4 h-4" />} label="Durée totale" value={`${effectiveDays} jour${effectiveDays > 1 ? 's' : ''}`} />
        {confirmedPrice && (
          <InfoRow icon={<Euro className="w-4 h-4" />} label="Tarif confirmé"
            value={<span className="font-bold text-green-700 text-base">{confirmedPrice} €/jour</span>} />
        )}
      </Card>

      <div className="lg:col-span-2">
        <Card title="Envoyer les informations au client">
          <div className="flex flex-wrap gap-3">
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                <MapPin className="w-4 h-4" />Ouvrir Maps
              </a>
            )}
            {agencyAddress && (
              <button
                onClick={() => navigator.clipboard.writeText(agencyAddress)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors">
                <Copy className="w-4 h-4" />Copier l'adresse
              </button>
            )}
            <a href={`sms:${request.sinistre.phone}?body=${smsBody}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors">
              <MessageSquare className="w-4 h-4" />Envoyer SMS
            </a>
            {request.sinistre.email && (
              <a href={`mailto:${request.sinistre.email}?subject=${emailSubject}&body=${emailBody}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                <Mail className="w-4 h-4" />Envoyer email
              </a>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Tab C — Prolongations ─────────────────────────────────────────────────────

function ProlongationsTab({ request, onExtensionResponse, extLoading }: {
  request: ReceivedRequest
  onExtensionResponse: (id: string, r: 'acceptee' | 'refusee') => void
  extLoading: boolean
}) {
  const extensions  = request.extensions ?? []
  const pendingExt  = extensions.find(e => e.status === 'en_attente')
  const pastExts    = extensions.filter(e => e.status !== 'en_attente')
  const pricePerDay = request.loueurResponse?.pricePerDay
  const effectiveDays = getEffectiveDuration(request)

  return (
    <div className="flex flex-col gap-4">
      {pendingExt && (() => {
        const newTotalDays = effectiveDays + pendingExt.requestedDays
        const extCost   = pendingExt.extensionCost ?? (pricePerDay ? pendingExt.requestedDays * pricePerDay : undefined)
        const baseTotal = pricePerDay ? effectiveDays * pricePerDay : undefined
        const totalCost = pendingExt.newTotalPrice ?? (pricePerDay ? newTotalDays * pricePerDay : undefined)
        return (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-orange-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Demande de prolongation en attente
            </div>
            {pendingExt.note && <p className="text-xs text-slate-500 italic">Motif : "{pendingExt.note}"</p>}
            <div className="bg-white rounded-xl border border-orange-200 p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Location en cours ({effectiveDays}j{pricePerDay ? ` × ${pricePerDay} €/j` : ''})</span>
                <span className="font-semibold text-slate-800">{baseTotal !== undefined ? `${baseTotal} €` : `${effectiveDays}j`}</span>
              </div>
              <div className="flex justify-between text-orange-700">
                <span>
                  {pendingExt.isForfait && pendingExt.forfaitLabel
                    ? `+ Forfait ${pendingExt.forfaitLabel} (${pendingExt.requestedDays}j)`
                    : `+ Prolongation (${pendingExt.requestedDays}j${pendingExt.appliedPricePerDay ? ` × ${pendingExt.appliedPricePerDay} €/j` : pricePerDay ? ` × ${pricePerDay} €/j` : ''})`}
                </span>
                <span className="font-semibold">{extCost !== undefined ? `+ ${extCost} €` : `+${pendingExt.requestedDays}j`}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-orange-200 pt-2">
                <span className="text-slate-800">Total si acceptée ({newTotalDays}j{pendingExt.isForfait ? ' — forfait' : ''})</span>
                <span className="text-green-700">{totalCost !== undefined ? `${totalCost} €` : `${newTotalDays}j`}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => onExtensionResponse(pendingExt.id, 'acceptee')} disabled={extLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                {extLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Accepter{extCost !== undefined ? ` — +${extCost} €` : ''}
              </button>
              <button onClick={() => onExtensionResponse(pendingExt.id, 'refusee')} disabled={extLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-300 text-red-600 bg-white hover:bg-red-50 text-sm font-semibold disabled:opacity-60 transition-colors">
                <XCircle className="w-4 h-4" />Refuser
              </button>
            </div>
          </div>
        )
      })()}

      {pastExts.length > 0 ? (
        <Card title="Historique des prolongations">
          <div className="flex flex-col">
            {pastExts.map(ext => {
              const pastCost = ext.extensionCost ?? (pricePerDay && ext.status === 'acceptee' ? ext.requestedDays * pricePerDay : undefined)
              return (
                <div key={ext.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ext.status === 'acceptee' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {ext.status === 'acceptee' ? 'Acceptée' : 'Refusée'}
                  </span>
                  <span className="text-sm text-slate-700 font-medium">+{ext.requestedDays}j</span>
                  {pastCost !== undefined && <span className="text-sm text-green-700 font-semibold">+{pastCost} €</span>}
                  {ext.isForfait && ext.forfaitLabel && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Forfait {ext.forfaitLabel}</span>
                  )}
                  {ext.note && <span className="text-xs text-slate-400 italic truncate max-w-xs">"{ext.note}"</span>}
                </div>
              )
            })}
          </div>
        </Card>
      ) : !pendingExt ? (
        <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
          <CalendarPlus className="w-8 h-8 opacity-30" />
          <p className="text-sm">Aucune prolongation pour ce dossier.</p>
        </div>
      ) : null}
    </div>
  )
}

// ── Tab D — Finance ───────────────────────────────────────────────────────────

function FinanceTab({ request }: { request: ReceivedRequest }) {
  const effectivePrice = request.loueurResponse?.pricePerDay ?? getEffectivePrice(request)
  const effectiveDays  = getEffectiveDuration(request)
  const extensions     = (request.extensions ?? []).filter(e => e.status === 'acceptee')

  if (!effectivePrice) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
        <Euro className="w-8 h-8 opacity-30" />
        <p className="text-sm">Tarif non encore confirmé.</p>
        <p className="text-xs text-center">Les données financières seront disponibles après confirmation du dossier.</p>
      </div>
    )
  }

  const baseDays  = request.durationDays
  const baseTotal = effectivePrice * baseDays
  const extTotal  = extensions.reduce((acc, ext) => {
    const cost = ext.extensionCost
      ?? (ext.appliedPricePerDay ? ext.requestedDays * ext.appliedPricePerDay : ext.requestedDays * effectivePrice)
    return acc + cost
  }, 0)
  const grandTotal = baseTotal + extTotal
  const { commission, net } = calculatePricing(effectivePrice, effectiveDays)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Tarification">
        {request.targetPricePerDay && (
          <InfoRow icon={<Tag className="w-4 h-4" />} label="Tarif cible assisteur" value={`${request.targetPricePerDay} €/j`} />
        )}
        {request.counterOfferPrice && request.counterOfferPrice !== request.targetPricePerDay && (
          <InfoRow icon={<Euro className="w-4 h-4" />} label="Contre-proposition assisteur"
            value={<span className="text-brand-700 font-semibold">{request.counterOfferPrice} €/j</span>} />
        )}
        {request.loueurResponse?.pricePerDay && (
          <InfoRow icon={<Euro className="w-4 h-4" />} label="Votre tarif"
            value={<span className="text-teal-700 font-semibold">{request.loueurResponse.pricePerDay} €/j</span>} />
        )}
        <InfoRow icon={<Euro className="w-4 h-4" />} label="Tarif effectif"
          value={<span className="font-bold text-slate-900 text-base">{effectivePrice} €/j</span>} />
      </Card>

      <Card title="Durée & prolongations">
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Durée initiale" value={`${baseDays} jour${baseDays > 1 ? 's' : ''}`} />
        {extensions.map((ext, i) => (
          <InfoRow key={ext.id} icon={<CalendarPlus className="w-4 h-4" />} label={`Prolongation ${i + 1}`}
            value={<span className="text-green-700">+{ext.requestedDays}j{ext.extensionCost !== undefined ? ` (+${ext.extensionCost} €)` : ''}</span>} />
        ))}
        <div className="border-t border-slate-100 mt-1 pt-1">
          <InfoRow icon={<Clock className="w-4 h-4" />} label="Durée totale"
            value={<span className="font-bold text-slate-900">{effectiveDays} jours</span>} />
        </div>
      </Card>

      <div className="lg:col-span-2">
        <Card title="Récapitulatif financier">
          <div className="flex flex-col gap-0">
            <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
              <span className="text-slate-500">Location base ({baseDays}j × {effectivePrice} €/j)</span>
              <span className="font-semibold text-slate-800 tabular-nums">{baseTotal} €</span>
            </div>
            {extensions.map((ext, i) => {
              const cost = ext.extensionCost ?? (ext.appliedPricePerDay ? ext.requestedDays * ext.appliedPricePerDay : ext.requestedDays * effectivePrice)
              return (
                <div key={ext.id} className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                  <span className="text-slate-500">Prolongation {i + 1} (+{ext.requestedDays}j)</span>
                  <span className="font-semibold text-green-700 tabular-nums">+ {cost} €</span>
                </div>
              )
            })}
            <div className="flex justify-between py-2.5 border-b border-slate-200 text-sm">
              <span className="font-medium text-slate-700">Total HT</span>
              <span className="font-bold text-slate-900 tabular-nums">{grandTotal} €</span>
            </div>
            <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
              <span className="text-slate-500">Commission DRIVES ON (15 %)</span>
              <span className="font-semibold text-slate-400 tabular-nums">− {commission} €</span>
            </div>
            <div className="flex justify-between py-3 -mx-5 px-5 bg-green-50 rounded-b-2xl mt-1">
              <span className="font-bold text-slate-700 text-sm">Dû loueur (net estimé)</span>
              <span className="font-black text-green-700 tabular-nums text-lg">{net} € HT</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Tab E — Documents ─────────────────────────────────────────────────────────

function DocumentsTab({ request }: { request: ReceivedRequest }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <SharedRequestDocuments requestId={request.id} viewerRole="loueur" status={request.status} />
    </div>
  )
}

// ── Tab F — Retour / Dégâts ───────────────────────────────────────────────────

function RetourTab({
  request,
  returnDate, returnTime, onDateChange, onTimeChange, onConfirmReturn, returnLoading,
  damageDesc, onDamageDescChange, onDeclareDamage, damageLoading, damageError,
}: {
  request: ReceivedRequest
  returnDate: string; returnTime: string
  onDateChange: (v: string) => void; onTimeChange: (v: string) => void
  onConfirmReturn: () => void; returnLoading: boolean
  damageDesc: string; onDamageDescChange: (v: string) => void
  onDeclareDamage: () => void; damageLoading: boolean; damageError: string | null
}) {
  const endDate    = getEndDate(request)
  const alertState = getRentalAlertState(request)
  const showReturnForm = (
    (request.status === 'confirmee' && getDisplayStatus(request.status, request.dateNeeded) === 'en_cours') ||
    request.status === 'overdue'
  )

  return (
    <div className="flex flex-col gap-4">
      <Card title="Dates de retour">
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Retour prévu"
          value={<span className={alertState === 'overdue' ? 'text-red-600 font-semibold' : ''}>{fmtDateLong(endDate)} à {fmtTime(endDate)}</span>} />
        {request.returnedAt && (
          <InfoRow icon={<CalendarCheck className="w-4 h-4" />} label="Retour effectif"
            value={<span className="text-green-700 font-semibold">{fmtDateLong(request.returnedAt)} à {fmtTime(request.returnedAt)}</span>} />
        )}
        {alertState === 'overdue' && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-sm text-red-700 font-semibold">Véhicule en retard — confirmez le retour ci-dessous</span>
          </div>
        )}
      </Card>

      {showReturnForm && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-blue-700 font-semibold">
            <CalendarCheck className="w-5 h-5 shrink-0" />
            Confirmer le retour du véhicule
          </div>
          <p className="text-sm text-blue-700/80">
            Saisissez la date et l'heure de restitution effective du véhicule puis confirmez.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Date de retour</label>
              <div className="relative flex items-center">
                <CalendarCheck className="absolute left-3 w-4 h-4 text-blue-400 pointer-events-none" />
                <input type="date" value={returnDate} onChange={e => onDateChange(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-blue-300 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Heure</label>
              <div className="relative flex items-center">
                <Clock className="absolute left-3 w-4 h-4 text-blue-400 pointer-events-none" />
                <input type="time" value={returnTime} onChange={e => onTimeChange(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-blue-300 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <button onClick={onConfirmReturn} disabled={returnLoading || !returnDate || !returnTime}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors shadow-sm">
              {returnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmer le retour
            </button>
          </div>
        </div>
      )}

      {request.status === 'honoree' && (
        request.hasDamageClaim ? (
          <div className="flex overflow-hidden rounded-2xl border-2 border-red-300 bg-red-50">
            <div className="w-1 shrink-0 bg-red-500" />
            <div className="flex items-start gap-3 p-4">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Sinistre déclaré</p>
                <p className="text-xs text-red-700 mt-0.5">
                  Déposez les documents requis dans l'onglet Documents : état des lieux départ, état des lieux retour, et photos des dégâts.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50">
            <div className="w-1 shrink-0 bg-amber-500" />
            <div className="flex-1 p-5 space-y-4">
              <div className="flex items-center gap-2 text-amber-800 font-semibold">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                Signaler un dégât sur le véhicule
              </div>
              <p className="text-sm text-amber-800/80">
                Si le véhicule a subi des dégâts, déclarez le sinistre ci-dessous.
                Vous devrez ensuite déposer les états des lieux et photos dans l'onglet Documents.
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Description (optionnel)</label>
                <textarea value={damageDesc} onChange={e => onDamageDescChange(e.target.value)} rows={3}
                  placeholder="Ex : rayure profonde aile avant droite, pare-chocs enfoncé…"
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
              </div>
              {damageError && <p className="text-xs text-red-500">{damageError}</p>}
              <button onClick={onDeclareDamage} disabled={damageLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors shadow-sm">
                {damageLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Déclaration en cours…</>
                  : <><ShieldAlert className="w-4 h-4" />Déclarer le sinistre</>}
              </button>
            </div>
          </div>
        )
      )}

      {!showReturnForm && request.status !== 'honoree' && !request.returnedAt && alertState === 'none' && (
        <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
          <RotateCcw className="w-8 h-8 opacity-30" />
          <p className="text-sm">Aucune action requise pour le retour.</p>
          <p className="text-xs">Cette section sera active quand la location sera en cours.</p>
        </div>
      )}
    </div>
  )
}

// ── Tab G — Historique ────────────────────────────────────────────────────────

function HistoriqueTab({ request }: { request: ReceivedRequest }) {
  if (!request.timeline.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
        <History className="w-8 h-8 opacity-30" />
        <p className="text-sm">Aucun événement enregistré.</p>
      </div>
    )
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <RequestTimeline events={request.timeline} />
    </div>
  )
}
