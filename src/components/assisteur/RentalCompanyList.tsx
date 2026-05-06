'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, AlertCircle, Euro } from 'lucide-react'
import { RentalCompanyCard } from './RentalCompanyCard'
import type { RentalCompany, VehicleType } from '@/types/rentalCompany'
import type { PriceOffer } from '@/types/request'

interface Props {
  companies:         RentalCompany[]
  vehicleType:       VehicleType
  durationDays:      number
  selectedCompanyId: string | null
  onSelect:          (id: string) => void
  onConfirm:         (priceOffer: PriceOffer) => void
  onBack:            () => void
  loading:           boolean
}

export function RentalCompanyList({
  companies, vehicleType, durationDays,
  selectedCompanyId, onSelect, onConfirm, onBack, loading,
}: Props) {
  const [currentOffer, setCurrentOffer] = useState<PriceOffer | null>(null)

  function handleSelect(id: string) {
    onSelect(id)
    setCurrentOffer(null) // reset jusqu'à ce que la card propage son offre
  }

  function handlePriceOffer(companyId: string, offer: PriceOffer) {
    if (companyId === selectedCompanyId) {
      setCurrentOffer(offer)
    }
  }

  const counterValue = currentOffer?.isCounterOffer ? currentOffer.assisteurOffer : null
  const isCounterInvalid =
    currentOffer?.isCounterOffer &&
    (currentOffer.assisteurOffer <= 0 || currentOffer.assisteurOffer > (currentOffer.loueurBasePrice))

  const canConfirm = selectedCompanyId !== null && currentOffer !== null && !isCounterInvalid

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <p className="text-sm text-slate-500">
          {companies.length} loueur{companies.length > 1 ? 's' : ''} disponible{companies.length > 1 ? 's' : ''} à proximité
        </p>
        <p className="text-xs text-slate-400 mt-0.5">Tarifs de base affichés · triés par distance</p>
      </div>

      {companies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {companies.map(company => (
            <RentalCompanyCard
              key={company.id}
              company={company}
              vehicleType={vehicleType}
              durationDays={durationDays}
              selected={selectedCompanyId === company.id}
              onSelect={handleSelect}
              onPriceOffer={handlePriceOffer}
            />
          ))}
        </div>
      )}

      {/* Récap offre en cours */}
      {currentOffer && (
        <div className={`rounded-xl px-4 py-3 border text-sm flex items-center gap-2 ${
          currentOffer.isCounterOffer
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <Euro className="w-4 h-4 flex-shrink-0" />
          {currentOffer.isCounterOffer ? (
            <span>
              Contre-offre : <strong>{counterValue} €/j</strong> · Total : <strong>{currentOffer.totalOffer} €</strong>
              <span className="ml-2 text-xs opacity-70">(base : {currentOffer.loueurBasePrice} €/j)</span>
            </span>
          ) : (
            <span>
              Tarif accepté : <strong>{currentOffer.assisteurOffer} €/j</strong> · Total : <strong>{currentOffer.totalOffer} €</strong>
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>

        <button
          type="button"
          onClick={() => currentOffer && onConfirm(currentOffer)}
          disabled={!canConfirm || loading}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors"
        >
          {loading ? (
            <><Spinner />Envoi en cours…</>
          ) : (
            <>
              Envoyer la demande
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertCircle className="w-10 h-10 text-slate-300" />
      <div>
        <p className="font-semibold text-slate-600">Aucun loueur disponible</p>
        <p className="text-sm text-slate-400 mt-1">Essayez un autre lieu ou un type de véhicule différent.</p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}
