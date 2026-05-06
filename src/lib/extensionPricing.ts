import { MOCK_VEHICLE_CATEGORY_OFFERS } from '@/data/mockVehicleCategoryOffers'
import { getEffectiveDuration } from '@/types/request'
import type { AssistanceRequest } from '@/types/request'

export interface PricingOption {
  pricePerDay:   number
  extensionCost: number
  newTotalPrice: number
  isForfait:     boolean
  forfaitLabel?: string
}

export interface ExtensionPricingResult {
  effectiveDays:        number
  extensionDays:        number
  newTotalDays:         number
  confirmedPricePerDay: number
  currentTotalPrice:    number
  dailyOption:          PricingOption
  forfaitOption?:       PricingOption
  recommended:          'daily' | 'forfait'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function getExtensionPricing(
  request:       AssistanceRequest,
  extensionDays: number,
): ExtensionPricingResult | null {
  const pricePerDay = request.loueurResponse?.pricePerDay
  if (!pricePerDay || !request.confirmedAgencyId || extensionDays <= 0) return null

  const effectiveDays   = getEffectiveDuration(request)
  const newTotalDays    = effectiveDays + extensionDays
  const currentTotal    = round2(pricePerDay * effectiveDays)

  // Option A — tarif journalier confirmé (négocié ou non)
  const dailyOption: PricingOption = {
    pricePerDay,
    extensionCost: round2(extensionDays * pricePerDay),
    newTotalPrice: round2(currentTotal + extensionDays * pricePerDay),
    isForfait:     false,
  }

  // Option B — forfait si la nouvelle durée totale correspond exactement à un forfait du loueur
  let forfaitOption: PricingOption | undefined
  const offer = MOCK_VEHICLE_CATEGORY_OFFERS.find(
    o => o.agencyId === request.confirmedAgencyId && o.category === request.vehicleCategory,
  )
  if (offer) {
    const pkg = offer.packages.find(p => p.days === newTotalDays)
    if (pkg) {
      const extCost = round2(pkg.price - currentTotal)
      if (extCost >= 0) {
        forfaitOption = {
          pricePerDay:   round2(pkg.price / newTotalDays),
          extensionCost: extCost,
          newTotalPrice: pkg.price,
          isForfait:     true,
          forfaitLabel:  pkg.label,
        }
      }
    }
  }

  const recommended: 'daily' | 'forfait' =
    forfaitOption && forfaitOption.extensionCost <= dailyOption.extensionCost
      ? 'forfait'
      : 'daily'

  return {
    effectiveDays,
    extensionDays,
    newTotalDays,
    confirmedPricePerDay: pricePerDay,
    currentTotalPrice:    currentTotal,
    dailyOption,
    forfaitOption,
    recommended,
  }
}
