'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, MapPin, Car, Calendar, Clock, Hash, User,
  Phone, Mail, CreditCard, Building2, CheckCircle2,
  XCircle, AlertCircle, RotateCcw, ShieldCheck, ShieldAlert,
  History, FileText, Zap, CalendarClock, ArrowRightLeft,
  Euro, Loader2, AlertTriangle, CalendarX2, ExternalLink,
  UserCircle, Clock3, SendHorizonal, Navigation,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getRequestById, closeRequest, validateTransfer, refuseTransfer, confirmByAssisteur, refuseCounterOffer } from '@/services/requestService'
import { getDocumentsByRequest } from '@/services/documentService'
import { getRentalAgencyById } from '@/services/loueurService'
import { getDisplayStatus } from '@/lib/displayStatus'
import { getEndDate, getExtensionDeadline, getRentalAlertState } from '@/lib/rentalDates'
import { ExtensionSection } from '@/components/assisteur/ExtensionSection'
import { StatusBadge } from '@/components/assisteur/StatusBadge'
import { RequestTimeline } from '@/components/shared/RequestTimeline'
import { SharedRequestDocuments } from '@/components/shared/SharedRequestDocuments'
import { TransferProposalCard } from '@/components/assisteur/TransferProposalCard'
import { VEHICLE_TYPE_LABELS } from '@/types/rentalCompany'
import { REQUEST_TYPE_LABELS } from '@/types/request'
import type { AssistanceRequest } from '@/types/request'
import type { RentalAgency } from '@/types/rentalAgency'
import type { RequestDocument } from '@/types/requestDocument'
import { REQUEST_DOCUMENT_TYPE_LABELS } from '@/types/requestDocument'

export default function DemandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [request, setRequest]             = useState<AssistanceRequest | null>(null)
  const [agency, setAgency]               = useState<RentalAgency | null>(null)
  const [docs, setDocs]                   = useState<RequestDocument[]>([])
  const [loading, setLoading]             = useState(true)
  const [closing, setClosing]             = useState(false)
  const [offerAction, setOfferAction]     = useState<'validating' | 'refusing' | null>(null)
  useEffect(() => {
    getRequestById(id).then(req => {
      setRequest(req)
      setLoading(false)
      if (req?.loueurResponse?.agencyId) {
        getRentalAgencyById(req.loueurResponse.agencyId).then(setAgency)
      }
      if (req) {
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
    if (!confirm('Refuser cette contre-proposition ? La demande sera remise en attente d\'un loueur.')) return
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

  const resp              = request.loueurResponse
  const pendingTransfer   = request.transfers.find(t => t.status === 'en_attente')
  const isEnCours         = getDisplayStatus(request.status, request.dateNeeded) === 'en_cours'

  const hasCoverageDoc         = docs.some(d => d.type === 'prise_en_charge' && d.owner === 'assisteur')
  const loueurDocs             = docs.filter(d => d.owner === 'loueur')
  // etat_depart / etat_retour requis uniquement si sinistre déclaré par le loueur
  const requiredLoueurDocTypes = request.hasDamageClaim
    ? (['contrat', 'facture', 'etat_depart', 'etat_retour'] as const)
    : (['contrat', 'facture'] as const)
  const missingDocs            = requiredLoueurDocTypes.filter(t => !loueurDocs.some(d => d.type === t))
  const paymentValidated       = request.paymentStatus === 'paye' || request.paymentStatus === 'non_applicable'
  const canClose               = request.status === 'honoree'
    && missingDocs.length === 0
    && paymentValidated
  const alertState      = getRentalAlertState(request)
  const endDate         = request.status === 'confirmee' ? getEndDate(request) : null
  const extDeadline     = request.status === 'confirmee' ? getExtensionDeadline(request) : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Retour */}
      <Link href="/assisteur" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Tableau de bord
      </Link>

      {/* ── Bloc action rapide ── */}
      <ActionBanner
        status={request.status}
        agencyCount={(request.assignedAgencyIds ?? [request.assignedAgencyId].filter(Boolean)).length}
        resp={resp ?? null}
        agency={agency}
        durationDays={request.durationDays}
        offerAction={offerAction}
        onValidate={handleValidateOffer}
        onRefuse={handleRefuseOffer}
      />

      {/* ── Loueurs contactés ── */}
      <ContactedAgenciesSection
        agencyCount={(request.assignedAgencyIds ?? [request.assignedAgencyId].filter(Boolean)).length}
        loueurResponse={resp}
        status={request.status}
      />

      {/* Header dossier */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                {request.dossierNumber}
              </span>
              {request.referenceNumber && (
                <span className="text-xs text-slate-400 font-mono">{request.referenceNumber}</span>
              )}
            </div>
            <h1 className="text-xl font-black text-slate-900">
              {request.sinistre.firstName} {request.sinistre.lastName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                request.requestType === 'immediate' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-brand-50 text-brand-600 border border-brand-200'
              }`}>
                {request.requestType === 'immediate'
                  ? <><Zap className="w-3 h-3" />{REQUEST_TYPE_LABELS.immediate}</>
                  : <><CalendarClock className="w-3 h-3" />{REQUEST_TYPE_LABELS.planifiee}</>
                }
              </span>
              <span className="text-xs text-slate-400">
                Créée {format(request.createdAt, "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
              </span>
              {!['cloturee'].includes(request.status) && (
                hasCoverageDoc
                  ? <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                      <ShieldCheck className="w-3 h-3" /> PC jointe
                    </span>
                  : <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                      <AlertTriangle className="w-3 h-3" /> PC manquante
                    </span>
              )}
            </div>
          </div>
          <StatusBadge status={request.status} pulse />
        </div>
      </div>

      {/* ── Alerte retard / urgence prolongation ── */}
      {alertState === 'overdue' && endDate && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-400 rounded-2xl">
          <CalendarX2 className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-700 text-sm">Location en retard (overdue)</p>
            <p className="text-xs text-red-600 mt-0.5">
              La date de fin était le{' '}
              <strong>{format(endDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}</strong>.
              {' '}Aucune prolongation acceptée. Ce dossier doit être régularisé.
            </p>
            <p className="text-xs text-red-500 mt-1 font-medium">
              → Contactez le loueur et clôturez ou prolongez ce dossier immédiatement.
            </p>
          </div>
        </div>
      )}

      {alertState === 'extension_urgent' && endDate && extDeadline && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-700 text-sm">Prolongation urgente à demander</p>
            <p className="text-xs text-amber-700 mt-0.5">
              La location se termine le{' '}
              <strong>{format(endDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}</strong>.
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Le délai pour demander une prolongation (J-1) était le{' '}
              <strong>{format(extDeadline, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}</strong>.
              {' '}Demandez une prolongation maintenant ou préparez la clôture du dossier.
            </p>
          </div>
        </div>
      )}

      {/* ── Prise en charge ── */}
      <CoverageBlock coverage={request.coverage} />

      {/* ── Transfert en attente ── */}
      {pendingTransfer && (
        <TransferProposalCard
          transfer={pendingTransfer}
          onValidate={handleValidateTransfer}
          onRefuse={handleRefuseTransfer}
        />
      )}

      {/* ── Réponse loueur ── */}
      {resp && <LoueurResponseCard response={resp} status={request.status} durationDays={request.durationDays} agency={agency} returnedAt={request.returnedAt} />}

      {/* ── Conditions de clôture ── */}
      {request.status === 'honoree' && (
        <ClosureReadinessCard
          missingDocs={missingDocs}
          paymentStatus={request.paymentStatus}
          hasDamageClaim={!!request.hasDamageClaim}
        />
      )}

      {/* ── Prolongation ── */}
      {isEnCours && (
        <ExtensionSection
          request={request}
          onUpdated={setRequest}
        />
      )}

      {/* ── Sinistré ── */}
      <Card title="Sinistré" icon={<User className="w-4 h-4 text-brand-500" />}>
        <Row icon={<User className="w-4 h-4" />} label="Identité">
          {request.sinistre.firstName} {request.sinistre.lastName}
        </Row>
        <Row icon={<Phone className="w-4 h-4" />} label="Téléphone">
          <a href={`tel:${request.sinistre.phone}`} className="text-brand-600 hover:underline">
            {request.sinistre.phone}
          </a>
        </Row>
        {request.sinistre.email && (
          <Row icon={<Mail className="w-4 h-4" />} label="Email">
            <a href={`mailto:${request.sinistre.email}`} className="text-brand-600 hover:underline">
              {request.sinistre.email}
            </a>
          </Row>
        )}
        {request.sinistre.licenseNumber && (
          <Row icon={<CreditCard className="w-4 h-4" />} label="N° permis">
            <span className="font-mono">{request.sinistre.licenseNumber}</span>
          </Row>
        )}
      </Card>

      {/* ── Demande ── */}
      <Card title="Détails de la demande" icon={<Hash className="w-4 h-4 text-brand-500" />}>
        <Row icon={<MapPin className="w-4 h-4" />} label="Lieu de panne">
          {request.location.address}
        </Row>
        <Row icon={<Car className="w-4 h-4" />} label="Véhicule souhaité">
          {VEHICLE_TYPE_LABELS[request.vehicleCategory]}
        </Row>
        <Row icon={<Calendar className="w-4 h-4" />} label="Date souhaitée">
          {format(request.dateNeeded, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
        </Row>
        <Row icon={<Clock className="w-4 h-4" />} label="Durée">
          {request.durationDays} jour{request.durationDays > 1 ? 's' : ''}
          {request.maxExtensionDays && (
            <span className="ml-2 inline-flex items-center text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
              + {request.maxExtensionDays} j de prolongation possible
            </span>
          )}
        </Row>
        {endDate && (
          <Row icon={<CalendarX2 className="w-4 h-4" />} label="Date de fin prévue">
            <span className="font-medium">
              {format(endDate, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
            </span>
            {extDeadline && (
              <span className={`ml-2 inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                alertState === 'overdue'         ? 'bg-red-100 text-red-700'
                : alertState === 'extension_urgent' ? 'bg-amber-100 text-amber-700'
                :                                     'bg-slate-100 text-slate-500'
              }`}>
                <Clock className="w-3 h-3" />
                Deadline prolongation : {format(extDeadline, "d MMM 'à' HH'h'mm", { locale: fr })}
              </span>
            )}
          </Row>
        )}
        {request.assignedAgencyId && (
          <Row icon={<Building2 className="w-4 h-4" />} label="Loueur assigné">
            <span className="font-mono text-xs text-slate-500">{request.assignedAgencyId}</span>
          </Row>
        )}
        {request.targetPricePerDay && (
          <Row icon={<Euro className="w-4 h-4" />} label="Tarif journalier cible">
            <span className="font-semibold text-brand-700">{request.targetPricePerDay} €/j</span>
          </Row>
        )}
        {request.notes && (
          <Row icon={<FileText className="w-4 h-4" />} label="Notes">
            {request.notes}
          </Row>
        )}
      </Card>

      {/* ── Historique des transferts ── */}
      {request.transfers.length > 0 && (
        <Card title="Historique des transferts" icon={<ArrowRightLeft className="w-4 h-4 text-brand-500" />}>
          <div className="px-5 py-4 flex flex-col gap-3">
            {request.transfers.map(t => (
              <div key={t.id} className="text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    t.status === 'valide'  ? 'bg-green-100 text-green-700'
                    : t.status === 'refuse' ? 'bg-red-100 text-red-700'
                    :                        'bg-orange-100 text-orange-700'
                  }`}>
                    {t.status === 'valide' ? 'Validé' : t.status === 'refuse' ? 'Refusé' : 'En attente'}
                  </span>
                  <span className="text-slate-600">{t.fromAgencyName} → {t.toAgencyName}</span>
                </div>
                {t.reason && <p className="text-slate-500 text-xs italic pl-2">"{t.reason}"</p>}
                <p className="text-xs text-slate-400 pl-2">
                  Proposé le {format(t.proposedAt, "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Documents partagés ── */}
      <Card title="Documents du dossier" icon={<FileText className="w-4 h-4 text-brand-500" />}>
        <div className="px-5 py-4">
          <SharedRequestDocuments
            requestId={request.id}
            viewerRole="assisteur"
            status={request.status}
          />
        </div>
      </Card>

      {/* ── Timeline ── */}
      {request.timeline.length > 0 && (
        <Card title="Historique" icon={<History className="w-4 h-4 text-brand-500" />}>
          <div className="px-5 py-4">
            <RequestTimeline events={request.timeline} />
          </div>
        </Card>
      )}

      {/* ── Actions ── */}
      {(canClose || request.status === 'refusee') && (
        <div className="flex gap-3">
          {request.status === 'refusee' && (
            <Link
              href="/assisteur/nouvelle-demande"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Relancer avec un autre loueur
            </Link>
          )}
          {canClose && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {closing ? 'Clôture…' : 'Clôturer le dossier'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Bloc action rapide ────────────────────────────────────────────────────────

function ActionBanner({
  status, agencyCount, resp, agency, durationDays, offerAction, onValidate, onRefuse,
}: {
  status:       string
  agencyCount:  number
  resp:         NonNullable<AssistanceRequest['loueurResponse']> | null
  agency:       RentalAgency | null
  durationDays: number
  offerAction?: 'validating' | 'refusing' | null
  onValidate?:  () => void
  onRefuse?:    () => void
}) {
  if (status === 'envoyee') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 space-y-1.5">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <p className="text-sm font-bold text-amber-800">En attente de réponse</p>
        </div>
        <p className="text-xs text-amber-700 pl-5">
          Demande envoyée à <strong>{agencyCount} loueur{agencyCount > 1 ? 's' : ''}</strong>.
          Vous serez notifié dès qu'un loueur répond.
        </p>
      </div>
    )
  }

  if (status === 'acceptee' && resp) {
    const total = resp.pricePerDay != null ? resp.pricePerDay * durationDays : null
    return (
      <div className="rounded-2xl border-2 border-teal-300 overflow-hidden">
        <div className="h-1 w-full bg-teal-500" />
        <div className="bg-teal-50 px-5 py-4 space-y-4">
          <div className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-teal-600 shrink-0" />
            <p className="text-sm font-black text-teal-800 uppercase tracking-wide">Action requise — valider ou refuser</p>
          </div>

          <div className="flex items-baseline gap-3">
            {resp.pricePerDay != null ? (
              <>
                <span className="text-3xl font-black text-teal-700 tabular-nums">{resp.pricePerDay} €/j</span>
                {total != null && (
                  <span className="text-sm text-slate-500">
                    = <strong className="text-slate-700">{total} €</strong> pour {durationDays}j
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-slate-500 italic">Tarif non précisé</span>
            )}
          </div>

          <p className="text-sm font-semibold text-teal-900">{resp.agencyName}</p>

          {(resp.vehicleModel || resp.message) && (
            <div className="space-y-0.5">
              {resp.vehicleModel && (
                <p className="text-sm text-slate-700 flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-400" />
                  {resp.vehicleModel}
                </p>
              )}
              {resp.message && (
                <p className="text-sm text-slate-600 italic">"{resp.message}"</p>
              )}
            </div>
          )}

          {onValidate && onRefuse && (
            <div className="flex gap-3 pt-1">
              <button
                onClick={onValidate}
                disabled={offerAction !== null}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
              >
                {offerAction === 'validating'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-5 h-5" />
                }
                {offerAction === 'validating' ? 'Validation…' : 'Valider ce tarif'}
              </button>
              <button
                onClick={onRefuse}
                disabled={offerAction !== null}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-300 text-red-600 bg-white hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {offerAction === 'refusing'
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <XCircle className="w-4 h-4" />
                }
                {offerAction === 'refusing' ? 'Refus…' : 'Refuser'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  if ((status === 'confirmee' || status === 'honoree') && resp) {
    const addressFull = agency
      ? [agency.address, agency.postalCode, agency.city].filter(Boolean).join(', ')
      : resp.agencyName
    const mapsUrl = agency
      ? `https://maps.google.com/?q=${encodeURIComponent(addressFull)}`
      : null

    return (
      <div className="rounded-2xl border-2 border-green-400 overflow-hidden">
        <div className="h-1.5 w-full bg-green-500" />
        <div className="bg-green-50 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <SendHorizonal className="w-5 h-5 text-green-700 shrink-0" />
            <p className="text-sm font-black text-green-800 uppercase tracking-wide">
              Envoyer l'assuré chez
            </p>
          </div>
          <p className="text-xl font-black text-green-900 mb-1">{resp.agencyName}</p>
          {addressFull && (
            <div className="flex items-start gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-sm text-green-800 font-medium">{addressFull}</span>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1 ml-2 text-xs text-green-700 underline underline-offset-2 hover:text-green-900"
                  >
                    <Navigation className="w-3 h-3" /> Maps
                  </a>
                )}
              </div>
            </div>
          )}
          {agency?.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <a
                href={`tel:${agency.phone}`}
                onClick={e => e.stopPropagation()}
                className="text-sm font-semibold text-green-800 hover:text-green-900"
              >
                {agency.phone}
              </a>
            </div>
          )}
          {resp.pricePerDay != null && (
            <p className="mt-2 text-xs text-green-700 font-medium">
              Tarif confirmé : {resp.pricePerDay} €/j · {resp.pricePerDay * durationDays} € HT pour {durationDays}j
            </p>
          )}
        </div>
      </div>
    )
  }

  return null
}

// ── Loueurs contactés ─────────────────────────────────────────────────────────

function ContactedAgenciesSection({
  agencyCount, loueurResponse, status,
}: {
  agencyCount:    number
  loueurResponse: AssistanceRequest['loueurResponse'] | undefined | null
  status:         string
}) {
  if (agencyCount === 0) return null

  const hasResponse  = !!loueurResponse
  const othersCount  = agencyCount - (hasResponse ? 1 : 0)
  const isConfirmed  = status === 'confirmee' || status === 'honoree' || status === 'cloturee'

  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Loueurs contactés</p>
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Total sollicités</span>
          <span className="text-sm font-bold text-slate-900">{agencyCount} loueur{agencyCount > 1 ? 's' : ''}</span>
        </div>
        {hasResponse && loueurResponse && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-800 truncate">{loueurResponse.agencyName}</span>
            <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isConfirmed
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-teal-50 text-teal-700 border border-teal-200'
            }`}>
              {isConfirmed ? 'Confirmé' : 'A répondu'}
            </span>
          </div>
        )}
        {othersCount > 0 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-slate-400 italic">{othersCount} autre{othersCount > 1 ? 's' : ''}</span>
            <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              Sans réponse ou fermé{othersCount > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Validation contre-proposition ────────────────────────────────────────────

function CounterOfferValidationCard({
  response, durationDays, offerAction, onValidate, onRefuse,
}: {
  response:    NonNullable<AssistanceRequest['loueurResponse']>
  durationDays: number
  offerAction: 'validating' | 'refusing' | null
  onValidate:  () => void
  onRefuse:    () => void
}) {
  const total = response.pricePerDay !== undefined
    ? response.pricePerDay * durationDays
    : null

  return (
    <div className="rounded-2xl border-2 border-teal-300 overflow-hidden">
      <div className="h-1 w-full bg-teal-500" />
      <div className="bg-teal-50 p-5 space-y-4">
        <div className="flex items-center gap-2 text-teal-700 font-semibold">
          <Euro className="w-5 h-5 shrink-0" />
          Contre-proposition du loueur — validation requise
        </div>

        <div className="flex items-baseline gap-3">
          {response.pricePerDay !== undefined ? (
            <>
              <span className="text-3xl font-black text-teal-700 tabular-nums">
                {response.pricePerDay} €/j
              </span>
              {total !== null && (
                <span className="text-sm text-slate-500">
                  = <strong className="text-slate-700">{total} €</strong> pour {durationDays} jour{durationDays > 1 ? 's' : ''}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-500 italic">Tarif non précisé</span>
          )}
        </div>

        {(response.vehicleModel || response.message) && (
          <div className="space-y-0.5">
            {response.vehicleModel && (
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-400" />
                {response.vehicleModel}
              </p>
            )}
            {response.message && (
              <p className="text-sm text-slate-600 italic">"{response.message}"</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onValidate}
            disabled={offerAction !== null}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold transition-colors disabled:opacity-60"
          >
            {offerAction === 'validating'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCircle2 className="w-5 h-5" />
            }
            {offerAction === 'validating' ? 'Validation…' : 'Valider ce tarif'}
          </button>
          <button
            onClick={onRefuse}
            disabled={offerAction !== null}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-300 text-red-600 bg-white hover:bg-red-50 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {offerAction === 'refusing'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <XCircle className="w-4 h-4" />
            }
            {offerAction === 'refusing' ? 'Refus…' : 'Refuser la contre-proposition'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Prise en charge ──────────────────────────────────────────────────────────

function CoverageBlock({ coverage }: { coverage: AssistanceRequest['coverage'] }) {
  const isFull = coverage.creditType === 'full'
  return (
    <div className={`rounded-2xl border-2 p-4 flex items-start gap-3 ${isFull ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
      {isFull
        ? <ShieldCheck className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        : <ShieldAlert  className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      }
      <div className="space-y-0.5">
        <p className={`font-semibold text-sm ${isFull ? 'text-green-800' : 'text-amber-800'}`}>
          {isFull ? 'Prise en charge totale' : 'Prise en charge partielle'}
        </p>
        {isFull
          ? <p className="text-xs text-green-700">Location, franchise dégâts et carburant pris en charge.</p>
          : <p className="text-xs text-amber-700">Location du véhicule uniquement — franchise et carburant à la charge du sinistré.</p>
        }
      </div>
    </div>
  )
}

// ── Réponse loueur ────────────────────────────────────────────────────────────

function LoueurResponseCard({
  response, status, durationDays, agency, returnedAt,
}: {
  response:     NonNullable<AssistanceRequest['loueurResponse']>
  status:       string
  durationDays: number
  agency:       RentalAgency | null
  returnedAt?:  Date
}) {
  const isPending   = status === 'acceptee'
  const isHonored   = status === 'honoree' || status === 'cloturee'
  const accentColor = isPending ? 'bg-teal-500'  : isHonored ? 'bg-blue-500' : 'bg-green-500'
  const textColor   = isPending ? 'text-teal-700' : isHonored ? 'text-blue-700' : 'text-green-700'
  const bgColor     = isPending ? 'bg-teal-50'    : isHonored ? 'bg-blue-50'   : 'bg-green-50'
  const borderColor = isPending ? 'border-teal-200' : isHonored ? 'border-blue-200' : 'border-green-200'

  const mapsUrl = agency
    ? `https://maps.google.com/?q=${encodeURIComponent(`${agency.address}, ${agency.postalCode} ${agency.city}`)}`
    : null

  const hours = agency?.openingHours
  const hoursRows = hours ? [
    { day: 'Lun–Ven', val: hours.weekdays },
    { day: 'Samedi',  val: hours.saturday ?? 'Fermé' },
    { day: 'Dimanche',val: hours.sunday   ?? 'Fermé' },
  ] : []

  return (
    <div className={`rounded-2xl border overflow-hidden ${borderColor}`}>
      {/* Accent top */}
      <div className={`h-1 w-full ${accentColor}`} />

      <div className={`${bgColor} p-5 space-y-4`}>
        {/* Header : statut + agence */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`w-5 h-5 ${textColor} shrink-0`} />
            <div>
              <p className={`font-bold text-sm ${textColor}`}>
                {isPending ? 'Prix proposé — en attente de validation' : isHonored ? 'Véhicule rendu — en attente de paiement' : 'Réservation confirmée'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPending ? 'Reçu' : isHonored ? 'Retour confirmé' : 'Confirmé'} le {format(response.respondedAt, "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
              </p>
              {returnedAt && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Retour effectif : <strong>{format(returnedAt, "d MMM yyyy 'à' HH'h'mm", { locale: fr })}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Prix */}
        {response.pricePerDay !== undefined && (
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-black ${textColor} tabular-nums`}>{response.pricePerDay} €/j</span>
            <span className="text-sm text-slate-500">
              = <strong className="text-slate-700">{response.pricePerDay * durationDays} €</strong> pour {durationDays} jour{durationDays > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Véhicule + message */}
        {(response.vehicleModel || response.message) && (
          <div className="space-y-1">
            {response.vehicleModel && (
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-400" aria-hidden="true" />
                {response.vehicleModel}
              </p>
            )}
            {response.message && (
              <p className="text-sm text-slate-600 italic">"{response.message}"</p>
            )}
          </div>
        )}
      </div>

      {/* Fiche agence */}
      <div className="bg-white divide-y divide-slate-100">

        {/* En-tête agence */}
        <div className="px-5 py-3.5 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-700">{response.agencyName}</span>
        </div>

        {agency ? (
          <>
            {/* Adresse */}
            <div className="flex items-start gap-3 px-5 py-3">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Adresse</p>
                <p className="text-sm text-slate-800">
                  {agency.address}, {agency.postalCode} {agency.city}
                </p>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-0.5 font-medium"
                  >
                    Voir sur Maps <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="flex items-start gap-3 px-5 py-3">
                <Phone className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Téléphone</p>
                  <a href={`tel:${agency.phone}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                    {agency.phone}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3 px-5 py-3">
                <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Email</p>
                  <a href={`mailto:${agency.email}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium truncate block">
                    {agency.email}
                  </a>
                </div>
              </div>
            </div>

            {/* Contact + Horaires */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="flex items-start gap-3 px-5 py-3">
                <UserCircle className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Contact</p>
                  <p className="text-sm text-slate-800 font-medium">{agency.contactName}</p>
                </div>
              </div>
              {hoursRows.length > 0 && (
                <div className="flex items-start gap-3 px-5 py-3">
                  <Clock3 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Horaires</p>
                    <div className="space-y-0.5">
                      {hoursRows.map(row => (
                        <div key={row.day} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500 w-20 shrink-0">{row.day}</span>
                          <span className={`font-mono font-semibold ${row.val === 'Fermé' ? 'text-slate-400' : 'text-slate-800'}`}>
                            {row.val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="px-5 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-200 animate-pulse shrink-0" />
            <span className="text-sm text-slate-400">Chargement des informations agence…</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm font-semibold text-slate-700">{title}</span>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className="text-slate-400 mt-0.5 flex-shrink-0 w-4 h-4">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
        <div className="text-sm text-slate-800 font-medium">{children}</div>
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-xl" />
      <div className="h-28 bg-slate-200 rounded-2xl" />
      <div className="h-40 bg-slate-200 rounded-2xl" />
      <div className="h-40 bg-slate-200 rounded-2xl" />
    </div>
  )
}

// ── Conditions de clôture ─────────────────────────────────────────────────────

function ClosureReadinessCard({
  missingDocs,
  paymentStatus,
  hasDamageClaim,
}: {
  missingDocs:    string[]
  paymentStatus:  string | undefined
  hasDamageClaim: boolean
}) {
  const docsOk    = missingDocs.length === 0
  const paymentOk = paymentStatus === 'paye' || paymentStatus === 'non_applicable'
  const allReady  = docsOk && paymentOk

  const requiredDocTypes = hasDamageClaim
    ? (['contrat', 'facture', 'etat_depart', 'etat_retour'] as const)
    : (['contrat', 'facture'] as const)

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${allReady ? 'border-green-300' : 'border-blue-300'}`}>
      <div className={`h-1 w-full ${allReady ? 'bg-green-500' : 'bg-blue-500'}`} />
      <div className={`p-5 space-y-4 ${allReady ? 'bg-green-50' : 'bg-blue-50'}`}>
        <div className={`flex items-center gap-2 font-semibold ${allReady ? 'text-green-700' : 'text-blue-700'}`}>
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Conditions de clôture
          {hasDamageClaim && (
            <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200">
              Sinistre déclaré
            </span>
          )}
        </div>

        {/* Checklist documents loueur */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Documents requis du loueur</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {requiredDocTypes.map(type => {
              const present = !missingDocs.includes(type)
              return (
                <div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium ${
                  present
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  {present
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />
                  }
                  {REQUEST_DOCUMENT_TYPE_LABELS[type]}
                </div>
              )
            })}
          </div>
        </div>

        {/* Validation paiement admin */}
        <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium ${
          paymentOk
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-white border-slate-200 text-slate-400'
        }`}>
          {paymentOk
            ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />
          }
          {paymentOk
            ? (paymentStatus === 'non_applicable' ? 'Aucun paiement requis' : 'Paiement validé par Drives On')
            : 'En attente de validation par Drives On'
          }
        </div>

        {!allReady && (
          <p className="text-sm text-blue-600">
            Le dossier pourra être clôturé une fois tous les documents déposés et le paiement validé par Drives On.
          </p>
        )}
      </div>
    </div>
  )
}
