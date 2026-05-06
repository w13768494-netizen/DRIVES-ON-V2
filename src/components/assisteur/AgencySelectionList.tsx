'use client'

import { MapPin, Car, Phone, Loader2, Navigation, ChevronRight } from 'lucide-react'
import type { RentalCompany } from '@/types/rentalCompany'
import { VEHICLE_CATEGORY_LABELS, type VehicleCategoryType } from '@/types/vehicleCategory'

interface Props {
  companies:         RentalCompany[]
  vehicleCategory:   VehicleCategoryType
  selectedId:        string | null
  onSelect:          (id: string) => void
  onBack:            () => void
  onConfirm:         (companyId: string) => void
  loading:           boolean
}

export function AgencySelectionList({
  companies, vehicleCategory, selectedId, onSelect, onBack, onConfirm, loading,
}: Props) {
  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-slate-500 text-sm">Aucun loueur disponible dans ce secteur pour cette catégorie.</p>
        <button onClick={onBack} className="text-brand-500 text-sm underline underline-offset-2">
          ← Modifier la demande
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">
        {companies.length} loueur{companies.length > 1 ? 's' : ''} disponible{companies.length > 1 ? 's' : ''} —
        sélectionnez celui à qui envoyer la demande.
      </p>

      <div className="flex flex-col gap-3">
        {companies.map(company => {
          const selected = company.id === selectedId
          return (
            <button
              key={company.id}
              type="button"
              onClick={() => onSelect(company.id)}
              className={[
                'w-full text-left rounded-2xl border-2 p-4 transition-all',
                selected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 bg-white hover:border-brand-300',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="font-semibold text-slate-800">{company.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-brand-400" />
                      {company.city}
                    </span>
                    {company.distanceKm !== undefined && (
                      <span className="flex items-center gap-1">
                        <Navigation className="w-3.5 h-3.5 text-brand-400" />
                        {company.distanceKm} km
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-brand-400" />
                      {VEHICLE_CATEGORY_LABELS[vehicleCategory]}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-brand-400" />
                      {company.phone}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Flotte : {company.fleetSize} véh.
                  </p>
                </div>
                <div className={`shrink-0 w-5 h-5 rounded-full border-2 mt-1 ${
                  selected ? 'border-brand-500 bg-brand-500' : 'border-slate-300'
                }`}>
                  {selected && (
                    <svg viewBox="0 0 20 20" fill="white" className="w-full h-full">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
        >
          ← Retour
        </button>
        <button
          type="button"
          disabled={!selectedId || loading}
          onClick={() => selectedId && onConfirm(selectedId)}
          className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Envoi en cours…</>
            : <>Envoyer la demande <ChevronRight className="w-4 h-4" /></>
          }
        </button>
      </div>
    </div>
  )
}
