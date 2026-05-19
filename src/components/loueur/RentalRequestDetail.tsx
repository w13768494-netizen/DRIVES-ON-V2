'use client'

import { useState, useEffect } from 'react'
import { MapPin, Car, Calendar, Clock, User, Phone, Mail, FileText, Euro, Shield, Navigation, Zap, CalendarClock, CheckCircle2, XCircle, Fuel, Tag } from 'lucide-react'
import { LoueurStatusBadge } from './LoueurStatusBadge'
import { CREDIT_TYPE_LABELS, REQUEST_TYPE_LABELS } from '@/types/request'
import { getEndDate } from '@/lib/rentalDates'
import { calculatePricing, getEffectivePrice } from '@/lib/rentalPricing'
import { VEHICLE_CATEGORY_LABELS, VEHICLE_GROUP_LABELS } from '@/types/vehicleCategory'
import { AGENCY_SERVICE_LABELS } from '@/types/agencyService'
import type { AgencyService, AgencyServiceType } from '@/types/agencyService'
import { getServicesByAgency } from '@/services/agencyService'
import type { ReceivedRequest } from '@/types/loueur'

interface Props {
  request: ReceivedRequest
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
      </div>
    </div>
  )
}

export function RentalRequestDetail({ request }: Props) {
  const {
    coverage, sinistre, location, vehicleGroup, vehicleCategory,
    dateNeeded, durationDays, maxExtensionDays, notes, loueurResponse, requestType,
  } = request

  const [agencyServices, setAgencyServices] = useState<AgencyService[]>([])
  useEffect(() => {
    getServicesByAgency(request.agencyId).then(setAgencyServices)
  }, [request.agencyId])

  function getServiceEarning(type: AgencyServiceType): { label: string; amount: number; isIncluded: boolean } {
    const matches = agencyServices.filter(s => s.type === type && s.available)
    if (!matches.length || matches.some(s => s.priceType === 'inclus')) return { label: 'Inclus', amount: 0, isIncluded: true }
    const fixe = matches.find(s => s.priceType === 'fixe' && s.price != null)
    if (fixe) return { label: `+ ${fixe.price} €`, amount: fixe.price!, isIncluded: false }
    return { label: 'Sur devis', amount: 0, isIncluded: false }
  }

  const dateNeededObj = new Date(dateNeeded)
  const dateLabel = dateNeededObj.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const timeLabel = `${String(dateNeededObj.getHours()).padStart(2, '0')}h${String(dateNeededObj.getMinutes()).padStart(2, '0')}`

  const returnDate = getEndDate(request)
  const returnLabel = returnDate.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const returnTimeLabel = `${String(returnDate.getHours()).padStart(2, '0')}h${String(returnDate.getMinutes()).padStart(2, '0')}`

  const createdLabel = new Date(request.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-slate-400 font-mono">Dossier #{request.dossierNumber}</p>
          {request.referenceNumber && (
            <p className="text-xs text-slate-400">Réf. {request.referenceNumber}</p>
          )}
          <p className="text-xs text-slate-400 mt-1">Reçue le {createdLabel}</p>
        </div>
        <LoueurStatusBadge status={request.status} pulse />
      </div>

      {/* Type de demande */}
      <Section title="Type de demande">
        <Row
          icon={requestType === 'immediate' ? <Zap className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
          label="Urgence"
          value={
            <span className={`font-semibold ${requestType === 'immediate' ? 'text-red-600' : 'text-brand-600'}`}>
              {REQUEST_TYPE_LABELS[requestType]}
            </span>
          }
        />
      </Section>

      {/* Couverture */}
      <Section title="Prise en charge">
        <Row
          icon={<Shield className="w-4 h-4" />}
          label="Type"
          value={
            <span className={coverage.creditType === 'full' ? 'text-green-700 font-semibold' : 'text-amber-700 font-semibold'}>
              {CREDIT_TYPE_LABELS[coverage.creditType]}
            </span>
          }
        />
        <Row
          icon={<Car className="w-4 h-4" />}
          label="Location du véhicule"
          value={
            <span className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Prise en charge
            </span>
          }
        />
        <Row
          icon={<FileText className="w-4 h-4" />}
          label="Franchise dégâts"
          value={
            coverage.creditType === 'full'
              ? <span className="flex items-center gap-1.5 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" />Prise en charge</span>
              : <span className="flex items-center gap-1.5 text-slate-400"><XCircle className="w-3.5 h-3.5" />À la charge du sinistré</span>
          }
        />
        <Row
          icon={<Fuel className="w-4 h-4" />}
          label="Carburant"
          value={
            coverage.creditType === 'full'
              ? <span className="flex items-center gap-1.5 text-green-700"><CheckCircle2 className="w-3.5 h-3.5" />Pris en charge</span>
              : <span className="flex items-center gap-1.5 text-slate-400"><XCircle className="w-3.5 h-3.5" />À la charge du sinistré</span>
          }
        />
      </Section>

      {/* Récapitulatif financier */}
      {(() => {
        const effectivePrice = getEffectivePrice(request)
        if (!effectivePrice) return null
        const { total, commission, net } = calculatePricing(effectivePrice, durationDays)
        const hasCounterOffer   = !!request.counterOfferPrice && request.counterOfferPrice !== request.targetPricePerDay
        const loueurOwnPrice    = request.loueurResponse?.pricePerDay
        const hasLoueurCounter  = !!loueurOwnPrice && loueurOwnPrice !== effectivePrice

        return (
          <Section title="Récapitulatif financier">
            {request.targetPricePerDay && (
              <Row
                icon={<Tag className="w-4 h-4" />}
                label="Tarif proposé initial"
                value={<span className="font-semibold">{request.targetPricePerDay} €/j</span>}
              />
            )}
            {hasCounterOffer && (
              <Row
                icon={<Euro className="w-4 h-4" />}
                label="Contre-proposition assisteur"
                value={<span className="font-semibold text-brand-700">{request.counterOfferPrice} €/j</span>}
              />
            )}
            {hasLoueurCounter && (
              <Row
                icon={<Euro className="w-4 h-4" />}
                label="Votre contre-proposition"
                value={<span className="font-semibold text-teal-700">{loueurOwnPrice} €/j</span>}
              />
            )}
            <Row
              icon={<Calendar className="w-4 h-4" />}
              label="Durée"
              value={`${durationDays} jour${durationDays > 1 ? 's' : ''}`}
            />
            <div className="border-t border-slate-100 mt-1 pt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Total réservation</span>
                <span className="font-semibold text-slate-800 tabular-nums">{total} €</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Commission DRIVES ON (15 %)</span>
                <span className="font-semibold text-slate-400 tabular-nums">− {commission} €</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 mt-1">
                <span className="font-semibold text-slate-700">Gain net loueur estimé</span>
                <span className="font-black text-green-700 tabular-nums text-base">{net} € HT</span>
              </div>
            </div>
          </Section>
        )
      })()}

      {/* Véhicule & Dates */}
      <Section title="Véhicule & Disponibilité">
        <Row icon={<Car className="w-4 h-4" />} label="Type" value={VEHICLE_GROUP_LABELS[vehicleGroup]} />
        <Row icon={<Car className="w-4 h-4" />} label="Catégorie" value={VEHICLE_CATEGORY_LABELS[vehicleCategory]} />
        <Row
          icon={<Calendar className="w-4 h-4" />}
          label="Prise en charge"
          value={`${dateLabel} à ${timeLabel}`}
        />
        <Row
          icon={<Clock className="w-4 h-4" />}
          label="Durée"
          value={`${durationDays} jour${durationDays > 1 ? 's' : ''} (blocs de 24h)${maxExtensionDays ? ` + ${maxExtensionDays}j de prolongation possible` : ''}`}
        />
        <Row
          icon={<Calendar className="w-4 h-4" />}
          label="Retour prévu"
          value={`${returnLabel} à ${returnTimeLabel}`}
        />
      </Section>

      {/* Sinistré */}
      <Section title="Sinistré">
        <Row icon={<User className="w-4 h-4" />}     label="Nom complet" value={`${sinistre.firstName} ${sinistre.lastName}`} />
        <Row icon={<Phone className="w-4 h-4" />}    label="Téléphone"   value={sinistre.phone} />
        {sinistre.email        && <Row icon={<Mail className="w-4 h-4" />}     label="Email"      value={sinistre.email} />}
        {sinistre.licenseNumber && <Row icon={<FileText className="w-4 h-4" />} label="N° permis"  value={sinistre.licenseNumber} />}
      </Section>

      {/* Lieu */}
      <Section title="Lieu du sinistre">
        <Row icon={<MapPin className="w-4 h-4" />}     label="Adresse"                    value={location.address} />
        <Row icon={<Navigation className="w-4 h-4" />} label="Distance de votre agence"   value={`${request.distanceKm} km (vol d'oiseau)`} />
      </Section>

      {/* Services demandés */}
      {request.requestedServices && request.requestedServices.length > 0 && (() => {
        const services = request.requestedServices!.map(type => ({ type, ...getServiceEarning(type) }))
        const supplementTotal = services.reduce((acc, s) => acc + s.amount, 0)
        return (
          <Section title="Services demandés">
            <div className="flex flex-col gap-2">
              {services.map(s => (
                <div key={s.type} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                    <span className="text-sm text-slate-700">{AGENCY_SERVICE_LABELS[s.type]}</span>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums shrink-0 ${s.isIncluded ? 'text-green-600' : 'text-amber-600'}`}>
                    {s.label}
                  </span>
                </div>
              ))}
              {supplementTotal > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                  <span className="text-xs font-semibold text-slate-500">Total suppléments</span>
                  <span className="text-sm font-black text-slate-800 tabular-nums">+ {supplementTotal} €</span>
                </div>
              )}
            </div>
          </Section>
        )
      })()}

      {/* Notes */}
      {notes && (
        <Section title="Notes de l'assisteur">
          <p className="text-sm text-slate-700 leading-relaxed">{notes}</p>
        </Section>
      )}

      {/* Réponse existante */}
      {loueurResponse && (
        <Section title="Votre réponse enregistrée">
          <div className="flex flex-col gap-2 text-sm">
            {loueurResponse.vehicleModel && (
              <div className="flex justify-between">
                <span className="text-slate-500">Modèle proposé</span>
                <span className="font-medium text-slate-800">{loueurResponse.vehicleModel}</span>
              </div>
            )}
            {loueurResponse.message && (
              <p className="text-slate-600 bg-slate-50 rounded-xl p-3 mt-1">{loueurResponse.message}</p>
            )}
            <p className="text-xs text-slate-400 text-right mt-1">
              Répondu le {new Date(loueurResponse.respondedAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
        </Section>
      )}
    </div>
  )
}
