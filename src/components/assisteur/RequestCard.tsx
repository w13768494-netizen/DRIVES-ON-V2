'use client'

import Link from 'next/link'
import { MapPin, Car, Calendar, ChevronRight, AlertTriangle, ShieldCheck, ShieldAlert, ArrowRightLeft, Zap, CalendarX2 } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DisplayStatusBadge } from '@/components/shared/DisplayStatusBadge'
import { getRentalAlertState, getEndDate } from '@/lib/rentalDates'
import { VEHICLE_TYPE_LABELS } from '@/types/rentalCompany'
import type { AssistanceRequest } from '@/types/request'

interface Props {
  request: AssistanceRequest
}

export function RequestCard({ request }: Props) {
  const { sinistre, loueurResponse } = request
  const hasPrice    = loueurResponse?.pricePerDay !== undefined
  const isTransfer  = request.status === 'transfert_propose'
  const alertState  = getRentalAlertState(request)
  const overdue     = alertState === 'overdue'
  const urgent      = alertState === 'extension_urgent'

  const accentBar = overdue ? 'bg-red-500' : urgent ? 'bg-amber-400' : isTransfer ? 'bg-orange-400' : 'bg-slate-200'

  return (
    <Link
      href={`/assisteur/demandes/${request.id}`}
      className={[
        'flex bg-white border rounded-2xl overflow-hidden transition-all duration-200 group',
        'hover:shadow-md hover:-translate-y-px',
        overdue
          ? 'border-red-200 bg-red-50/30'
          : urgent
            ? 'border-amber-200 bg-amber-50/20'
            : 'border-slate-200 hover:border-brand-300/60',
      ].join(' ')}
    >
      {/* Left accent bar */}
      <div className={`w-1 shrink-0 ${accentBar} rounded-l-2xl`} />

      <div className="flex-1 p-4 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Ligne 1 : dossier + statut + prise en charge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {request.dossierNumber}
            </span>
            <DisplayStatusBadge status={request.status} dateNeeded={request.dateNeeded} />
            {overdue && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full">
                <CalendarX2 className="w-3 h-3" /> Overdue
              </span>
            )}
            {urgent && !overdue && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Prolongation urgente
              </span>
            )}
            {request.requestType === 'immediate' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                <Zap className="w-3 h-3" /> Immédiate
              </span>
            )}
            {request.coverage.creditType === 'full' ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Totale
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <ShieldAlert className="w-3 h-3" /> Partielle
              </span>
            )}
            {request.status === 'refusee' && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <AlertTriangle className="w-3 h-3" /> Action requise
              </span>
            )}
            {isTransfer && (
              <span className="flex items-center gap-1 text-xs text-orange-600 font-semibold">
                <ArrowRightLeft className="w-3 h-3" /> Transfert en attente
              </span>
            )}
          </div>

          {/* Ligne 2 : sinistré */}
          <p className="font-semibold text-slate-800 truncate">
            {sinistre.firstName} {sinistre.lastName}
            <span className="font-normal text-slate-400 ml-2 text-sm">{sinistre.phone}</span>
          </p>

          {/* Ligne 3 : lieu + véhicule */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1 truncate max-w-xs">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-brand-400" />
              {request.location.address}
            </span>
            <span className="flex items-center gap-1">
              <Car className="w-3.5 h-3.5 text-brand-400" />
              {VEHICLE_TYPE_LABELS[request.vehicleCategory]}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-brand-400" />
              {request.durationDays}j · {format(request.dateNeeded, 'd MMM', { locale: fr })}
              {request.maxExtensionDays && (
                <span className="text-slate-400">+{request.maxExtensionDays}j</span>
              )}
            </span>
          </div>

          {/* Ligne 4 : prix si confirmé */}
          {hasPrice && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700">
              <span>{loueurResponse!.pricePerDay} €/j</span>
              {loueurResponse!.vehicleModel && (
                <span className="font-normal text-slate-500 ml-1">— {loueurResponse!.vehicleModel}</span>
              )}
            </div>
          )}

          {overdue && (
            <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
              <CalendarX2 className="w-3 h-3" />
              Fin prévue le {format(getEndDate(request), "d MMM yyyy 'à' HH'h'mm", { locale: fr })} — dossier à régulariser
            </p>
          )}
          {urgent && !overdue && (
            <p className="text-xs text-amber-600 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              Fin le {format(getEndDate(request), "d MMM yyyy 'à' HH'h'mm", { locale: fr })} — prolongation à demander maintenant
            </p>
          )}
          {(request.status === 'envoyee' || request.status === 'recue') && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {(request.assignedAgencyIds?.length ?? 0) > 1
                ? `En attente — envoyée à ${request.assignedAgencyIds!.length} loueurs`
                : 'En attente de confirmation du loueur'
              }
            </p>
          )}
          {request.status === 'confirmee' && request.confirmedAgencyName && (
            <p className="text-xs text-green-700 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Confirmée par {request.confirmedAgencyName}
            </p>
          )}
        </div>

        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-400 flex-shrink-0 mt-1 transition-colors" />
      </div>

      <p className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
        Créée {format(request.createdAt, "d MMM yyyy 'à' HH'h'mm", { locale: fr })}
      </p>
      </div>
    </Link>
  )
}
