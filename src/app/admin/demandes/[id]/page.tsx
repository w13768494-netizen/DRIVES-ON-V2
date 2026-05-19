'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, User, Phone, Mail, MapPin, Car,
  Calendar, Clock, FileText, CheckCircle2, XCircle, Eye, EyeOff,
  Shield, Wrench, AlertTriangle, Zap, Save, Loader2, Tag,
  Package, Flag, Activity, TrendingUp, AlertOctagon, Link as LinkIcon,
  ChevronRight, Check,
} from 'lucide-react'
import { getAdminDossier, saveAdminNote, saveAdminFlags } from '@/services/adminDossierService'
import { getDocumentsByRequest }                          from '@/services/documentService'
import { computeAlerts }                                  from '@/services/adminAlertService'
import type { AdminDossierData }                          from '@/services/adminDossierService'
import type { RequestDocument, RequestDocumentType }      from '@/types/requestDocument'
import type { AlertSeverity }                             from '@/types/adminAlert'
import {
  REQUEST_DOCUMENT_TYPE_LABELS,
  REQUEST_DOCUMENT_TYPE_COLORS,
} from '@/types/requestDocument'
import {
  REQUIRED_DOCS_BY_STATUS,
  ADMIN_UX_STATUS_LABELS, ADMIN_UX_STATUS_COLORS,
  ADMIN_PAYMENT_LABELS,   ADMIN_PAYMENT_COLORS,
} from '@/types/adminReservation'
import {
  REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS,
  CREDIT_TYPE_LABELS, getEffectiveDuration,
} from '@/types/request'
import { VEHICLE_CATEGORY_LABELS, VEHICLE_GROUP_LABELS } from '@/types/vehicleCategory'
import { AGENCY_SERVICE_LABELS }                          from '@/types/agencyService'
import { TIMELINE_EVENT_LABELS, TIMELINE_EVENT_COLORS }  from '@/types/requestTimeline'

// ── Constantes ────────────────────────────────────────────────────────────────

const ACCOUNT_TYPE_CONFIG: Record<string, {
  label: string
  icon:  React.ComponentType<{ className?: string }>
  bg:    string
  text:  string
}> = {
  assistance:      { label: 'Assistance routière', icon: Car,    bg: 'bg-blue-50',   text: 'text-blue-700'   },
  insurance_agent: { label: 'Agent d\'assurance',  icon: Shield, bg: 'bg-purple-50', text: 'text-purple-700' },
  garage:          { label: 'Garage',              icon: Wrench, bg: 'bg-amber-50',  text: 'text-amber-700'  },
}

const FLAG_CONFIG = {
  litigieux:   { label: 'Litigieux',   idle: 'border-red-200    text-red-500',    active: 'bg-red-600    text-white border-red-600'    },
  anomalie:    { label: 'Anomalie',    idle: 'border-orange-200 text-orange-500', active: 'bg-orange-500 text-white border-orange-500' },
  prioritaire: { label: 'Prioritaire', idle: 'border-amber-200  text-amber-600',  active: 'bg-amber-500  text-white border-amber-500'  },
} as const

const URGENCY_CONFIG = {
  critique:  { label: 'Critique',  dot: 'bg-red-500 animate-pulse', text: 'text-red-600'    },
  urgent:    { label: 'Urgent',    dot: 'bg-orange-400',            text: 'text-orange-600' },
  attention: { label: 'Attention', dot: 'bg-amber-300',             text: 'text-amber-600'  },
  normal:    { label: 'Normal',    dot: 'bg-green-400',             text: 'text-green-600'  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatDateTime(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function formatTimeAgo(minutes: number): string {
  if (minutes < 60)   return `${minutes} min`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1440)}j`
}

// ── Briques UI ────────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children, className = '' }: {
  title:     string
  icon?:     React.ComponentType<{ className?: string }>
  children:  React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <dt className="text-xs text-slate-400 w-36 shrink-0 pt-0.5 leading-tight">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium flex-1 min-w-0">{children}</dd>
    </div>
  )
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${className}`}>
      {children}
    </span>
  )
}

// ── Bloc A — Demandeur ────────────────────────────────────────────────────────

function DemandeurCard({ dossier }: { dossier: AdminDossierData }) {
  const { request, requesterProfile } = dossier
  const accountCfg = request.requesterAccountType
    ? ACCOUNT_TYPE_CONFIG[request.requesterAccountType]
    : null

  return (
    <SectionCard title="Demandeur" icon={Building2}>
      <dl className="space-y-0">
        {accountCfg && (
          <InfoRow label="Type de compte">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${accountCfg.bg} ${accountCfg.text}`}>
              <accountCfg.icon className="w-3.5 h-3.5" />
              {accountCfg.label}
            </span>
          </InfoRow>
        )}
        <InfoRow label="Contact">
          {requesterProfile?.fullName ?? request.createdByName}
        </InfoRow>
        {requesterProfile?.companyName && (
          <InfoRow label="Société">
            {requesterProfile.companyName}
          </InfoRow>
        )}
        {requesterProfile?.phone && (
          <InfoRow label="Téléphone">
            <a href={`tel:${requesterProfile.phone}`} className="flex items-center gap-1.5 text-brand-600 hover:underline">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              {requesterProfile.phone}
            </a>
          </InfoRow>
        )}
        <InfoRow label="N° dossier">
          <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg">{request.dossierNumber}</span>
        </InfoRow>
        {request.referenceNumber && (
          <InfoRow label="Référence">
            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg">{request.referenceNumber}</span>
          </InfoRow>
        )}
        <InfoRow label="Créé le">
          {formatDateTime(request.createdAt)}
        </InfoRow>
      </dl>
    </SectionCard>
  )
}

// ── Bloc B — Sinistré ─────────────────────────────────────────────────────────

function SinistreCard({ dossier }: { dossier: AdminDossierData }) {
  const { sinistre, location } = dossier.request
  return (
    <SectionCard title="Sinistré / Bénéficiaire" icon={User}>
      <dl className="space-y-0">
        <InfoRow label="Nom complet">
          {sinistre.firstName} {sinistre.lastName}
        </InfoRow>
        <InfoRow label="Téléphone">
          <a href={`tel:${sinistre.phone}`} className="flex items-center gap-1.5 text-brand-600 hover:underline">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            {sinistre.phone}
          </a>
        </InfoRow>
        {sinistre.email && (
          <InfoRow label="Email">
            <a href={`mailto:${sinistre.email}`} className="flex items-center gap-1.5 text-brand-600 hover:underline truncate">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{sinistre.email}</span>
            </a>
          </InfoRow>
        )}
        {sinistre.licenseNumber && (
          <InfoRow label="N° permis">
            <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded-lg">{sinistre.licenseNumber}</span>
          </InfoRow>
        )}
        <InfoRow label="Lieu sinistre">
          <span className="flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
            <span>{location.address}</span>
          </span>
        </InfoRow>
      </dl>
    </SectionCard>
  )
}

// ── Bloc C — Mission ──────────────────────────────────────────────────────────

function MissionCard({ dossier }: { dossier: AdminDossierData }) {
  const { request } = dossier
  const effectiveDuration = getEffectiveDuration(request)

  return (
    <SectionCard title="Véhicule & Mission" icon={Car}>
      <dl className="space-y-0">
        <InfoRow label="Type demande">
          <span className={`flex items-center gap-1.5 ${request.requestType === 'immediate' ? 'text-orange-600' : 'text-slate-700'}`}>
            {request.requestType === 'immediate' && <Zap className="w-3.5 h-3.5 shrink-0" />}
            {request.requestType === 'immediate' ? 'Immédiate' : 'Planifiée'}
          </span>
        </InfoRow>
        <InfoRow label="Catégorie">
          {VEHICLE_CATEGORY_LABELS[request.vehicleCategory]}
          {' '}
          <span className="text-slate-400 text-xs">({VEHICLE_GROUP_LABELS[request.vehicleGroup]})</span>
        </InfoRow>
        <InfoRow label="Date souhaitée">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            {formatDate(request.dateNeeded)}
          </span>
        </InfoRow>
        <InfoRow label="Durée">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            {effectiveDuration} jour{effectiveDuration > 1 ? 's' : ''}
            {effectiveDuration !== request.durationDays && (
              <span className="text-xs text-slate-400">(base {request.durationDays}j + prolongation)</span>
            )}
          </span>
        </InfoRow>
        {request.maxExtensionDays && (
          <InfoRow label="Extension max">
            {request.maxExtensionDays}j autorisés
          </InfoRow>
        )}
        <InfoRow label="Prise en charge">
          <span className={`flex items-center gap-1.5 ${
            request.coverage.creditType === 'client' ? 'text-slate-600' :
            request.coverage.creditType === 'full'   ? 'text-green-700'  : 'text-amber-700'
          }`}>
            {CREDIT_TYPE_LABELS[request.coverage.creditType]}
          </span>
        </InfoRow>
        {request.requestedServices && request.requestedServices.length > 0 && (
          <InfoRow label="Services">
            <div className="flex flex-wrap gap-1">
              {request.requestedServices.map(s => (
                <Pill key={s} className="bg-slate-100 text-slate-600">
                  {AGENCY_SERVICE_LABELS[s]}
                </Pill>
              ))}
            </div>
          </InfoRow>
        )}
        {request.notes && (
          <InfoRow label="Notes">
            <span className="italic text-slate-600">{request.notes}</span>
          </InfoRow>
        )}
      </dl>
    </SectionCard>
  )
}

// ── Bloc D — Loueurs ──────────────────────────────────────────────────────────

function LoueurCard({ dossier }: { dossier: AdminDossierData }) {
  const { request, agencyNames } = dossier
  const assignedIds = request.assignedAgencyIds ?? (request.assignedAgencyId ? [request.assignedAgencyId] : [])
  const effectiveDuration = getEffectiveDuration(request)

  const confirmedPpd  = request.loueurResponse?.pricePerDay ?? request.counterOfferPrice
  const totalHT       = confirmedPpd != null ? Math.round(confirmedPpd * effectiveDuration * 100) / 100 : undefined
  const commission    = totalHT     != null ? Math.round(totalHT * 0.15 * 100) / 100 : undefined
  const amountDue     = totalHT     != null && commission != null
    ? Math.round((totalHT - commission) * 100) / 100
    : undefined

  return (
    <SectionCard title="Loueurs" icon={Building2}>
      <dl className="space-y-0">
        <InfoRow label="Sollicités">
          {assignedIds.length === 0 ? (
            <span className="text-slate-400 italic">Aucun</span>
          ) : (
            <div className="flex flex-col gap-1">
              {assignedIds.map(id => (
                <span key={id} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                  <span className={request.confirmedAgencyId === id ? 'font-semibold text-green-700' : ''}>
                    {agencyNames.get(id) ?? id}
                  </span>
                  {request.confirmedAgencyId === id && (
                    <Pill className="bg-green-100 text-green-700">Confirmé</Pill>
                  )}
                </span>
              ))}
            </div>
          )}
        </InfoRow>

        {request.confirmedAgencyName && (
          <InfoRow label="Confirmé">
            <span className="text-green-700 font-semibold">{request.confirmedAgencyName}</span>
            {request.confirmedAt && (
              <span className="text-xs text-slate-400 ml-2">le {formatDateTime(request.confirmedAt)}</span>
            )}
          </InfoRow>
        )}

        {request.targetPricePerDay && (
          <InfoRow label="Tarif cible">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              {request.targetPricePerDay} €/j
            </span>
          </InfoRow>
        )}

        {confirmedPpd != null && (
          <InfoRow label="Tarif confirmé">
            <span className="flex items-center gap-1.5 text-green-700 font-semibold">
              <Check className="w-3.5 h-3.5" />
              {confirmedPpd} €/j
            </span>
          </InfoRow>
        )}

        {request.loueurResponse?.vehicleModel && (
          <InfoRow label="Modèle proposé">
            <span className="italic">{request.loueurResponse.vehicleModel}</span>
          </InfoRow>
        )}

        {totalHT != null && (
          <InfoRow label="Total HT estimé">
            <span className="font-semibold">{totalHT} €</span>
            <span className="text-xs text-slate-400 ml-1">({effectiveDuration}j × {confirmedPpd} €)</span>
          </InfoRow>
        )}

        {commission != null && (
          <InfoRow label="Commission 15%">
            <span className="flex items-center gap-1.5 text-brand-600">
              <TrendingUp className="w-3.5 h-3.5" />
              {commission} €
            </span>
          </InfoRow>
        )}

        {amountDue != null && (
          <InfoRow label="Dû au loueur">
            <span className="font-bold text-slate-900">{amountDue} € HT</span>
          </InfoRow>
        )}

        {request.returnedAt && (
          <InfoRow label="Retour véhicule">
            <span className="flex items-center gap-1.5 text-blue-600">
              <Check className="w-3.5 h-3.5" />
              {formatDateTime(request.returnedAt)}
            </span>
          </InfoRow>
        )}
      </dl>
    </SectionCard>
  )
}

// ── Bloc E — Documents ────────────────────────────────────────────────────────

function DocumentsCard({
  request, documents,
}: {
  request:   AdminDossierData['request']
  documents: RequestDocument[]
}) {
  const required    = REQUIRED_DOCS_BY_STATUS[request.status] ?? []
  const presentSet  = new Set(documents.map(d => d.type))
  const missingDocs = required.filter(t => !presentSet.has(t))

  return (
    <SectionCard title="Documents" icon={FileText}>
      {/* Checklist requis */}
      {required.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Requis pour ce statut</p>
          <div className="flex flex-col gap-1">
            {required.map(type => {
              const present = presentSet.has(type)
              return (
                <div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                  present ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {present
                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    : <XCircle      className="w-3.5 h-3.5 shrink-0" />}
                  {REQUEST_DOCUMENT_TYPE_LABELS[type]}
                  {!present && <span className="ml-auto font-semibold text-[10px] uppercase tracking-wide">Manquant</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Liste documents */}
      {documents.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Aucun document déposé.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {documents.map(doc => {
            const colorCls = REQUEST_DOCUMENT_TYPE_COLORS[doc.type]
            const href     = doc.viewUrl ?? doc.url ?? null
            return (
              <div key={doc.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${colorCls}`}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{REQUEST_DOCUMENT_TYPE_LABELS[doc.type]}</p>
                  <p className="opacity-60 truncate mt-0.5">
                    {doc.url ? doc.url.slice(0, 50) + '…' : doc.fileName}
                  </p>
                  <p className="opacity-40 mt-0.5">
                    {doc.owner === 'assisteur' ? 'Assisteur' : 'Loueur'}
                    {' · '}
                    {formatDateTime(doc.addedAt)}
                  </p>
                </div>
                {href ? (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                     className="p-1.5 rounded-lg hover:bg-black/10 transition-colors shrink-0">
                    {doc.url ? <LinkIcon className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </a>
                ) : (
                  <span className="p-1.5 opacity-30"><EyeOff className="w-3.5 h-3.5" /></span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {missingDocs.length > 0 && (
        <p className="mt-3 text-xs text-red-500 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {missingDocs.length} document{missingDocs.length > 1 ? 's' : ''} manquant{missingDocs.length > 1 ? 's' : ''}
        </p>
      )}
    </SectionCard>
  )
}

// ── Bloc F — Timeline ─────────────────────────────────────────────────────────

function TimelineCard({ dossier }: { dossier: AdminDossierData }) {
  const { timeline } = dossier.request
  const sorted = [...timeline].reverse()

  const roleColor = (role: string) =>
    role === 'assisteur' ? 'text-brand-600 bg-brand-50' :
    role === 'loueur'    ? 'text-green-700 bg-green-50' :
    'text-slate-500 bg-slate-100'

  return (
    <SectionCard title="Timeline" icon={Activity}>
      {sorted.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Aucun événement enregistré.</p>
      ) : (
        <div className="flex flex-col gap-0">
          {sorted.map((evt, i) => (
            <div key={evt.id} className="flex gap-3 relative">
              {/* Ligne verticale */}
              {i < sorted.length - 1 && (
                <div className="absolute left-[18px] top-7 bottom-0 w-px bg-slate-100" />
              )}
              {/* Dot */}
              <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-[10px] font-bold z-10 ${
                TIMELINE_EVENT_COLORS[evt.type]
              }`}>
                {evt.byRole === 'assisteur' ? 'A' : evt.byRole === 'loueur' ? 'L' : 'S'}
              </div>
              {/* Content */}
              <div className="flex-1 pb-3 pt-1">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {TIMELINE_EVENT_LABELS[evt.type]}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-slate-400">{formatDateTime(new Date(evt.at))}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${roleColor(evt.byRole)}`}>
                    {evt.byRole === 'assisteur' ? 'Assisteur' : evt.byRole === 'loueur' ? 'Loueur' : 'Système'}
                  </span>
                </div>
                {evt.message && (
                  <p className="text-xs text-slate-500 italic mt-1">"{evt.message}"</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ── Bloc G — État opérationnel ────────────────────────────────────────────────

const ALERT_STYLES: Record<AlertSeverity, string> = {
  rouge:  'bg-red-50 border-red-200 text-red-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  jaune:  'bg-amber-50 border-amber-200 text-amber-700',
}

function OperationalStatusCard({
  dossier, documents,
}: {
  dossier:   AdminDossierData
  documents: RequestDocument[]
}) {
  const { request, uxStatus, urgencyLevel, paymentStatus, minutesSinceLastActivity, lastActivityAt } = dossier
  const presentTypes     = documents.map(d => d.type)
  const missingDocuments = dossier.missingDocTypes(presentTypes)
  const urgencyCfg       = URGENCY_CONFIG[urgencyLevel]

  const alerts = computeAlerts({
    status:                   request.status,
    requestType:              request.requestType,
    coverage:                 request.coverage,
    adminFlags:               request.adminFlags,
    assignedAgencyId:         request.assignedAgencyId,
    assignedAgencyIds:        request.assignedAgencyIds,
    confirmedAgencyId:        request.confirmedAgencyId,
    loueurResponse:           request.loueurResponse,
    returnedAt:               request.returnedAt,
    missingDocuments,
    uxStatus,
    minutesSinceLastActivity,
  })

  const rougeCount = alerts.filter(a => a.severity === 'rouge').length

  return (
    <SectionCard title="État opérationnel" icon={Activity}>
      <div className="flex flex-col gap-3">
        {/* Statut métier */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Statut</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${REQUEST_STATUS_COLORS[request.status]}`}>
              {REQUEST_STATUS_LABELS[request.status]}
            </span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ADMIN_UX_STATUS_COLORS[uxStatus]}`}>
              {ADMIN_UX_STATUS_LABELS[uxStatus]}
            </span>
          </div>
        </div>

        {/* Urgence */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Urgence</p>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyCfg.dot}`} />
            <span className={`text-sm font-semibold ${urgencyCfg.text}`}>{urgencyCfg.label}</span>
          </div>
        </div>

        {/* Paiement */}
        {paymentStatus !== 'non_applicable' && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Paiement</p>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ADMIN_PAYMENT_COLORS[paymentStatus]}`}>
              {ADMIN_PAYMENT_LABELS[paymentStatus]}
            </span>
          </div>
        )}

        {/* Dernière activité */}
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dernière activité</p>
          <p className="text-xs text-slate-600">
            {formatDateTime(lastActivityAt)}
            <span className="text-slate-400 ml-1">({formatTimeAgo(minutesSinceLastActivity)})</span>
          </p>
        </div>

        {/* Alertes actives */}
        {alerts.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              Alertes
              {rougeCount > 0 && (
                <span className="text-red-500 normal-case font-semibold">
                  · {rougeCount} critique{rougeCount > 1 ? 's' : ''}
                </span>
              )}
            </p>
            <div className="flex flex-col gap-1.5">
              {alerts.map(al => (
                <div key={al.code} className={`flex items-start gap-2 px-3 py-2 rounded-xl border text-xs ${ALERT_STYLES[al.severity]}`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
                  <div>
                    <p className="font-semibold leading-tight">{al.label}</p>
                    {al.detail && <p className="opacity-60 mt-0.5">{al.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {alerts.length === 0 && (
          <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            Aucune alerte active
          </p>
        )}
      </div>
    </SectionCard>
  )
}

// ── Bloc H — Notes internes ───────────────────────────────────────────────────

function AdminNotesCard({
  requestId, initialNote, adminUpdatedAt, adminUpdatedByName,
}: {
  requestId:          string
  initialNote:        string | null | undefined
  adminUpdatedAt:     Date | undefined
  adminUpdatedByName: string | null
}) {
  const [note,   setNote]   = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    const ok = await saveAdminNote(requestId, note)
    setSaving(false)
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
  }, [requestId, note])

  return (
    <SectionCard title="Note interne" icon={FileText}>
      <textarea
        value={note}
        onChange={e => { setNote(e.target.value); setSaved(false) }}
        rows={5}
        placeholder="Note interne visible uniquement par l'équipe DRIVES ON…"
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 resize-none transition-all"
      />
      <div className="flex items-center justify-between mt-2.5">
        <div>
          {adminUpdatedAt && (
            <p className="text-[11px] text-slate-400">
              Modifiée {formatDateTime(adminUpdatedAt)}
              {adminUpdatedByName && ` · ${adminUpdatedByName}`}
            </p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
        >
          {saving
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : saved
              ? <Check className="w-3.5 h-3.5" />
              : <Save  className="w-3.5 h-3.5" />}
          {saved ? 'Enregistrée' : 'Enregistrer'}
        </button>
      </div>
    </SectionCard>
  )
}

// ── Bloc I — Flags ────────────────────────────────────────────────────────────

function AdminFlagsCard({
  requestId, initialFlags,
}: {
  requestId:    string
  initialFlags: string[] | undefined
}) {
  const [flags,   setFlags]   = useState<string[]>(initialFlags ?? [])
  const [saving,  setSaving]  = useState(false)

  const toggle = useCallback(async (flag: string) => {
    const next = flags.includes(flag)
      ? flags.filter(f => f !== flag)
      : [...flags, flag]
    setFlags(next)
    setSaving(true)
    await saveAdminFlags(requestId, next)
    setSaving(false)
  }, [requestId, flags])

  return (
    <SectionCard title="Flags" icon={Flag}>
      <div className="flex flex-col gap-2">
        {(Object.entries(FLAG_CONFIG) as [keyof typeof FLAG_CONFIG, typeof FLAG_CONFIG[keyof typeof FLAG_CONFIG]][]).map(([key, cfg]) => {
          const active = flags.includes(key)
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              disabled={saving}
              className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-60 ${
                active ? cfg.active : `bg-white ${cfg.idle} hover:bg-slate-50`
              }`}
            >
              <AlertOctagon className="w-4 h-4 shrink-0" />
              {cfg.label}
              {active && <Check className="w-3.5 h-3.5 ml-auto" />}
            </button>
          )
        })}
      </div>
      {flags.length === 0 && (
        <p className="mt-3 text-xs text-slate-400 text-center italic">Aucun flag actif</p>
      )}
    </SectionCard>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminDossierPage() {
  const params = useParams()
  const id     = params?.id as string

  const [dossier,   setDossier]   = useState<AdminDossierData | null>(null)
  const [documents, setDocuments] = useState<RequestDocument[]>([])
  const [loading,   setLoading]   = useState(true)
  const [notFound,  setNotFound]  = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getAdminDossier(id),
      getDocumentsByRequest(id),
    ]).then(([doss, docs]) => {
      if (!doss) { setNotFound(true) } else { setDossier(doss) }
      setDocuments(docs)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (notFound || !dossier) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
        <AlertTriangle className="w-10 h-10 text-slate-300" />
        <p className="font-semibold text-slate-600">Dossier introuvable</p>
        <Link href="/admin/reservations" className="text-brand-500 text-sm underline underline-offset-2">
          ← Retour aux réservations
        </Link>
      </div>
    )
  }

  const { request } = dossier
  const activeFlags = request.adminFlags ?? []

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* ── Breadcrumb + Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
          <Link href="/admin/reservations" className="hover:text-slate-600 flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Réservations
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-600 font-medium">{request.dossierNumber}</span>
        </div>

        {/* Titre + statut + flags */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {request.requestType === 'immediate' && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg">
                <Zap className="w-3 h-3" /> Immédiate
              </span>
            )}
            <h1 className="text-xl font-black text-slate-900">
              Dossier {request.dossierNumber}
            </h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${REQUEST_STATUS_COLORS[request.status]}`}>
              {REQUEST_STATUS_LABELS[request.status]}
            </span>
          </div>

          {/* Active flags display */}
          {activeFlags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeFlags.map(flag => {
                const cfg = FLAG_CONFIG[flag as keyof typeof FLAG_CONFIG]
                return cfg ? (
                  <Pill key={flag} className={cfg.active}>
                    <AlertOctagon className="w-3 h-3" />
                    {cfg.label}
                  </Pill>
                ) : null
              })}
            </div>
          )}
        </div>

        {/* Meta ligne */}
        <p className="text-xs text-slate-400 mt-1.5">
          Créé le {formatDateTime(request.createdAt)}
          {' · '}
          par {request.createdByName}
          {request.requesterAccountType && ACCOUNT_TYPE_CONFIG[request.requesterAccountType] && (
            <> · <span className="font-semibold text-slate-500">
              {ACCOUNT_TYPE_CONFIG[request.requesterAccountType].label}
            </span></>
          )}
        </p>
      </div>

      {/* ── Corps ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Colonne principale (2/3) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <DemandeurCard dossier={dossier} />
              <SinistreCard  dossier={dossier} />
              <MissionCard   dossier={dossier} />
              <LoueurCard    dossier={dossier} />
              <DocumentsCard request={request} documents={documents} />
              <TimelineCard  dossier={dossier} />
            </div>

            {/* Colonne admin (1/3) */}
            <div className="flex flex-col gap-4">
              <OperationalStatusCard dossier={dossier} documents={documents} />
              <AdminNotesCard
                requestId={id}
                initialNote={request.adminNotes}
                adminUpdatedAt={request.adminUpdatedAt}
                adminUpdatedByName={dossier.adminUpdatedByName}
              />
              <AdminFlagsCard
                requestId={id}
                initialFlags={request.adminFlags}
              />
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}
