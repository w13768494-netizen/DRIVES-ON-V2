'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, MapPin, Car, Calendar, Clock, Building2, Plus, Hash, User, Phone, Mail, CreditCard, ShieldCheck, ShieldAlert, Zap, CalendarClock, FileText } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AssisteurCoverageUploader } from './AssisteurCoverageUploader'
import { addDocument } from '@/services/documentService'
import type { AssistanceRequest } from '@/types/request'
import type { RentalCompany } from '@/types/rentalCompany'
import { VEHICLE_TYPE_LABELS } from '@/types/rentalCompany'
import { AGENCY_SERVICE_LABELS } from '@/types/agencyService'

interface Props {
  request:          AssistanceRequest
  companies:        RentalCompany[]
  documentUploaded?: boolean
  onNewRequest:     () => void
}

export function RequestConfirmation({ request, companies, documentUploaded = false, onNewRequest }: Props) {
  const [coverageFile, setCoverageFile] = useState<File | null>(null)
  const [coverageUrl,  setCoverageUrl]  = useState('')
  const [uploading, setUploading]       = useState(false)
  const [uploaded, setUploaded]         = useState(documentUploaded)

  const dateFormatted = format(request.dateNeeded, "EEEE d MMMM yyyy", { locale: fr })
  const { sinistre } = request

  async function handleUpload() {
    if (!coverageFile && !coverageUrl) return
    setUploading(true)
    try {
      await addDocument(
        coverageFile
          ? { requestId: request.id, type: 'prise_en_charge', owner: 'assisteur', fileName: coverageFile.name, sizeKb: Math.round(coverageFile.size / 1024) }
          : { requestId: request.id, type: 'prise_en_charge', owner: 'assisteur', fileName: 'Lien document', url: coverageUrl }
      )
      setUploaded(true)
      setCoverageFile(null)
      setCoverageUrl('')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bandeau succès */}
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="relative">
          <CheckCircle2 className="w-16 h-16 text-green-500" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full animate-pulse-dot" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Demande envoyée !</h2>
          <p className="text-slate-500 mt-1">
            {companies.length > 1
              ? `${companies.length} loueurs ont été notifiés — le premier à confirmer sera retenu.`
              : 'Le loueur a été notifié et va traiter votre demande.'
            }
          </p>
        </div>
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-amber-100 text-amber-700 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse-dot" />
          Statut : En attente de réponse
        </span>
      </div>

      {/* Prise en charge */}
      <CoverageCard coverage={request.coverage} />

      {/* Services demandés */}
      {request.requestedServices && request.requestedServices.length > 0 && (
        <Card title="Services demandés" subtitle="Transmis aux loueurs sélectionnés">
          {request.requestedServices.map(type => (
            <DetailRow key={type} icon={<CheckCircle2 className="w-4 h-4 text-brand-500" />} label={AGENCY_SERVICE_LABELS[type]}>
              <span className="text-xs text-brand-600 font-medium">Demandé</span>
            </DetailRow>
          ))}
        </Card>
      )}

      {/* Upload document de prise en charge */}
      <Card title="Document de prise en charge" subtitle="À joindre au dossier">
        {uploaded ? (
          <div className="px-5 py-4 flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-semibold">Document ajouté avec succès.</span>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-3">
            <AssisteurCoverageUploader
              file={coverageFile}
              onFileSelect={setCoverageFile}
              url={coverageUrl}
              onUrlChange={setCoverageUrl}
            />
            {(coverageFile || coverageUrl) && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Envoi en cours…' : <><FileText className="w-4 h-4" />Attacher au dossier</>}
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Références dossier */}
      <Card title="Références" subtitle={`Ref. interne : ${request.id}`}>
        <DetailRow icon={<Hash className="w-4 h-4 text-brand-500" />} label="N° de dossier">
          <span className="font-mono font-semibold">{request.dossierNumber}</span>
        </DetailRow>
        {request.referenceNumber && (
          <DetailRow icon={<Hash className="w-4 h-4 text-slate-400" />} label="N° de référence">
            <span className="font-mono">{request.referenceNumber}</span>
          </DetailRow>
        )}
        <DetailRow icon={
          request.requestType === 'immediate'
            ? <Zap className="w-4 h-4 text-red-500" />
            : <CalendarClock className="w-4 h-4 text-brand-500" />
        } label="Type">
          <span className={request.requestType === 'immediate' ? 'text-red-600 font-semibold' : 'text-brand-600 font-semibold'}>
            {request.requestType === 'immediate' ? 'Immédiate' : 'Planifiée'}
          </span>
        </DetailRow>
      </Card>

      {/* Sinistré */}
      <Card title="Sinistré" subtitle="">
        <DetailRow icon={<User className="w-4 h-4 text-brand-500" />} label="Identité">
          {sinistre.firstName} {sinistre.lastName}
        </DetailRow>
        <DetailRow icon={<Phone className="w-4 h-4 text-brand-500" />} label="Téléphone">
          {sinistre.phone}
        </DetailRow>
        {sinistre.email && (
          <DetailRow icon={<Mail className="w-4 h-4 text-brand-500" />} label="Email">
            {sinistre.email}
          </DetailRow>
        )}
        {sinistre.licenseNumber && (
          <DetailRow icon={<CreditCard className="w-4 h-4 text-brand-500" />} label="N° permis">
            <span className="font-mono">{sinistre.licenseNumber}</span>
          </DetailRow>
        )}
      </Card>

      {/* Demande */}
      <Card title="Détails de la demande" subtitle="">
        <DetailRow icon={<MapPin className="w-4 h-4 text-brand-500" />} label="Lieu de panne">
          {request.location.address}
        </DetailRow>
        <DetailRow icon={<Car className="w-4 h-4 text-brand-500" />} label="Véhicule souhaité">
          {VEHICLE_TYPE_LABELS[request.vehicleCategory]}
        </DetailRow>
        <DetailRow icon={<Calendar className="w-4 h-4 text-brand-500" />} label="Date souhaitée">
          {dateFormatted}
        </DetailRow>
        <DetailRow icon={<Clock className="w-4 h-4 text-brand-500" />} label="Durée">
          <span>{request.durationDays} jour{request.durationDays > 1 ? 's' : ''}</span>
          {request.maxExtensionDays && (
            <span className="ml-2 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
              + jusqu'à {request.maxExtensionDays} j de prolongation
            </span>
          )}
        </DetailRow>
        <DetailRow icon={<Building2 className="w-4 h-4 text-green-600" />} label={
          companies.length > 1 ? `${companies.length} loueurs contactés` : 'Loueur contacté'
        }>
          {companies.length > 0
            ? <div className="flex flex-col gap-1.5 mt-0.5">
                {companies.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                      i === 0 ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>{i + 1}</span>
                    <div>
                      <span className="font-semibold text-slate-800 text-sm">{c.name}</span>
                      <span className="text-xs text-slate-400 ml-1.5">{c.city}</span>
                    </div>
                  </div>
                ))}
              </div>
            : <span className="text-slate-500">Agences en attente de confirmation</span>
          }
        </DetailRow>
      </Card>

      <button
        type="button"
        onClick={onNewRequest}
        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border-2 border-brand-500 text-brand-600 font-semibold hover:bg-brand-50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nouvelle demande
      </button>
    </div>
  )
}

function CoverageCard({ coverage }: { coverage: AssistanceRequest['coverage'] }) {
  const { creditType } = coverage

  const config = {
    full:    {
      border: 'border-green-200 bg-green-50',
      icon:   <ShieldCheck className="w-5 h-5 text-green-600" />,
      label:  'Prise en charge totale',
      textCls:'text-green-800',
      items:  [
        { label: 'Location du véhicule', covered: true  },
        { label: 'Franchise dégâts',     covered: true  },
        { label: 'Carburant',            covered: true  },
      ],
    },
    partial: {
      border: 'border-amber-200 bg-amber-50',
      icon:   <ShieldAlert className="w-5 h-5 text-amber-600" />,
      label:  'Prise en charge partielle',
      textCls:'text-amber-800',
      items:  [
        { label: 'Location du véhicule',                        covered: true  },
        { label: 'Franchise dégâts — à la charge du sinistré',  covered: false },
        { label: 'Carburant — à la charge du sinistré',         covered: false },
      ],
    },
    client:  {
      border: 'border-slate-200 bg-slate-50',
      icon:   <ShieldAlert className="w-5 h-5 text-slate-500" />,
      label:  'À la charge du client',
      textCls:'text-slate-700',
      items:  [
        { label: 'Location — à la charge du sinistré',   covered: false },
        { label: 'Franchise — à la charge du sinistré',  covered: false },
        { label: 'Carburant — à la charge du sinistré',  covered: false },
      ],
    },
  }[creditType]

  return (
    <div className={`rounded-2xl border-2 p-4 ${config.border}`}>
      <div className="flex items-center gap-2 mb-3">
        {config.icon}
        <p className={`font-semibold text-sm ${config.textCls}`}>{config.label}</p>
      </div>
      <div className="flex flex-col gap-1">
        {config.items.map(item => (
          <span key={item.label} className={`flex items-center gap-2 text-xs ${item.covered ? 'text-green-700' : 'text-slate-400'}`}>
            {item.covered
              ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              : <XCircle      className="w-3.5 h-3.5 shrink-0" />
            }
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
      <div className="px-5 py-3 bg-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <div className="text-sm text-slate-700">{children}</div>
      </div>
    </div>
  )
}
