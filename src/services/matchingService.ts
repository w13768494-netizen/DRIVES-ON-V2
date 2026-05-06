import { MOCK_RENTAL_COMPANIES }         from '@/data/mockRentalCompanies'
import { MOCK_VEHICLE_CATEGORY_OFFERS }  from '@/data/mockVehicleCategoryOffers'
import { calculateDistance }             from '@/lib/distance'
import { getActiveCityIds }              from '@/services/deploymentService'
import type { MatchingParams, MatchingResult, ScoreBreakdown } from '@/types/matching'
import type { RentalCompany }            from '@/types/rentalCompany'
import type { VehicleCategoryType }      from '@/types/vehicleCategory'

// ── Données mock de réactivité historique (0–10) ──────────────────────────────
// Représente le taux de réponse moyen observé pour chaque loueur.
// Branchable sur une vraie table Supabase : SELECT avg_reactivity FROM agencies WHERE id = ?
const MOCK_REACTIVITY: Record<string, number> = {
  'lc-001': 9,  // AutoLoc Paris Centre — très réactif
  'lc-002': 7,  // FlexiLoc Levallois
  'lc-003': 8,  // AutoLoc Val-de-Marne
  'lc-004': 7,  // ProDrive Sud
  'lc-005': 6,  // Mobility Express Lyon
  'lc-006': 5,  // Roue Libre Bordeaux
  'lc-007': 8,  // Nord Dépannage Auto
  'lc-008': 9,  // Azur Cars
  'lc-009': 6,  // Garonne Fleet
  'lc-010': 7,  // VéhiRent Est
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Wraps calculateDistance — remplaçable par une API de routing */
export function computeDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  return calculateDistance(lat1, lng1, lat2, lng2)
}

function getStockInfo(
  companyId: string,
  category:  VehicleCategoryType,
  fleetSize: number,
): { stockEstimate: number | null; available: boolean } {
  // Données VehicleCategoryOffer précises en priorité
  const offer = MOCK_VEHICLE_CATEGORY_OFFERS.find(
    o => o.agencyId === companyId && o.category === category,
  )
  if (offer) {
    return {
      stockEstimate: offer.stockEstimate,
      available:     offer.available && offer.stockEstimate > 0,
    }
  }
  // Estimation : 25 % de la flotte par catégorie, minimum 1
  const estimate = Math.max(1, Math.floor(fleetSize * 0.25))
  return { stockEstimate: estimate, available: true }
}

// ── Scoring ───────────────────────────────────────────────────────────────────

/**
 * Calcule le score de compatibilité d'un loueur (0–100).
 *
 * Décomposition :
 *   Distance   0–40 pts — décroissance linéaire jusqu'à radiusKm
 *   Stock      0–30 pts — basé sur le stock estimé disponible
 *   Catégorie  0–20 pts — le loueur propose la catégorie demandée
 *   Réactivité 0–10 pts — données historiques mock
 */
export function computeMatchingScore(
  company:    RentalCompany,
  distanceKm: number,
  category:   VehicleCategoryType,
  radiusKm:   number,
): ScoreBreakdown {
  // Distance (0–40)
  const distanceScore = Math.round(Math.max(0, 40 * (1 - distanceKm / radiusKm)))

  // Stock (0–30)
  const { stockEstimate, available } = getStockInfo(company.id, category, company.fleetSize)
  let stockScore = 0
  if (available && stockEstimate !== null) {
    if      (stockEstimate >= 5) stockScore = 30
    else if (stockEstimate >= 3) stockScore = 22
    else if (stockEstimate >= 1) stockScore = 12
  }

  // Catégorie (0–20)
  const categoryScore = company.vehicleTypes.includes(category) ? 20 : 0

  // Réactivité (0–10)
  const reactivityScore = MOCK_REACTIVITY[company.id] ?? 5

  const total = distanceScore + stockScore + categoryScore + reactivityScore

  return {
    total,
    distance:   distanceScore,
    stock:      stockScore,
    category:   categoryScore,
    reactivity: reactivityScore,
  }
}

// ── Résolution du prix effectif (forfait ou tarif journalier) ─────────────────

function resolveEffectivePricing(
  companyId:    string,
  category:     VehicleCategoryType,
  basePrices:   Partial<Record<VehicleCategoryType, number>>,
  durationDays: number | undefined,
): Pick<MatchingResult, 'effectivePricePerDay' | 'effectiveTotalPrice' | 'hasForfait' | 'forfaitLabel'> {
  const offer = MOCK_VEHICLE_CATEGORY_OFFERS.find(
    o => o.agencyId === companyId && o.category === category,
  )

  const dailyRate = offer?.dailyRate ?? basePrices[category]

  if (durationDays && offer) {
    const pkg = offer.packages.find(p => p.days === durationDays)
    if (pkg) {
      return {
        effectivePricePerDay: pkg.price / durationDays,
        effectiveTotalPrice:  pkg.price,
        hasForfait:           true,
        forfaitLabel:         pkg.label,
      }
    }
  }

  if (dailyRate !== undefined) {
    return {
      effectivePricePerDay: dailyRate,
      effectiveTotalPrice:  durationDays ? dailyRate * durationDays : undefined,
      hasForfait:           false,
    }
  }

  return { hasForfait: false }
}

// ── Point d'entrée principal ──────────────────────────────────────────────────

/**
 * Retourne les loueurs triés par distance croissante.
 * Les 3 loueurs disponibles les plus proches sont pré-sélectionnés.
 *
 * Branchable sur Supabase :
 *   const companies = await supabase.from('agencies').select('*')
 *   const offers    = await supabase.from('agency_offers').select('*')
 */
export async function getMatchingResults(params: MatchingParams): Promise<MatchingResult[]> {
  const { latitude, longitude, vehicleCategory, radiusKm = 50, durationDays } = params

  // null = pas de filtre (Supabase non configuré ou erreur → mode permissif)
  const [, activeCityIds] = await Promise.all([
    new Promise(r => setTimeout(r, 800)),
    getActiveCityIds(),
  ])

  const results: MatchingResult[] = []

  for (const company of MOCK_RENTAL_COMPANIES) {
    // Filtre déploiement : ignore les agences dont la ville n'est pas active
    if (activeCityIds !== null && company.cityId && !activeCityIds.includes(company.cityId)) continue

    if (!company.vehicleTypes.includes(vehicleCategory)) continue

    const distanceKm = computeDistance(latitude, longitude, company.latitude, company.longitude)
    if (distanceKm > radiusKm) continue

    const score  = computeMatchingScore(company, distanceKm, vehicleCategory, radiusKm)
    const { stockEstimate, available } = getStockInfo(company.id, vehicleCategory, company.fleetSize)

    results.push({
      company:   { ...company, distanceKm },
      distanceKm,
      stockEstimate,
      available,
      score,
      isRecommended: false,
      ...resolveEffectivePricing(company.id, vehicleCategory, company.basePrices, durationDays),
    })
  }

  results.sort((a, b) => b.score.total - a.score.total)

  // Marquer les 3 meilleurs scores disponibles comme recommandés
  let badges = 0
  for (const r of results) {
    if (badges < 3 && r.available) {
      r.isRecommended = true
      badges++
    }
  }

  return results
}
