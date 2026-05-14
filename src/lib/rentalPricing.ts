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

/** Structure minimale pour le calcul de tarif par tranche */
export interface PriceableTarif {
  dailyRate:       number
  tarif1_4?:       number
  tarif5_7?:       number
  tarif8_14?:      number
  tarif15_21?:     number
  tarif22_29?:     number
  forfait30Jours?: number
}

/**
 * Retourne le total HT pour une durée donnée selon la grille tarifaire.
 * Fallback sur dailyRate si la tranche n'est pas renseignée.
 * Retourne null si aucun tarif disponible.
 */
export function getPriceForDuration(
  offer: PriceableTarif,
  durationDays: number,
): number | null {
  const d = Math.max(1, Math.round(durationDays))
  const fallback = offer.dailyRate > 0 ? round2(offer.dailyRate * d) : null

  if (d >= 30) return offer.forfait30Jours  != null ? offer.forfait30Jours  : (offer.dailyRate > 0 ? round2(offer.dailyRate * 30) : null)
  if (d >= 22) return offer.tarif22_29 != null ? round2(offer.tarif22_29 * d) : fallback
  if (d >= 15) return offer.tarif15_21 != null ? round2(offer.tarif15_21 * d) : fallback
  if (d >= 8)  return offer.tarif8_14  != null ? round2(offer.tarif8_14  * d) : fallback
  if (d >= 5)  return offer.tarif5_7   != null ? round2(offer.tarif5_7   * d) : fallback
  return              offer.tarif1_4   != null ? round2(offer.tarif1_4   * d) : fallback
}
