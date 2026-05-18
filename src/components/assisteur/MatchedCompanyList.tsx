'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  MapPin, Package, ChevronRight, Loader2, AlertCircle,
  Navigation, Wrench, Tag, Star, ChevronDown, ChevronUp, Truck,
} from 'lucide-react'
import type { MatchingResult } from '@/types/matching'
import type { VehicleCategoryType } from '@/types/vehicleCategory'
import { VEHICLE_CATEGORY_LABELS } from '@/types/vehicleCategory'
import type { AgencyService, AgencyServiceType } from '@/types/agencyService'
import { AGENCY_SERVICE_LABELS, SERVICE_PRICE_LABELS, getServiceLabel } from '@/types/agencyService'
import { getServicesByAgency } from '@/services/agencyService'

interface Props {
  results:         MatchingResult[]
  vehicleCategory: VehicleCategoryType
  durationDays:    number
  onBack:          () => void
  onConfirm:       (companyIds: string[], serviceTypes: AgencyServiceType[], agencyServices: AgencyService[], targetPrice?: number) => void
  loading:         boolean
}

// ── Carte loueur ──────────────────────────────────────────────────────────────

function CompanyCard({
  result,
  isSelected,
  isTop,
  rank,
  onToggle,
}: {
  result:     MatchingResult
  isSelected: boolean
  isTop:      boolean
  rank?:      number
  onToggle:   () => void
}) {
  const {
    company, distanceKm, stockEstimate, available,
    effectivePricePerDay, effectiveTotalPrice, hasForfait,
    tarifBracketLabel, modeleEquivalent, includedKmPerDay, extraKmPrice,
    hasDelivery,
  } = result

  const addressLine = [company.address, company.city].filter(Boolean).join(', ')

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!available}
      className={[
        'w-full text-left rounded-2xl border-2 p-4 transition-all duration-200',
        isSelected
          ? 'border-brand-500 bg-brand-50 shadow-sm'
          : isTop
            ? 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm'
            : 'border-slate-100 bg-white hover:border-brand-200',
        !available ? 'opacity-50 cursor-not-allowed' : '',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">

        {/* Checkbox rond */}
        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
          isSelected ? 'border-brand-500 bg-brand-500' : 'border-slate-300'
        }`}>
          {isSelected && (
            <svg viewBox="0 0 20 20" fill="white" className="w-full h-full">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">

          {/* Ligne 1 — Nom + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-sm">{company.name}</span>
            {rank === 1 && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                <Star className="w-2.5 h-2.5" /> Meilleur choix
              </span>
            )}
            {!available && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                Indisponible
              </span>
            )}
          </div>

          {/* Ligne 2 — Adresse + distance */}
          <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{addressLine || company.city}</span>
            <span className="shrink-0 flex items-center gap-0.5 ml-1">
              <Navigation className="w-3 h-3 text-brand-400" />
              <span className="font-semibold text-brand-500">{distanceKm.toFixed(1)} km</span>
            </span>
          </p>

          {/* Ligne 3 — Modèle équivalent */}
          {modeleEquivalent && (
            <p className="text-xs text-slate-500 mt-1 italic">{modeleEquivalent}</p>
          )}

          {/* Ligne 4 — Tarif */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-2">
            {effectivePricePerDay !== undefined ? (
              <>
                <span className="text-sm font-bold text-slate-800">
                  {hasForfait
                    ? `Forfait 30j${effectiveTotalPrice !== undefined ? ` — ${effectiveTotalPrice} €` : ''}`
                    : `${effectivePricePerDay} €/j`
                  }
                </span>
                {tarifBracketLabel && !hasForfait && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600">
                    {tarifBracketLabel}
                  </span>
                )}
                {effectiveTotalPrice !== undefined && !hasForfait && (
                  <span className="text-xs text-slate-500">
                    → <span className="font-semibold text-slate-700">{effectiveTotalPrice} € HT</span> total
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-400 italic">Tarif non communiqué</span>
            )}
          </div>

          {/* Ligne 5 — Km + stock + livraison */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1">
            <span className="text-xs text-slate-400">
              {includedKmPerDay === undefined
                ? 'km non précisés'
                : includedKmPerDay === 0
                  ? 'Km illimités'
                  : `${includedKmPerDay} km/j inclus`
              }
              {includedKmPerDay !== undefined && extraKmPrice !== undefined && (
                <span> · {extraKmPrice} €/km suppl.</span>
              )}
            </span>
            {stockEstimate !== null && stockEstimate > 0 && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Package className="w-3 h-3 shrink-0" />
                {stockEstimate} dispo.
              </span>
            )}
            {hasDelivery && (
              <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                <Truck className="w-3 h-3" /> Livraison disponible
              </span>
            )}
          </div>

        </div>
      </div>
    </button>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export function MatchedCompanyList({ results, vehicleCategory, durationDays, onBack, onConfirm, loading }: Props) {
  const top3 = results.filter(r => r.isRecommended)
  const rest  = results.filter(r => !r.isRecommended)

  // Pré-cocher uniquement le meilleur résultat
  const [selected, setSelected] = useState<Set<string>>(
    () => {
      const best = top3.find(r => r.available)
      return best ? new Set([best.company.id]) : new Set()
    }
  )
  const [showMore, setShowMore] = useState(false)

  const [agencyServices, setAgencyServices]     = useState<AgencyService[]>([])
  const [selectedServices, setSelectedServices] = useState<Set<AgencyServiceType>>(new Set())
  const [targetPrice, setTargetPrice]           = useState('')

  useEffect(() => {
    if (selected.size === 0) { setAgencyServices([]); return }
    Promise.all([...selected].map(id => getServicesByAgency(id)))
      .then(all => setAgencyServices(all.flat()))
  }, [selected])

  const availableServiceTypes = useMemo((): AgencyServiceType[] => {
    const seen = new Set<AgencyServiceType>()
    for (const s of agencyServices) {
      if (s.available && s.type !== 'custom') seen.add(s.type)
    }
    return [...seen]
  }, [agencyServices])

  function getBestPriceType(type: AgencyServiceType): string {
    const matching = agencyServices.filter(s => s.type === type && s.available)
    if (matching.some(s => s.priceType === 'inclus')) return SERVICE_PRICE_LABELS['inclus']
    const fixe = matching.find(s => s.priceType === 'fixe')
    if (fixe) return fixe.price != null ? `${fixe.price} €` : SERVICE_PRICE_LABELS['fixe']
    return SERVICE_PRICE_LABELS['sur_devis']
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleService(type: AgencyServiceType) {
    setSelectedServices(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  const selectedIds = [...selected]

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <AlertCircle className="w-10 h-10 text-slate-300" />
        <div>
          <p className="font-semibold text-slate-600">Aucun loueur disponible</p>
          <p className="text-sm text-slate-400 mt-1">Essayez un autre secteur ou une catégorie différente.</p>
        </div>
        <button onClick={onBack} className="text-brand-500 text-sm underline underline-offset-2">
          ← Modifier la demande
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-slate-800">
            {results.length} loueur{results.length > 1 ? 's' : ''} disponible{results.length > 1 ? 's' : ''}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {VEHICLE_CATEGORY_LABELS[vehicleCategory]}
            {selected.size > 0 && (
              <span className="ml-2 font-semibold text-brand-500">
                · {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Tout décocher
          </button>
        )}
      </div>

      {/* ── Nos 3 propositions ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Nos propositions</p>
        </div>
        {top3.map((result, i) => (
          <CompanyCard
            key={result.company.id}
            result={result}
            isSelected={selected.has(result.company.id)}
            isTop={true}
            rank={i + 1}
            onToggle={() => toggle(result.company.id)}
          />
        ))}
      </div>

      {/* ── Voir plus ── */}
      {rest.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowMore(v => !v)}
            className="flex items-center justify-between w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-all"
          >
            <span>
              {showMore ? 'Masquer les autres loueurs' : `Voir ${rest.length} autre${rest.length > 1 ? 's' : ''} loueur${rest.length > 1 ? 's' : ''}`}
            </span>
            {showMore ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showMore && (
            <div className="flex flex-col gap-2 pl-0">
              {rest.map(result => (
                <CompanyCard
                  key={result.company.id}
                  result={result}
                  isSelected={selected.has(result.company.id)}
                  isTop={false}
                  onToggle={() => toggle(result.company.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Services ── */}
      {availableServiceTypes.length > 0 && (
        <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Services demandés <span className="font-normal normal-case text-slate-400">(optionnel)</span>
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableServiceTypes.map(type => {
              const isChecked  = selectedServices.has(type)
              const priceLabel = getBestPriceType(type)
              return (
                <label key={type} className={[
                  'flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all',
                  isChecked ? 'border-brand-400 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-200',
                ].join(' ')}>
                  <input type="checkbox" checked={isChecked} onChange={() => toggleService(type)} className="accent-brand-500 w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700">{AGENCY_SERVICE_LABELS[type]}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{priceLabel}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tarif proposé ── */}
      <div className="border-t border-slate-100 pt-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Votre tarif proposé <span className="font-normal normal-case text-slate-400">(optionnel)</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="number" min={1} step={1}
              value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
              placeholder="ex. 70"
              className="w-32 border border-slate-200 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">€/j</span>
          </div>
          <p className="text-xs text-slate-400">Transmis aux loueurs comme base de négociation.</p>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-1">
        <button
          type="button" onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ← Retour
        </button>
        <button
          type="button"
          disabled={selectedIds.length === 0 || loading}
          onClick={() => onConfirm(
            selectedIds,
            [...selectedServices],
            agencyServices.filter(s => selectedServices.has(s.type) && s.available),
            targetPrice ? Number(targetPrice) : undefined,
          )}
          className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Envoi en cours…</>
          ) : (
            <>
              Envoyer{selectedIds.length > 1 ? ` à ${selectedIds.length} loueurs` : selectedIds.length === 1 ? ' au loueur sélectionné' : ''}
              {targetPrice && <span className="ml-1 opacity-80">· {targetPrice} €/j</span>}
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
