'use client'

import { useState, useRef } from 'react'
import {
  MapPin, Car, Calendar, Clock, User, Phone, Mail, CreditCard,
  ShieldCheck, ShieldAlert, Wallet, CheckCircle2, XCircle,
  Truck, Navigation, ArrowRight, Loader2, Hash, Zap, CalendarClock,
  AlertTriangle,
} from 'lucide-react'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { calculateDistance } from '@/lib/distance'
import type { RequestFormInput } from '@/types/request'
import type { RentalCompany } from '@/types/rentalCompany'
import { VEHICLE_CATEGORY_LABELS } from '@/types/vehicleCategory'
import { VEHICLE_TYPE_LABELS } from '@/types/rentalCompany'
import { AGENCY_SERVICE_LABELS } from '@/types/agencyService'
import type { AgencyService, AgencyServiceType } from '@/types/agencyService'
import { AssisteurCoverageUploader } from './AssisteurCoverageUploader'

interface Props {
  input:           RequestFormInput
  companies:       RentalCompany[]
  serviceTypes:    AgencyServiceType[]
  agencyServices:  AgencyService[]
  targetPrice?:    number
  onBack:          () => void
  onSend:          (coverageFile?: File, coverageUrl?: string) => void
  loading:         boolean
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
      </div>
      <div className="divide-y divide-slate-100">{children}</div>
    </div>
  )
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-400 mb-0.5">{label}</p>
        <div className="text-sm text-slate-800">{children}</div>
      </div>
    </div>
  )
}

function CoverageRow({ creditType }: { creditType: 'full' | 'partial' | 'client' }) {
  const config = {
    full:    { icon: <ShieldCheck className="w-4 h-4" />, label: 'Prise en charge totale',    cls: 'text-green-600', items: [true, true, true] },
    partial: { icon: <ShieldAlert className="w-4 h-4" />, label: 'Prise en charge partielle', cls: 'text-amber-600', items: [true, false, false] },
    client:  { icon: <Wallet      className="w-4 h-4" />, label: 'À la charge du client',     cls: 'text-slate-600', items: [false, false, false] },
  }[creditType]

  const labels = ['Location', 'Franchise', 'Carburant']

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className={`mt-0.5 shrink-0 ${config.cls}`}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 mb-1">Prise en charge</p>
        <p className={`text-sm font-semibold ${config.cls}`}>{config.label}</p>
        <div className="flex gap-3 mt-1.5 flex-wrap">
          {labels.map((l, i) => (
            <span key={l} className={`flex items-center gap-1 text-xs ${config.items[i] ? 'text-green-700' : 'text-slate-400'}`}>
              {config.items[i]
                ? <CheckCircle2 className="w-3 h-3 shrink-0" />
                : <XCircle      className="w-3 h-3 shrink-0" />
              }
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}


export function RequestRecap({ input, companies, serviceTypes, agencyServices, targetPrice, onBack, onSend, loading }: Props) {
  const { sinistre, location, vehicleCategory, dateNeeded, durationDays, maxExtensionDays, coverage } = input
  const [coverageFile, setCoverageFile] = useState<File | null>(null)
  const [coverageUrl,  setCoverageUrl]  = useState('')
  const uploaderRef = useRef<HTMLDivElement>(null)

  const hasCoverage          = !!(coverageFile || coverageUrl.trim())
  const needsCoverageWarning = coverage.creditType !== 'client' && !hasCoverage

  function resolveSupplementsFor(type: AgencyServiceType, services: AgencyService[]) {
    const matches = services.filter(s => s.type === type && s.available)
    if (matches.length === 0 || matches.some(s => s.priceType === 'inclus')) {
      return { priceLabel: 'Inclus', amount: 0, isSuplement: false }
    }
    const fixe = matches.find(s => s.priceType === 'fixe' && s.price != null)
    if (fixe) return { priceLabel: `+ ${fixe.price} €`, amount: fixe.price!, isSuplement: true }
    return { priceLabel: 'Sur devis', amount: 0, isSuplement: false }
  }

  // Calcul du total par loueur avec ses propres prix de services + distance
  const companiesWithTotal = companies.map(company => {
    const pricePerDay   = targetPrice ?? company.basePrices?.[vehicleCategory]
    const baseTotal     = pricePerDay != null ? pricePerDay * durationDays : null
    const loueurSvcs    = agencyServices.filter(s => s.agencyId === company.id)
    const supplements   = serviceTypes.map(type => ({
      type,
      label: AGENCY_SERVICE_LABELS[type],
      ...resolveSupplementsFor(type, loueurSvcs),
    }))
    const supplementTotal = supplements.reduce((acc, s) => acc + s.amount, 0)
    const grandTotal      = baseTotal != null ? baseTotal + supplementTotal : null
    const distanceKm      = calculateDistance(
      location.latitude, location.longitude,
      company.latitude,  company.longitude,
    )
    return { company, pricePerDay, baseTotal, supplements, grandTotal, distanceKm }
  })

  // Tri : du plus proche au plus éloigné
  const sorted = [...companiesWithTotal].sort((a, b) => a.distanceKm - b.distanceKm)

  // Badge "Meilleur tarif" sur le moins cher (parmi ceux qui ont un prix)
  const cheapestTotal = Math.min(
    ...companiesWithTotal.filter(c => c.grandTotal != null).map(c => c.grandTotal!)
  ) || null

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="pb-4 border-b border-slate-100">
        <h2 className="text-lg font-black text-slate-900">Récapitulatif</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Vérifiez les informations avant d'envoyer la demande aux loueurs sélectionnés.
        </p>
      </div>

      {/* Prise en charge */}
      <Section title="Prise en charge">
        <CoverageRow creditType={coverage.creditType} />
      </Section>

      {/* Loueurs sélectionnés — triés du moins cher au plus cher */}
      <Section title={`${companies.length} loueur${companies.length > 1 ? 's' : ''} contacté${companies.length > 1 ? 's' : ''}`}>
        {sorted.map(({ company, pricePerDay, baseTotal, supplements, grandTotal, distanceKm }, i) => {
          const isCheapest = grandTotal != null && grandTotal === cheapestTotal && companies.length > 1

          return (
            <div key={company.id} className={`px-4 py-3 ${isCheapest ? 'bg-green-50' : ''}`}>
              {/* En-tête loueur */}
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-black ${
                  isCheapest ? 'bg-green-600 text-white' : i === 0 ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-800">{company.name}</p>
                    {isCheapest && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                        Meilleur tarif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{company.city}</span>
                    <span className="flex items-center gap-1"><Navigation className="w-3 h-3 shrink-0" />{distanceKm.toFixed(1)} km</span>
                    {company.phone && <span>{company.phone}</span>}
                  </div>
                </div>
              </div>

              {/* Détail tarifaire */}
              {pricePerDay != null && (
                <div className="ml-10 text-xs flex flex-col gap-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Location · {pricePerDay} €/j × {durationDays} j</span>
                    <span className="font-semibold text-slate-700 tabular-nums">{baseTotal} €</span>
                  </div>

                  {supplements.map(s => (
                    <div key={s.type} className="flex justify-between text-slate-500">
                      <span>{s.label}</span>
                      <span className={`font-semibold tabular-nums ${s.isSuplement ? 'text-amber-600' : 'text-green-600'}`}>
                        {s.isSuplement ? s.priceLabel : 'Inclus'}
                      </span>
                    </div>
                  ))}

                  {grandTotal != null && (
                    <div className={`flex justify-between border-t mt-1 pt-1.5 text-sm font-black ${isCheapest ? 'border-green-200' : 'border-slate-100'}`}>
                      <span className="text-slate-800">Total estimé</span>
                      <span className={`tabular-nums ${isCheapest ? 'text-green-700' : 'text-brand-600'}`}>{grandTotal} €</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </Section>

      {/* Sinistré */}
      <Section title="Sinistré">
        <Row icon={<User className="w-4 h-4" />} label="Identité">
          <span className="font-semibold">{sinistre.firstName} {sinistre.lastName}</span>
        </Row>
        <Row icon={<Phone className="w-4 h-4" />} label="Téléphone">{sinistre.phone}</Row>
        {sinistre.email && <Row icon={<Mail className="w-4 h-4" />} label="Email">{sinistre.email}</Row>}
        {sinistre.licenseNumber && (
          <Row icon={<CreditCard className="w-4 h-4" />} label="N° permis">
            <span className="font-mono">{sinistre.licenseNumber}</span>
          </Row>
        )}
      </Section>

      {/* Demande */}
      <Section title="Détails de la demande">
        <Row icon={<Hash className="w-4 h-4" />} label="N° de dossier">
          <span className="font-mono font-semibold">{input.dossierNumber}</span>
        </Row>
        <Row icon={
          input.requestType === 'immediate'
            ? <Zap className="w-4 h-4 text-red-500" />
            : <CalendarClock className="w-4 h-4 text-brand-500" />
        } label="Type de demande">
          <span className={input.requestType === 'immediate' ? 'text-red-600 font-semibold' : 'text-brand-600 font-semibold'}>
            {input.requestType === 'immediate' ? 'Immédiate' : 'Planifiée'}
          </span>
        </Row>
        <Row icon={<MapPin className="w-4 h-4" />} label="Lieu de panne">{location.address}</Row>
        <Row icon={<Car className="w-4 h-4" />} label="Catégorie de véhicule">
          {VEHICLE_CATEGORY_LABELS[vehicleCategory]}
        </Row>
        <Row icon={<Calendar className="w-4 h-4" />} label="Prise en charge">
          {format(dateNeeded, "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
        </Row>
        <Row icon={<Clock className="w-4 h-4" />} label="Durée">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{durationDays} jour{durationDays > 1 ? 's' : ''} (blocs 24h)</span>
            {maxExtensionDays && (
              <span className="text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                + jusqu'à {maxExtensionDays} j de prolongation
              </span>
            )}
          </div>
        </Row>
        <Row icon={<Calendar className="w-4 h-4" />} label="Retour prévu">
          {format(addDays(dateNeeded, durationDays), "EEEE d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
        </Row>
      </Section>

      {/* Services */}
      {serviceTypes.length > 0 && (
        <Section title="Services demandés">
          {serviceTypes.map(type => (
            <Row key={type} icon={<CheckCircle2 className="w-4 h-4 text-brand-500" />} label={AGENCY_SERVICE_LABELS[type]}>
              <span className="text-xs text-slate-400">Prix détaillé par loueur ci-dessus</span>
            </Row>
          ))}
        </Section>
      )}

      {/* Document de prise en charge */}
      <div ref={uploaderRef}>
        <AssisteurCoverageUploader
          file={coverageFile}
          onFileSelect={setCoverageFile}
          url={coverageUrl}
          onUrlChange={setCoverageUrl}
        />
      </div>

      {/* Warning fort — prise en charge manquante (full ou partial uniquement) */}
      {needsCoverageWarning && (
        <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-orange-800">Prise en charge non jointe</p>
              <p className="text-xs text-orange-700 mt-0.5">
                Les loueurs peuvent exiger ce document avant de confirmer.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => uploaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="flex-1 px-3 py-2.5 rounded-xl border-2 border-orange-400 text-orange-700 text-sm font-semibold hover:bg-orange-100 transition-colors"
            >
              Joindre maintenant
            </button>
            <button
              type="button"
              onClick={() => onSend(undefined, undefined)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
                : 'Envoyer quand même'
              }
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button" onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ← Modifier
        </button>
        {!needsCoverageWarning && (
          <button
            type="button"
            onClick={() => onSend(coverageFile ?? undefined, coverageUrl || undefined)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors disabled:opacity-50 bg-brand-500 hover:bg-brand-600 text-white"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
              : <>Confirmer et envoyer <ArrowRight className="w-4 h-4" /></>
            }
          </button>
        )}
      </div>
    </div>
  )
}
