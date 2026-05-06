'use client'

import { useState, useEffect } from 'react'
import { MapPin, Phone, Car, Package, Check, Euro, Tag, MessageSquare } from 'lucide-react'
import type { RentalCompany, VehicleType } from '@/types/rentalCompany'
import { VEHICLE_TYPE_LABELS } from '@/types/rentalCompany'
import type { PriceOffer } from '@/types/request'

interface Props {
  company:      RentalCompany
  vehicleType:  VehicleType
  durationDays: number
  selected:     boolean
  onSelect:     (id: string) => void
  onPriceOffer: (companyId: string, offer: PriceOffer) => void
}

export function RentalCompanyCard({
  company, vehicleType, durationDays,
  selected, onSelect, onPriceOffer,
}: Props) {
  const basePrice   = company.basePrices[vehicleType]
  const totalBase   = basePrice !== undefined ? basePrice * durationDays : undefined

  const [mode, setMode]               = useState<'accept' | 'counter'>('accept')
  const [counterValue, setCounterValue] = useState<string>('')
  const [counterError, setCounterError] = useState<string | null>(null)

  // Réinitialiser le panel quand on dé-sélectionne
  useEffect(() => {
    if (!selected) {
      setMode('accept')
      setCounterValue('')
      setCounterError(null)
    }
  }, [selected])

  // Propager l'offre au parent à chaque changement valide
  useEffect(() => {
    if (!selected || basePrice === undefined) return

    if (mode === 'accept') {
      onPriceOffer(company.id, {
        loueurBasePrice: basePrice,
        assisteurOffer:  basePrice,
        isCounterOffer:  false,
        totalOffer:      basePrice * durationDays,
      })
      return
    }

    const parsed = parseFloat(counterValue.replace(',', '.'))
    if (!isNaN(parsed) && parsed > 0) {
      setCounterError(null)
      onPriceOffer(company.id, {
        loueurBasePrice: basePrice,
        assisteurOffer:  parsed,
        isCounterOffer:  true,
        totalOffer:      parsed * durationDays,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, mode, counterValue])

  function handleCounterChange(val: string) {
    setCounterValue(val)
    const parsed = parseFloat(val.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) {
      setCounterError('Entrez un montant valide')
    } else if (basePrice !== undefined && parsed > basePrice) {
      setCounterError('Votre offre dépasse le tarif de base')
    } else {
      setCounterError(null)
    }
  }

  return (
    <div
      className={[
        'rounded-2xl border-2 transition-all duration-200',
        selected ? 'border-brand-500 shadow-md' : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm cursor-pointer',
      ].join(' ')}
      onClick={() => !selected && onSelect(company.id)}
    >
      {/* ── En-tête de la carte ── */}
      <div className="flex items-start gap-3 p-4">
        {/* Infos société */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 truncate">{company.name}</span>
            {selected && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> Sélectionné
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-sm text-slate-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-brand-400" />
            <span className="truncate">{company.address}, {company.city}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {company.vehicleTypes.map(vt => (
              <span
                key={vt}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  vt === vehicleType ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Car className="w-3 h-3" />
                {VEHICLE_TYPE_LABELS[vt]}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {company.phone}
            </span>
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" /> {company.fleetSize} véh.
            </span>
          </div>
        </div>

        {/* Prix de base + distance */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {basePrice !== undefined ? (
            <div className="text-right">
              <div className="inline-flex items-baseline gap-0.5 bg-slate-900 text-white px-3 py-1.5 rounded-xl">
                <span className="text-lg font-black">{basePrice}</span>
                <span className="text-xs font-medium opacity-70">€/j</span>
              </div>
              {totalBase !== undefined && (
                <p className="text-xs text-slate-400 mt-1">
                  Total : <span className="font-semibold text-slate-600">{totalBase} €</span>
                </p>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Prix non renseigné</span>
          )}

          <div className="text-right">
            <span className="text-lg font-bold text-slate-700 leading-none">
              {company.distanceKm?.toFixed(0) ?? '—'}
            </span>
            <span className="text-xs text-slate-400 ml-0.5">km</span>
          </div>
        </div>
      </div>

      {/* ── Panel de négociation (visible uniquement si sélectionné) ── */}
      {selected && basePrice !== undefined && (
        <div className="border-t border-brand-100 bg-brand-50/60 rounded-b-2xl p-4 space-y-3">
          <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Négociation du prix
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Option : accepter le tarif */}
            <label className={[
              'flex-1 flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all',
              mode === 'accept'
                ? 'border-brand-500 bg-white shadow-sm'
                : 'border-slate-200 bg-white hover:border-brand-300',
            ].join(' ')}>
              <input
                type="radio"
                name={`price-mode-${company.id}`}
                checked={mode === 'accept'}
                onChange={() => setMode('accept')}
                className="accent-brand-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-700">Accepter le tarif</p>
                <p className="text-xs text-slate-400">{basePrice} €/j · {basePrice * durationDays} € total</p>
              </div>
            </label>

            {/* Option : contre-offre */}
            <label className={[
              'flex-1 flex items-center gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition-all',
              mode === 'counter'
                ? 'border-amber-400 bg-white shadow-sm'
                : 'border-slate-200 bg-white hover:border-amber-300',
            ].join(' ')}>
              <input
                type="radio"
                name={`price-mode-${company.id}`}
                checked={mode === 'counter'}
                onChange={() => setMode('counter')}
                className="accent-amber-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-700">Contre-offre</p>
                <p className="text-xs text-slate-400">Proposer un tarif différent</p>
              </div>
            </label>
          </div>

          {/* Champ contre-offre */}
          {mode === 'counter' && (
            <div className="space-y-1.5">
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min={1}
                  max={basePrice}
                  step={1}
                  value={counterValue}
                  onChange={e => handleCounterChange(e.target.value)}
                  placeholder={`ex. ${Math.round(basePrice * 0.85)}`}
                  onClick={e => e.stopPropagation()}
                  className={[
                    'w-full pl-9 pr-14 py-2.5 rounded-xl border text-sm font-semibold text-slate-800',
                    'focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent',
                    counterError ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-white',
                  ].join(' ')}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">€ / j</span>
              </div>

              {counterError && (
                <p className="text-xs text-red-500">{counterError}</p>
              )}

              {counterValue && !counterError && (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Votre offre : <strong>{counterValue} €/j</strong>
                  &nbsp;· Total : <strong>{Math.round(parseFloat(counterValue.replace(',', '.')) * durationDays)} €</strong>
                  &nbsp;(économie : {basePrice - parseFloat(counterValue.replace(',', '.'))} €/j)
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
