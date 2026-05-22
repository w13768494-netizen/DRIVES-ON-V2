'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  ArrowLeft, MapPin, Car, Calendar, Clock, User,
  Phone, Mail, CreditCard, Building2, CheckCircle2,
  XCircle, AlertCircle, RotateCcw, ShieldCheck, ShieldAlert,
  History, FileText, Zap, CalendarClock, ArrowRightLeft,
  Euro, Loader2, AlertTriangle, CalendarX2,
  UserCircle, Clock3, Copy, MessageSquare, CalendarPlus,
  Navigation, SendHorizonal, Tag,
} from 'lucide-react'
import {
  getRequestById, closeRequest, validateTransfer, refuseTransfer,
  confirmByAssisteur, refuseCounterOffer,
} from '@/services/requestService'
import { getDocumentsByRequest } from '@/services/documentService'
import { getRentalAgencyById } from '@/services/loueurService'
import { getDisplayStatus } from '@/lib/displayStatus'
import { getEndDate, getExtensionDeadline, getRentalAlertState } from '@/lib/rentalDates'
import { getEffectiveDuration } from '@/types/request'
import { ExtensionSection } from '@/components/assisteur/ExtensionSection'
import { StatusBadge } from '@/components/assisteur/StatusBadge'
import { RequestTimeline } from '@/components/shared/RequestTimeline'
import { SharedRequestDocuments } from '@/components/shared/SharedRequestDocuments'
import { TransferProposalCard } from '@/components/assisteur/TransferProposalCard'
import { VEHICLE_TYPE_LABELS } from '@/types/rentalCompany'
import { REQUEST_TYPE_LABELS } from '@/types/request'
import { REQUEST_DOCUMENT_TYPE_LABELS } from '@/types/requestDocument'
import type { AssistanceRequest } from '@/types/request'
import type { RentalAgency } from '@/types/rentalAgency'
import type { RequestDocument } from '@/types/requestDocument'

// ── Tab types ─────────────────────────────────────────────────────────────────

type TabId = 'sinistre' | 'envoi' | 'prolongations' | 'finance' | 'documents' | 'retour' | 'historique'

function getDefaultTab(req: AssistanceRequest): TabId {
  if (req.status === 'overdue' || req.status === 'litige_degat') return 'retour'
  if (req.extensions?.some(e => e.status === 'en_attente')) return 'prolongations'
  if (['confirmee', 'honoree', 'cloturee'].includes(req.status)) return 'envoi'
  return 'sinistre'
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
        <div className="text-sm font-medium text-slate-800 break-words">{value}</div>
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DemandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [request,     setRequest]     = useState<AssistanceRequest | null>(null)
  const [agency,      setAgency]      = useState<RentalAgency | null>(null)
  const [docs,        setDocs]        = useState<RequestDocument[]>([])
  const [loading,     setLoading]     = useState(true)
  const [closing,     setClosing]     = useState(false)
  const [offerAction, setOfferAction] = useState<'validating' | 'refusing' | null>(null)
  const [activeTab,   setActiveTab]   = useState<TabId>('sinistre')

  useEffect(() => {
    getRequestById(id).then(req => {
      setRequest(req)
      setLoading(false)
      if (req) {
        setActiveTab(getDefaultTab(req))
        if (req.loueurResponse?.agencyId) {
          getRentalAgencyById(req.loueurResponse.agencyId).then(setAgency)
        }
        getDocumentsByRequest(req.id).then(setDocs)
      }
    })
  }, [id])

  async function handleClose() {
    if (!request || !confirm('Clôturer cette demande ?')) return
    setClosing(true)
    await closeRequest(request.id)
    setRequest(prev => prev ? { ...prev, status: 'cloturee' } : prev)
    setClosing(false)
  }

  async function handleValidateOffer() {
    if (!request) return
    setOfferAction('validating')
    const updated = await confirmByAssisteur(request.id)
    if (updated) setRequest(updated)
    setOfferAction(null)
  }

  async function handleRefuseOffer() {
    if (!request) return
    if (!confirm("Refuser cette contre-proposition ? La demande sera remise en attente d'un loueur.")) return
    setOfferAction('refusing')
    const updated = await refuseCounterOffer(request.id)
    if (updated) setRequest(updated)
    setOfferAction(null)
  }

  async function handleValidateTransfer() {
    if (!request) return
    const transfer = request.transfers.find(t => t.status === 'en_attente')
    if (!transfer) return
    const updated = await validateTransfer(request.id, transfer.id)
    if (updated) setRequest(updated)
  }

  async function handleRefuseTransfer() {
    if (!request) return
    const transfer = request.transfers.find(t => t.status === 'en_attente')
    if (!transfer) return
    const updated = await refuseTransfer(request.id, transfer.id)
    if (updated) setRequest(updated)
  }

  if (loading) return <PageSkeleton />
  if (!request) return (
    <div className="text-center py-24 text-slate-400">
      <p className="font-medium">Demande introuvable.</p>
      <Link href="/assisteur" className="text-brand-500 text-sm mt-2 inline-block">← Retour au tableau de bord</Link>
    </div>
  )

  // ── Derived state ──
  const resp            = request.loueurResponse
  const pendingTransfer = request.transfers.find(t => t.status === 'en_attente')
  const isEnCours       = getDisplayStatus(request.status, request.dateNeeded) === 'en_cours'
  const alertState      = getRentalAlertState(request)
  const endDate         = getEndDate(request)
  const extDeadline     = getExtensionDeadline(request)

  const hasCoverageDoc       = docs.some(d => d.type === 'prise_en_charge' && d.owner === 'assisteur')
  const loueurDocs           = docs.filter(d => d.owner === 'loueur')
  const requiredLoueurDocTypes = request.hasDamageClaim
    ? (['contrat', 'facture', 'etat_depart', 'etat_retour'] as const)
    : (['contrat', 'facture'] as const)
  const missingDocs          = requiredLoueurDocTypes.filter(t => !loueurDocs.some(d => d.type === t))
  const paymentValidated     = request.paymentStatus === 'paye' || request.paymentStatus === 'non_applicable'
  const canClose             = request.status === 'honoree' && missingDocs.length === 0 && paymentValidated

  const agencyAddress = agency
    ? [agency.address, agency.postalCode, agency.city].filter(Boolean).join(', ')
    : resp?.agencyName ?? ''
  const mapsUrl = agency
    ? `https://maps.google.com/?q=${encodeURIComponent(agencyAddress)}`
    : null

  const retourNeedsAction = request.status === 'overdue' || request.status === 'litige_degat' || request.status === 'honoree'

  const tabs: { id: TabId; label: string; icon: React.ReactNode; dot?: boolean }[] = [
    { id: 'sinistre',      label: 'Sinistré',     icon: <User         className="w-3.5 h-3.5" /> },
    { id: 'envoi',         label: 'Envoyer',       icon: <SendHorizonal className="w-3.5 h-3.5" /> },
    { id: 'prolongations', label: 'Prolongations', icon: <CalendarPlus  className="w-3.5 h-3.5" />, dot: alertState === 'extension_urgent' || request.extensions?.some(e => e.status === 'en_attente') },
    { id: 'finance',       label: 'Finance',       icon: <Euro          className="w-3.5 h-3.5" /> },
    { id: 'documents',     label: 'Documents',     icon: <FileText      className="w-3.5 h-3.5" />, dot: !hasCoverageDoc && !['cloturee', 'refusee'].includes(request.status) },
    { id: 'retour',        label: 'Retour',        icon: <RotateCcw     className="w-3.5 h-3.5" />, dot: retourNeedsAction },
    { id: 'historique',    label: 'Historique',    icon: <History       className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="flex flex-col -mt-6">

      {/* ── Sticky header + tabs ──────────────────────────────────────────── */}
      <div className="sticky top-14 lg:top-0 z-20 bg-white border-b border-slate-200 shadow-sm -mx-4">

        {/* Header row */}
        <div className="px-4 py-3 flex items-center gap-3">
          <Link
            href="/assisteur"
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

            <StatusBadge status={request.status} pulse />

            {resp?.agencyName && (
              <span className="hidden sm:flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                <Building2 className="w-3 h-3" />{resp.agencyName}
              </span>
            )}

            {endDate && (
              <span className="hidden lg:flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                <Calendar className="w-3 h-3" />
                {format(new Date(request.dateNeeded), 'd MMM', { locale: fr })} → {format(endDate, 'd MMM', { locale: fr })}
              </span>
            )}

            {!hasCoverageDoc && !['cloturee', 'refusee'].includes(request.status) && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                <AlertTriangle className="w-3 h-3" />PC manquante
              </span>
            )}
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
              title="Lieu de panne"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Panne</span>
            </a>
            {alertState !== 'none' && (
              <button
                onClick={() => setActiveTab(alertState === 'extension_urgent' ? 'prolongations' : 'retour')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                <span className="hidden sm:inline">Urgent</span>
              </button>
            )}
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

      {/* ── Critical action banners (above tabs) ─────────────────────────── */}
      <div className="mt-4 flex flex-col gap-3">

        {/* Overdue alert */}
        {alertState === 'overdue' && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-400 rounded-2xl">
            <CalendarX2 className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-red-700 text-sm">Location en retard</p>
              <p className="text-xs text-red-600 mt-0.5">
                Date de fin : <strong>{format(endDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}</strong>.
                Contactez le loueur et régularisez ce dossier.
              </p>
            </div>
            <button onClick={() => setActiveTab('retour')} className="text-xs font-semibold text-red-700 underline shrink-0">Voir →</button>
          </div>
        )}

        {/* Extension urgent */}
        {alertState === 'extension_urgent' && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-700 text-sm">Prolongation urgente à demander</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Fin prévue : <strong>{format(endDate, "d MMM 'à' HH'h'mm", { locale: fr })}</strong>.
                Deadline J-1 : <strong>{format(extDeadline!, "d MMM 'à' HH'h'mm", { locale: fr })}</strong>.
              </p>
            </div>
            <button onClick={() => setActiveTab('prolongations')} className="text-xs font-semibold text-amber-700 underline shrink-0">Prolonger →</button>
          </div>
        )}

        {/* Offer validation banner (acceptee) */}
        {request.status === 'acceptee' && resp && (
          <OfferValidationBanner
            resp={resp}
            durationDays={request.durationDays}
            offerAction={offerAction}
            onValidate={handleValidateOffer}
            onRefuse={handleRefuseOffer}
          />
        )}

        {/* Envoyée — waiting */}
        {request.status === 'envoyee' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <p className="text-sm font-bold text-amber-800">En attente de réponse</p>
            </div>
            <p className="text-xs text-amber-700 pl-5 mt-1">
              Demande envoyée à <strong>
                {(request.assignedAgencyIds ?? [request.assignedAgencyId].filter(Boolean)).length} loueur(s)
              </strong>. Vous serez notifié dès qu'un loueur répond.
            </p>
          </div>
        )}

        {/* Pending transfer */}
        {pendingTransfer && (
          <TransferProposalCard
            transfer={pendingTransfer}
            onValidate={handleValidateTransfer}
            onRefuse={handleRefuseTransfer}
          />
        )}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="mt-4">
        {activeTab === 'sinistre'      && <SinistreTab request={request} />}
        {activeTab === 'envoi'         && <EnvoiTab request={request} agency={agency} agencyAddress={agencyAddress} mapsUrl={mapsUrl} endDate={endDate} />}
        {activeTab === 'prolongations' && <ProlongationsTab request={request} isEnCours={isEnCours} onUpdated={setRequest} alertState={alertState} endDate={endDate} extDeadline={extDeadline} />}
        {activeTab === 'finance'       && <FinanceTab request={request} endDate={endDate} />}
        {activeTab === 'documents'     && <DocumentsTab request={request} hasCoverageDoc={hasCoverageDoc} missingDocs={[...missingDocs]} />}
        {activeTab === 'retour'        && (
          <RetourTab
            request={request}
            alertState={alertState}
            endDate={endDate}
            missingDocs={[...missingDocs]}
            paymentStatus={request.paymentStatus}
            canClose={canClose}
            closing={closing}
            onClose={handleClose}
          />
        )}
        {activeTab === 'historique'    && <HistoriqueTab request={request} />}
      </div>
    </div>
  )
}

// ── Offer validation banner ───────────────────────────────────────────────────

function OfferValidationBanner({
  resp, durationDays, offerAction, onValidate, onRefuse,
}: {
  resp: NonNullable<AssistanceRequest['loueurResponse']>
  durationDays: number
  offerAction: 'validating' | 'refusing' | null
  onValidate: () => void
  onRefuse: () => void
}) {
  const total = resp.pricePerDay != null ? resp.pricePerDay * durationDays : null
  return (
    <div className="rounded-2xl border-2 border-teal-300 overflow-hidden">
      <div className="h-1 w-full bg-teal-500" />
      <div className="bg-teal-50 px-5 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <Euro className="w-5 h-5 text-teal-600 shrink-0" />
          <p className="text-sm font-black text-teal-800 uppercase tracking-wide">Action requise — valider ou refuser</p>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          {resp.pricePerDay != null ? (
            <>
              <span className="text-3xl font-black text-teal-700 tabular-nums">{resp.pricePerDay} €/j</span>
              {total != null && (
                <span className="text-sm text-slate-500">= <strong className="text-slate-700">{total} €</strong> pour {durationDays}j</span>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-500 italic">Tarif non précisé</span>
          )}
        </div>
        <p className="text-sm font-semibold text-teal-900">{resp.agencyName}</p>
        {(resp.vehicleModel || resp.message) && (
          <div className="space-y-0.5 text-sm">
            {resp.vehicleModel && <p className="text-slate-700 font-medium">{resp.vehicleModel}</p>}
            {resp.message && <p className="text-slate-600 italic">"{resp.message}"</p>}
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button onClick={onValidate} disabled={offerAction !== null}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors disabled:opacity-60">
            {offerAction === 'validating' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {offerAction === 'validating' ? 'Validation…' : 'Valider ce tarif'}
          </button>
          <button onClick={onRefuse} disabled={offerAction !== null}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-300 text-red-600 bg-white hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-60">
            {offerAction === 'refusing' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            {offerAction === 'refusing' ? 'Refus…' : 'Refuser'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tab A — Sinistré / Client ─────────────────────────────────────────────────

function SinistreTab({ request }: { request: AssistanceRequest }) {
  const { sinistre, coverage, location, requestType, dossierNumber, referenceNumber, notes } = request

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Identité du sinistré">
        <InfoRow icon={<User className="w-4 h-4" />} label="Nom complet" value={`${sinistre.firstName} ${sinistre.lastName}`} />
        <InfoRow
          icon={<Phone className="w-4 h-4" />} label="Téléphone" value={<a href={`tel:${sinistre.phone}`} className="text-brand-600 hover:underline">{sinistre.phone}</a>}
          action={<a href={`tel:${sinistre.phone}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold"><Phone className="w-3 h-3" />Appeler</a>}
        />
        {sinistre.email && (
          <InfoRow
            icon={<Mail className="w-4 h-4" />} label="Email" value={<a href={`mailto:${sinistre.email}`} className="text-brand-600 hover:underline">{sinistre.email}</a>}
            action={<a href={`mailto:${sinistre.email}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold"><Mail className="w-3 h-3" />Email</a>}
          />
        )}
        {sinistre.licenseNumber && (
          <InfoRow icon={<CreditCard className="w-4 h-4" />} label="N° permis" value={<span className="font-mono">{sinistre.licenseNumber}</span>} />
        )}
      </Card>

      <Card title="Véhicule immobilisé">
        <InfoRow
          icon={<MapPin className="w-4 h-4" />} label="Lieu de panne" value={location.address}
          action={<a href={`https://maps.google.com/?q=${encodeURIComponent(location.address)}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold"><MapPin className="w-3 h-3" />Maps</a>}
        />
        <InfoRow icon={<Car className="w-4 h-4" />} label="Catégorie souhaitée" value={VEHICLE_TYPE_LABELS[request.vehicleCategory]} />
      </Card>

      <Card title="Informations dossier">
        <InfoRow icon={<FileText className="w-4 h-4" />} label="N° dossier" value={<span className="font-mono font-semibold">#{dossierNumber}</span>} />
        {referenceNumber && <InfoRow icon={<Tag className="w-4 h-4" />} label="Référence" value={referenceNumber} />}
        <InfoRow
          icon={requestType === 'immediate' ? <Zap className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
          label="Type"
          value={<span className={`font-semibold ${requestType === 'immediate' ? 'text-red-600' : 'text-brand-600'}`}>{REQUEST_TYPE_LABELS[requestType]}</span>}
        />
        <InfoRow
          icon={<Calendar className="w-4 h-4" />} label="Créée le"
          value={format(new Date(request.createdAt), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
        />
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Date souhaitée"
          value={format(new Date(request.dateNeeded), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })} />
        <InfoRow icon={<Clock className="w-4 h-4" />} label="Durée initiale"
          value={`${request.durationDays} jour${request.durationDays > 1 ? 's' : ''}${request.maxExtensionDays ? ` + ${request.maxExtensionDays}j max` : ''}`} />
      </Card>

      <Card title="Couverture assurance">
        <div className={`flex items-start gap-3 p-3 rounded-xl mb-2 ${coverage.creditType === 'full' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          {coverage.creditType === 'full'
            ? <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            : <ShieldAlert  className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
          <div>
            <p className={`font-semibold text-sm ${coverage.creditType === 'full' ? 'text-green-800' : 'text-amber-800'}`}>
              {coverage.creditType === 'full' ? 'Prise en charge totale' : 'Prise en charge partielle'}
            </p>
            <p className={`text-xs mt-0.5 ${coverage.creditType === 'full' ? 'text-green-700' : 'text-amber-700'}`}>
              {coverage.creditType === 'full'
                ? 'Location, franchise et carburant couverts.'
                : 'Location uniquement — franchise et carburant à la charge du sinistré.'}
            </p>
          </div>
        </div>
      </Card>

      {notes && (
        <div className="lg:col-span-2">
          <Card title="Notes internes">
            <p className="text-sm text-slate-700 leading-relaxed">{notes}</p>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Tab B — Envoyer le client ─────────────────────────────────────────────────

function EnvoiTab({ request, agency, agencyAddress, mapsUrl, endDate }: {
  request: AssistanceRequest
  agency: RentalAgency | null
  agencyAddress: string
  mapsUrl: string | null
  endDate: Date
}) {
  const resp = request.loueurResponse

  if (!resp) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
        <Building2 className="w-8 h-8 opacity-30" />
        <p className="text-sm">Aucun loueur confirmé pour l'instant.</p>
        <p className="text-xs text-center">Cette section sera disponible une fois la demande confirmée par un loueur.</p>
      </div>
    )
  }

  const effectiveDays = getEffectiveDuration(request)
  const smsBody = encodeURIComponent(
    `Bonjour, votre véhicule de remplacement est disponible chez ${resp.agencyName}${agencyAddress ? ` (${agencyAddress})` : ''}. Disponible à partir du ${format(new Date(request.dateNeeded), 'd MMM', { locale: fr })}.`
  )
  const emailSubject = encodeURIComponent(`Votre véhicule de remplacement — ${resp.agencyName}`)
  const emailBody = encodeURIComponent(
    `Bonjour ${request.sinistre.firstName},\n\nVotre véhicule de remplacement est disponible :\n\n${resp.agencyName}${agencyAddress ? `\n${agencyAddress}` : ''}${agency?.phone ? `\nTél : ${agency.phone}` : ''}\n\nDates :\n• Prise en charge : ${format(new Date(request.dateNeeded), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}\n• Retour prévu : ${format(endDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}${resp.pricePerDay ? `\n\nTarif : ${resp.pricePerDay} €/jour` : ''}\n\nCordialement`
  )

  const hoursRows = agency?.openingHours ? [
    { day: 'Lun–Ven',  val: agency.openingHours.weekdays },
    { day: 'Samedi',   val: agency.openingHours.saturday ?? 'Fermé' },
    { day: 'Dimanche', val: agency.openingHours.sunday ?? 'Fermé' },
  ] : []

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Agence confirmée">
        <InfoRow icon={<Building2 className="w-4 h-4" />} label="Agence" value={<span className="font-semibold">{resp.agencyName}</span>} />
        {agencyAddress && (
          <InfoRow
            icon={<MapPin className="w-4 h-4" />} label="Adresse" value={agencyAddress}
            action={<CopyBtn text={agencyAddress} />}
          />
        )}
        {agency?.phone && (
          <InfoRow
            icon={<Phone className="w-4 h-4" />} label="Téléphone"
            value={<a href={`tel:${agency.phone}`} className="text-brand-600 font-medium">{agency.phone}</a>}
            action={<a href={`tel:${agency.phone}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold"><Phone className="w-3 h-3" />Appeler</a>}
          />
        )}
        {agency?.email && (
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Email agence"
            value={<a href={`mailto:${agency.email}`} className="text-brand-600">{agency.email}</a>} />
        )}
        {agency?.contactName && (
          <InfoRow icon={<UserCircle className="w-4 h-4" />} label="Contact" value={agency.contactName} />
        )}
        {hoursRows.length > 0 && (
          <div className="pt-2 flex flex-col gap-1">
            <p className="text-[11px] text-slate-400 uppercase tracking-wide flex items-center gap-1"><Clock3 className="w-3 h-3" />Horaires</p>
            {hoursRows.map(row => (
              <div key={row.day} className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 w-20 shrink-0">{row.day}</span>
                <span className={`font-mono font-semibold ${row.val === 'Fermé' ? 'text-slate-400' : 'text-slate-800'}`}>{row.val}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Détails de la location">
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Prise en charge"
          value={format(new Date(request.dateNeeded), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })} />
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Retour prévu"
          value={format(endDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })} />
        <InfoRow icon={<Clock className="w-4 h-4" />} label="Durée totale"
          value={`${effectiveDays} jour${effectiveDays > 1 ? 's' : ''}`} />
        {resp.pricePerDay != null && (
          <InfoRow icon={<Euro className="w-4 h-4" />} label="Tarif confirmé"
            value={<span className="font-bold text-green-700 text-base">{resp.pricePerDay} €/jour</span>} />
        )}
        {resp.vehicleModel && (
          <InfoRow icon={<Car className="w-4 h-4" />} label="Modèle proposé" value={resp.vehicleModel} />
        )}
      </Card>

      <div className="lg:col-span-2">
        <Card title="Envoyer les informations au sinistré">
          <div className="flex flex-wrap gap-3">
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
                <Navigation className="w-4 h-4" />Ouvrir Maps
              </a>
            )}
            {agencyAddress && (
              <button onClick={() => navigator.clipboard.writeText(agencyAddress)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors">
                <Copy className="w-4 h-4" />Copier l'adresse
              </button>
            )}
            {agency?.phone && (
              <a href={`tel:${agency.phone}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold transition-colors border border-green-200">
                <Phone className="w-4 h-4" />Appeler l'agence
              </a>
            )}
            <a href={`sms:${request.sinistre.phone}?body=${smsBody}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors">
              <MessageSquare className="w-4 h-4" />SMS au sinistré
            </a>
            {request.sinistre.email && (
              <a href={`mailto:${request.sinistre.email}?subject=${emailSubject}&body=${emailBody}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
                <Mail className="w-4 h-4" />Email au sinistré
              </a>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Tab C — Prolongations ─────────────────────────────────────────────────────

function ProlongationsTab({ request, isEnCours, onUpdated, alertState, endDate, extDeadline }: {
  request: AssistanceRequest
  isEnCours: boolean
  onUpdated: (r: AssistanceRequest) => void
  alertState: string
  endDate: Date
  extDeadline: Date | null
}) {
  const extensions = request.extensions ?? []
  const pastExts   = extensions.filter(e => e.status !== 'en_attente')
  const pendingExt = extensions.find(e => e.status === 'en_attente')

  return (
    <div className="flex flex-col gap-4">
      {isEnCours && (
        <ExtensionSection request={request} onUpdated={onUpdated} />
      )}

      {!isEnCours && !pendingExt && extensions.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
          <CalendarPlus className="w-8 h-8 opacity-30" />
          <p className="text-sm">Aucune prolongation pour ce dossier.</p>
          {!isEnCours && (
            <p className="text-xs text-center">Cette section sera active une fois la location en cours.</p>
          )}
        </div>
      )}

      {pastExts.length > 0 && (
        <Card title="Historique des prolongations">
          <div className="flex flex-col">
            {pastExts.map(ext => (
              <div key={ext.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  ext.status === 'acceptee' ? 'bg-green-100 text-green-700'
                  : ext.status === 'refusee' ? 'bg-red-100 text-red-700'
                  : 'bg-orange-100 text-orange-700'
                }`}>
                  {ext.status === 'acceptee' ? 'Acceptée' : ext.status === 'refusee' ? 'Refusée' : 'En attente'}
                </span>
                <span className="text-sm text-slate-700 font-medium">+{ext.requestedDays} jour{ext.requestedDays > 1 ? 's' : ''}</span>
                {ext.extensionCost !== undefined && (
                  <span className="text-sm text-green-700 font-semibold">+{ext.extensionCost} €</span>
                )}
                {ext.isForfait && ext.forfaitLabel && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Forfait {ext.forfaitLabel}</span>
                )}
                {ext.note && <span className="text-xs text-slate-400 italic truncate max-w-xs">"{ext.note}"</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Tab D — Finance ───────────────────────────────────────────────────────────

function FinanceTab({ request, endDate }: { request: AssistanceRequest; endDate: Date }) {
  const resp          = request.loueurResponse
  const effectiveDays = getEffectiveDuration(request)
  const extensions    = (request.extensions ?? []).filter(e => e.status === 'acceptee')

  if (!resp?.pricePerDay) {
    return (
      <div className="flex flex-col gap-4">
        <Card title="Tarification">
          {request.targetPricePerDay && (
            <InfoRow icon={<Tag className="w-4 h-4" />} label="Tarif cible" value={<span className="font-semibold text-brand-700">{request.targetPricePerDay} €/j</span>} />
          )}
          <InfoRow icon={<Clock className="w-4 h-4" />} label="Durée initiale" value={`${request.durationDays} jour${request.durationDays > 1 ? 's' : ''}`} />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Retour prévu" value={format(endDate, "d MMMM yyyy", { locale: fr })} />
        </Card>
        <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
          <Euro className="w-8 h-8 opacity-30" />
          <p className="text-sm">Tarif final disponible après confirmation du loueur.</p>
        </div>
      </div>
    )
  }

  const baseDays   = request.durationDays
  const baseTotal  = resp.pricePerDay * baseDays
  const extTotal   = extensions.reduce((acc, ext) => {
    const cost = ext.extensionCost
      ?? (ext.appliedPricePerDay ? ext.requestedDays * ext.appliedPricePerDay : ext.requestedDays * resp.pricePerDay!)
    return acc + cost
  }, 0)
  const grandTotal = baseTotal + extTotal

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Tarification">
        {request.targetPricePerDay && (
          <InfoRow icon={<Tag className="w-4 h-4" />} label="Tarif cible initial" value={`${request.targetPricePerDay} €/j`} />
        )}
        {request.counterOfferPrice && request.counterOfferPrice !== request.targetPricePerDay && (
          <InfoRow icon={<Euro className="w-4 h-4" />} label="Contre-offre soumise"
            value={<span className="text-brand-700 font-semibold">{request.counterOfferPrice} €/j</span>} />
        )}
        <InfoRow icon={<Euro className="w-4 h-4" />} label="Tarif confirmé"
          value={<span className="font-bold text-green-700 text-base">{resp.pricePerDay} €/j</span>} />
      </Card>

      <Card title="Durée & prolongations">
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Durée initiale"
          value={`${baseDays} jour${baseDays > 1 ? 's' : ''} × ${resp.pricePerDay} €/j = ${baseTotal} €`} />
        {extensions.map((ext, i) => {
          const cost = ext.extensionCost ?? (ext.appliedPricePerDay ? ext.requestedDays * ext.appliedPricePerDay : ext.requestedDays * resp.pricePerDay!)
          return (
            <InfoRow key={ext.id} icon={<CalendarPlus className="w-4 h-4" />} label={`Prolongation ${i + 1}`}
              value={<span className="text-green-700">+{ext.requestedDays}j = +{cost} €</span>} />
          )
        })}
        <div className="border-t border-slate-100 mt-1 pt-1">
          <InfoRow icon={<Clock className="w-4 h-4" />} label="Durée totale"
            value={<span className="font-bold text-slate-900">{effectiveDays} jours</span>} />
        </div>
      </Card>

      <div className="lg:col-span-2">
        <Card title="Récapitulatif">
          <div className="flex flex-col gap-0">
            <div className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
              <span className="text-slate-500">Location base ({baseDays}j × {resp.pricePerDay} €/j)</span>
              <span className="font-semibold text-slate-800 tabular-nums">{baseTotal} €</span>
            </div>
            {extensions.map((ext, i) => {
              const cost = ext.extensionCost ?? (ext.appliedPricePerDay ? ext.requestedDays * ext.appliedPricePerDay : ext.requestedDays * resp.pricePerDay!)
              return (
                <div key={ext.id} className="flex justify-between py-2.5 border-b border-slate-100 text-sm">
                  <span className="text-slate-500">Prolongation {i + 1} (+{ext.requestedDays}j)</span>
                  <span className="font-semibold text-green-700 tabular-nums">+ {cost} €</span>
                </div>
              )
            })}
            <div className="flex justify-between py-3 -mx-5 px-5 bg-brand-50 rounded-b-2xl mt-1">
              <span className="font-bold text-slate-700 text-sm">Total prise en charge HT</span>
              <span className="font-black text-brand-700 tabular-nums text-lg">{grandTotal} €</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card title="Couverture">
          <div className={`flex items-start gap-3 p-3 rounded-xl ${request.coverage.creditType === 'full' ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            {request.coverage.creditType === 'full'
              ? <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
              : <ShieldAlert  className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            <div>
              <p className={`font-semibold text-sm ${request.coverage.creditType === 'full' ? 'text-green-800' : 'text-amber-800'}`}>
                {request.coverage.creditType === 'full' ? 'Prise en charge totale' : 'Prise en charge partielle'}
              </p>
              <p className={`text-xs mt-0.5 ${request.coverage.creditType === 'full' ? 'text-green-700' : 'text-amber-700'}`}>
                {request.coverage.creditType === 'full'
                  ? 'Location, franchise et carburant couverts par l\'assureur.'
                  : 'Location uniquement — franchise et carburant restent à la charge du sinistré.'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ── Tab E — Documents ─────────────────────────────────────────────────────────

function DocumentsTab({ request, hasCoverageDoc, missingDocs }: {
  request: AssistanceRequest
  hasCoverageDoc: boolean
  missingDocs: string[]
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Coverage doc status */}
      <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${hasCoverageDoc ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-300'}`}>
        {hasCoverageDoc
          ? <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          : <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
        <div>
          <p className={`font-semibold text-sm ${hasCoverageDoc ? 'text-green-800' : 'text-amber-800'}`}>
            {hasCoverageDoc ? 'Prise en charge uploadée' : 'Prise en charge manquante'}
          </p>
          <p className={`text-xs mt-0.5 ${hasCoverageDoc ? 'text-green-700' : 'text-amber-700'}`}>
            {hasCoverageDoc
              ? 'Le loueur a accès à votre prise en charge.'
              : 'Uploadez la prise en charge via le gestionnaire ci-dessous.'}
          </p>
        </div>
      </div>

      {/* Shared documents */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <SharedRequestDocuments
          requestId={request.id}
          viewerRole="assisteur"
          status={request.status}
        />
      </div>

      {/* Missing docs checklist if honoree */}
      {request.status === 'honoree' && missingDocs.length > 0 && (
        <Card title="Documents loueur manquants">
          <div className="flex flex-col gap-2">
            {missingDocs.map(type => (
              <div key={type} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-400">
                <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />
                {REQUEST_DOCUMENT_TYPE_LABELS[type as keyof typeof REQUEST_DOCUMENT_TYPE_LABELS]}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Tab F — Retour / Dégâts ───────────────────────────────────────────────────

function RetourTab({ request, alertState, endDate, missingDocs, paymentStatus, canClose, closing, onClose }: {
  request: AssistanceRequest
  alertState: string
  endDate: Date
  missingDocs: string[]
  paymentStatus: string | undefined
  canClose: boolean
  closing: boolean
  onClose: () => void
}) {
  const paymentOk = paymentStatus === 'paye' || paymentStatus === 'non_applicable'

  const requiredDocTypes = request.hasDamageClaim
    ? (['contrat', 'facture', 'etat_depart', 'etat_retour'] as const)
    : (['contrat', 'facture'] as const)

  return (
    <div className="flex flex-col gap-4">
      {/* Return dates */}
      <Card title="Retour véhicule">
        <InfoRow icon={<Calendar className="w-4 h-4" />} label="Retour prévu"
          value={<span className={alertState === 'overdue' ? 'text-red-600 font-semibold' : ''}>
            {format(endDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
          </span>} />
        {request.returnedAt && (
          <InfoRow icon={<CalendarX2 className="w-4 h-4" />} label="Retour effectif"
            value={<span className="text-green-700 font-semibold">
              {format(new Date(request.returnedAt), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
            </span>} />
        )}
        {alertState === 'overdue' && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-sm text-red-700 font-semibold">Véhicule en retard — contactez le loueur</span>
          </div>
        )}
      </Card>

      {/* Damage / litige */}
      {(request.hasDamageClaim || request.status === 'litige_degat') && (
        <div className="flex overflow-hidden rounded-2xl border-2 border-red-300 bg-red-50">
          <div className="w-1 shrink-0 bg-red-500" />
          <div className="flex items-start gap-3 p-4">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {request.status === 'litige_degat' ? 'Litige en cours' : 'Sinistre déclaré par le loueur'}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {request.status === 'litige_degat'
                  ? 'Dossier bloqué en attente de résolution par l\'administration DRIVES ON.'
                  : 'Vérifiez les documents dans l\'onglet Documents : état des lieux, photos des dégâts.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Closure readiness (honoree) */}
      {request.status === 'honoree' && (() => {
        const allReady = missingDocs.length === 0 && paymentOk
        return (
          <div className={`rounded-2xl border-2 overflow-hidden ${allReady ? 'border-green-300' : 'border-blue-300'}`}>
            <div className={`h-1 w-full ${allReady ? 'bg-green-500' : 'bg-blue-500'}`} />
            <div className={`p-5 space-y-4 ${allReady ? 'bg-green-50' : 'bg-blue-50'}`}>
              <div className={`flex items-center gap-2 font-semibold ${allReady ? 'text-green-700' : 'text-blue-700'}`}>
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                Conditions de clôture
                {request.hasDamageClaim && (
                  <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">Sinistre</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {requiredDocTypes.map(type => {
                  const present = !missingDocs.includes(type)
                  return (
                    <div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${present ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                      {present ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                      {REQUEST_DOCUMENT_TYPE_LABELS[type]}
                    </div>
                  )
                })}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium sm:col-span-2 ${paymentOk ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                  {paymentOk ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                  {paymentOk
                    ? (paymentStatus === 'non_applicable' ? 'Aucun paiement requis' : 'Paiement validé par DRIVES ON')
                    : 'En attente de validation paiement par DRIVES ON'}
                </div>
              </div>
              {!allReady && (
                <p className="text-sm text-blue-600">
                  Le dossier pourra être clôturé une fois tous les documents déposés et le paiement validé.
                </p>
              )}
            </div>
          </div>
        )
      })()}

      {/* Close button */}
      {canClose && (
        <button
          onClick={onClose}
          disabled={closing}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-sm transition-colors disabled:opacity-50"
        >
          {closing ? 'Clôture…' : 'Clôturer le dossier'}
        </button>
      )}

      {/* Refused — re-send */}
      {request.status === 'refusee' && (
        <Link
          href="/assisteur/nouvelle-demande"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Relancer avec un autre loueur
        </Link>
      )}

      {!request.returnedAt && alertState === 'none' && request.status !== 'honoree' && request.status !== 'litige_degat' && !request.hasDamageClaim && (
        <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
          <RotateCcw className="w-8 h-8 opacity-30" />
          <p className="text-sm">Aucun retour enregistré pour l'instant.</p>
        </div>
      )}
    </div>
  )
}

// ── Tab G — Historique ────────────────────────────────────────────────────────

function HistoriqueTab({ request }: { request: AssistanceRequest }) {
  const agencyCount = (request.assignedAgencyIds ?? [request.assignedAgencyId].filter(Boolean)).length

  return (
    <div className="flex flex-col gap-4">
      {/* Loueurs contactés */}
      {agencyCount > 0 && (
        <Card title="Loueurs contactés">
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-slate-500">Total sollicités</span>
            <span className="text-sm font-bold text-slate-900">{agencyCount} loueur{agencyCount > 1 ? 's' : ''}</span>
          </div>
          {request.loueurResponse && (
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-slate-800 truncate">{request.loueurResponse.agencyName}</span>
              <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                ['confirmee', 'honoree', 'cloturee'].includes(request.status)
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-teal-50 text-teal-700 border border-teal-200'
              }`}>
                {['confirmee', 'honoree', 'cloturee'].includes(request.status) ? 'Confirmé' : 'A répondu'}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Transfers */}
      {request.transfers.length > 0 && (
        <Card title="Historique des transferts">
          <div className="flex flex-col gap-3">
            {request.transfers.map(t => (
              <div key={t.id} className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    t.status === 'valide' ? 'bg-green-100 text-green-700'
                    : t.status === 'refuse' ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                  }`}>
                    {t.status === 'valide' ? 'Validé' : t.status === 'refuse' ? 'Refusé' : 'En attente'}
                  </span>
                  <span className="text-slate-600 flex items-center gap-1">
                    {t.fromAgencyName} <ArrowRightLeft className="w-3 h-3 text-slate-400" /> {t.toAgencyName}
                  </span>
                </div>
                {t.reason && <p className="text-slate-500 text-xs italic pl-2">"{t.reason}"</p>}
                <p className="text-xs text-slate-400 pl-2">
                  {format(new Date(t.proposedAt), "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Timeline */}
      {request.timeline.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <RequestTimeline events={request.timeline} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
          <History className="w-8 h-8 opacity-30" />
          <p className="text-sm">Aucun événement enregistré.</p>
        </div>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 -mt-6 animate-pulse">
      <div className="h-20 bg-slate-100 rounded-b-2xl" />
      <div className="h-10 bg-slate-100 rounded-xl" />
      <div className="h-40 bg-slate-100 rounded-2xl" />
      <div className="h-40 bg-slate-100 rounded-2xl" />
    </div>
  )
}
