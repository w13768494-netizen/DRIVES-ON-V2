import Link from 'next/link'
import { MapPin, Car, Calendar, Navigation, ChevronRight, ShieldCheck, ShieldAlert, Lock, Zap, CalendarClock } from 'lucide-react'
import { DisplayStatusBadge } from '@/components/shared/DisplayStatusBadge'
import { VEHICLE_CATEGORY_LABELS } from '@/types/vehicleCategory'
import type { ReceivedRequest } from '@/types/loueur'

interface Props {
  request: ReceivedRequest
}

export function RentalRequestCard({ request }: Props) {
  const { coverage, sinistre, location, dateNeeded, durationDays } = request

  const dateLabel       = new Date(dateNeeded).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const isNew           = request.status === 'envoyee' || request.status === 'recue'
  const isTransfer      = request.status === 'transfert_propose'
  const isLockedByOther = !!(request.confirmedAgencyId && request.confirmedAgencyId !== request.agencyId)

  const accentColor = isLockedByOther ? 'bg-slate-300'
    : isTransfer  ? 'bg-orange-400'
    : isNew       ? 'bg-amber-400'
    : 'bg-slate-200'

  return (
    <Link
      href={`/loueur/demandes/${request.id}`}
      className={[
        'group flex bg-white rounded-2xl border overflow-hidden transition-all duration-200',
        'hover:shadow-md hover:-translate-y-px',
        isLockedByOther ? 'border-slate-200 opacity-70'
          : isTransfer  ? 'border-orange-200'
          : isNew       ? 'border-amber-200'
          :               'border-slate-200 hover:border-brand-300/60',
      ].join(' ')}
    >
      {/* Left accent bar */}
      <div className={`w-1 shrink-0 ${accentColor} rounded-l-2xl`} />

      <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">

        {/* Header: dossier + statut */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                #{request.dossierNumber}
              </span>
              {isLockedByOther && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3" aria-hidden="true" />Attribuée
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-900 mt-1.5 truncate">
              {sinistre.firstName} {sinistre.lastName}
              <span className="font-normal text-slate-400 ml-2 text-xs">{sinistre.phone}</span>
            </p>
          </div>
          <DisplayStatusBadge status={request.status} dateNeeded={request.dateNeeded} />
        </div>

        {/* Info chips */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            {VEHICLE_CATEGORY_LABELS[request.vehicleCategory]}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            {dateLabel} · {durationDays}j
          </span>
          <span className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            {request.distanceKm} km
          </span>
          <span className="flex items-center gap-1.5">
            {coverage.creditType === 'full'
              ? <><ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" aria-hidden="true" />Prise en charge totale</>
              : <><ShieldAlert  className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />Prise en charge partielle</>
            }
          </span>
          <span className="flex items-center gap-1.5 col-span-2 truncate">
            <MapPin className="w-3.5 h-3.5 text-brand-400 shrink-0" aria-hidden="true" />
            {location.address}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3 text-xs">
            {request.requestType === 'immediate' ? (
              <span className="inline-flex items-center gap-1 font-semibold text-red-600">
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />Immédiate
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-brand-600">
                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />Planifiée
              </span>
            )}
            {request.loueurResponse?.pricePerDay && (
              <span className="text-slate-600 font-semibold">
                {request.loueurResponse.pricePerDay} €/j
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-400 transition-colors shrink-0" aria-hidden="true" />
        </div>
      </div>
    </Link>
  )
}
