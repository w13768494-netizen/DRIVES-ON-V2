const COMMISSION_RATE = 0.15

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface RentalPricing {
  pricePerDay:     number
  durationDays:    number
  supplementTotal: number
  total:           number
  commission:      number
  net:             number
}

export function calculatePricing(
  pricePerDay: number,
  durationDays: number,
  supplementTotal = 0,
  commissionRate = COMMISSION_RATE,
): RentalPricing {
  const locationTotal  = round2(pricePerDay * durationDays)
  const total          = round2(locationTotal + supplementTotal)
  const commission     = round2(total * commissionRate)
  const net            = round2(total - commission)
  return { pricePerDay, durationDays, supplementTotal, total, commission, net }
}

/** Prix effectif à afficher au loueur : contre-offre assisteur > tarif cible initial */
export function getEffectivePrice(request: {
  targetPricePerDay?: number
  counterOfferPrice?: number
}): number | null {
  return request.counterOfferPrice ?? request.targetPricePerDay ?? null
}
