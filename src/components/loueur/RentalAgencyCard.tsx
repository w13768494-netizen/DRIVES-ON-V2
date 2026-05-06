import { MapPin, Phone, Mail, User, Clock, Circle } from 'lucide-react'
import type { RentalAgency } from '@/types/rentalAgency'

interface Props {
  agency:    RentalAgency
  active?:   boolean
  onClick?:  () => void
}

export function RentalAgencyCard({ agency, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white rounded-2xl border p-4 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'
      } ${active ? 'border-brand-400 ring-2 ring-brand-200' : 'border-slate-200'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{agency.name}</p>
          <p className="text-xs text-slate-400">{agency.address}, {agency.postalCode} {agency.city}</p>
        </div>
        <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          agency.isAvailable ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'
        }`}>
          <Circle className={`w-1.5 h-1.5 fill-current`} />
          {agency.isAvailable ? 'Disponible' : 'Indisponible'}
        </span>
      </div>

      {/* Infos */}
      <div className="flex flex-col gap-1.5 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {agency.contactName}
        </span>
        <span className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {agency.phone}
        </span>
        <span className="flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {agency.email}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          Rayon de service : {agency.serviceRadiusKm} km
        </span>
        <span className="flex items-start gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            <span className="block">Semaine : {agency.openingHours.weekdays}</span>
            {agency.openingHours.saturday && <span className="block">Samedi : {agency.openingHours.saturday}</span>}
            {agency.openingHours.sunday   && <span className="block">Dimanche : {agency.openingHours.sunday}</span>}
            {!agency.openingHours.sunday  && <span className="block text-slate-300">Dimanche : fermé</span>}
          </span>
        </span>
      </div>
    </button>
  )
}
