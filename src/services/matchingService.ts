import { MOCK_RENTAL_COMPANIES }         from '@/data/mockRentalCompanies'
import { MOCK_VEHICLE_CATEGORY_OFFERS }  from '@/data/mockVehicleCategoryOffers'
import { calculateDistance }             from '@/lib/distance'
import { getActiveCityIds }              from '@/services/deploymentService'
import { getPriceForDuration }           from '@/lib/rentalPricing'
import { supabase }                      from '@/lib/supabaseClient'
import type { MatchingParams, MatchingResult, ScoreBreakdown } from '@/types/matching'
import type { RentalCompany }            from '@/types/rentalCompany'
import type { VehicleCategoryType }      from '@/types/vehicleCategory'
import type { RentalAgencyRow }          from '@/services/rentalAgencyService'
import type { AgencyVehicleCategoryRow } from '@/services/agencyVehicleCategoriesService'

const USE_SUPABASE =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://') &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('VOTRE')

// ── Helper de distance (partagé) ──────────────────────────────────────────────

export function computeDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  return calculateDistance(lat1, lng1, lat2, lng2)
}

// ── Helpers mock uniquement ───────────────────────────────────────────────────

const MOCK_REACTIVITY: Record<string, number> = {
  'lc-001': 9, 'lc-002': 7, 'lc-003': 8, 'lc-004': 7,
  'lc-005': 6, 'lc-006': 5, 'lc-007': 8, 'lc-008': 9,
  'lc-009': 6, 'lc-010': 7,
}

function getStockInfo(
  companyId: string,
  category:  VehicleCategoryType,
  fleetSize: number,
): { stockEstimate: number | null; available: boolean } {
  const offer = MOCK_VEHICLE_CATEGORY_OFFERS.find(
    o => o.agencyId === companyId && o.category === category,
  )
  if (offer) return { stockEstimate: offer.stockEstimate, available: offer.available && offer.stockEstimate > 0 }
  const estimate = Math.max(1, Math.floor(fleetSize * 0.25))
  return { stockEstimate: estimate, available: true }
}

export function computeMatchingScore(
  company:    RentalCompany,
  distanceKm: number,
  category:   VehicleCategoryType,
  radiusKm:   number,
): ScoreBreakdown {
  const distanceScore   = Math.round(Math.max(0, 40 * (1 - distanceKm / radiusKm)))
  const { stockEstimate, available } = getStockInfo(company.id, category, company.fleetSize)
  let stockScore = 0
  if (available && stockEstimate !== null) {
    if      (stockEstimate >= 5) stockScore = 30
    else if (stockEstimate >= 3) stockScore = 22
    else if (stockEstimate >= 1) stockScore = 12
  }
  const categoryScore   = company.vehicleTypes.includes(category) ? 20 : 0
  const reactivityScore = MOCK_REACTIVITY[company.id] ?? 5
  const total = distanceScore + stockScore + categoryScore + reactivityScore
  return { total, distance: distanceScore, stock: stockScore, category: categoryScore, reactivity: reactivityScore }
}

type PricingFields = Pick<MatchingResult, 'effectivePricePerDay' | 'effectiveTotalPrice' | 'hasForfait' | 'forfaitLabel' | 'tarifBracketLabel'>

function resolveEffectivePricing(
  companyId:    string,
  category:     VehicleCategoryType,
  basePrices:   Partial<Record<VehicleCategoryType, number>>,
  durationDays: number | undefined,
): PricingFields {
  const offer = MOCK_VEHICLE_CATEGORY_OFFERS.find(o => o.agencyId === companyId && o.category === category)
  if (!durationDays || !offer) {
    const rate = offer?.dailyRate ?? basePrices[category]
    return rate !== undefined
      ? { effectivePricePerDay: rate, effectiveTotalPrice: durationDays ? rate * durationDays : undefined, hasForfait: false }
      : { hasForfait: false }
  }
  const total = getPriceForDuration(offer, durationDays)
  if (total === null) return { hasForfait: false }
  const d = Math.max(1, Math.round(durationDays))
  const isForfait30 = d >= 30 && offer.forfait30Jours != null
  const tarifBracketLabel =
    d >= 30 ? (offer.forfait30Jours  != null ? 'Forfait 30j'     : undefined) :
    d >= 22 ? (offer.tarif22_29      != null ? 'Tranche 22–29j'  : undefined) :
    d >= 15 ? (offer.tarif15_21      != null ? 'Tranche 15–21j'  : undefined) :
    d >= 8  ? (offer.tarif8_14       != null ? 'Tranche 8–14j'   : undefined) :
    d >= 5  ? (offer.tarif5_7        != null ? 'Tranche 5–7j'    : undefined) :
              (offer.tarif1_4        != null ? 'Tranche 1–4j'    : undefined)
  const effectivePricePerDay = isForfait30
    ? Math.round((total / 30) * 100) / 100
    : Math.round((total / d) * 100) / 100
  return { effectivePricePerDay, effectiveTotalPrice: total, hasForfait: isForfait30, forfaitLabel: isForfait30 ? 'Forfait 30j' : undefined, tarifBracketLabel }
}

// ── Helpers Supabase uniquement ───────────────────────────────────────────────

function agencyToCompany(agency: RentalAgencyRow, avc: AgencyVehicleCategoryRow): RentalCompany {
  return {
    id:           agency.id,
    name:         agency.agency_name,
    address:      agency.address ?? '',
    city:         agency.city    ?? '',
    latitude:     agency.lat     ?? 0,
    longitude:    agency.lng     ?? 0,
    vehicleTypes: [avc.category],
    basePrices:   { [avc.category]: avc.daily_rate } as Partial<Record<VehicleCategoryType, number>>,
    phone:        agency.phone   ?? '',
    fleetSize:    0,
  }
}

function computeScoreFromRow(
  avc:        AgencyVehicleCategoryRow,
  distanceKm: number,
  radiusKm:   number,
): ScoreBreakdown {
  const distanceScore   = Math.round(Math.max(0, 40 * (1 - distanceKm / radiusKm)))
  const available       = avc.available && avc.stock_estimate > 0
  const s               = avc.stock_estimate
  const stockScore      = !available ? 0 : s >= 5 ? 30 : s >= 3 ? 22 : s >= 1 ? 12 : 0
  const categoryScore   = 20
  const reactivityScore = 5
  return {
    total:      distanceScore + stockScore + categoryScore + reactivityScore,
    distance:   distanceScore,
    stock:      stockScore,
    category:   categoryScore,
    reactivity: reactivityScore,
  }
}

function resolvePricingFromRow(
  avc:          AgencyVehicleCategoryRow,
  durationDays: number | undefined,
): PricingFields {
  if (!durationDays) {
    return avc.daily_rate > 0
      ? { effectivePricePerDay: avc.daily_rate, hasForfait: false }
      : { hasForfait: false }
  }
  const tarif = {
    dailyRate:      avc.daily_rate,
    tarif1_4:       avc.tarif_1_4       ?? undefined,
    tarif5_7:       avc.tarif_5_7       ?? undefined,
    tarif8_14:      avc.tarif_8_14      ?? undefined,
    tarif15_21:     avc.tarif_15_21     ?? undefined,
    tarif22_29:     avc.tarif_22_29     ?? undefined,
    forfait30Jours: avc.forfait_30_jours ?? undefined,
  }
  const total = getPriceForDuration(tarif, durationDays)
  if (total === null) return { hasForfait: false }
  const d = Math.max(1, Math.round(durationDays))
  const isForfait30 = d >= 30 && avc.forfait_30_jours != null
  const tarifBracketLabel =
    d >= 30 ? (avc.forfait_30_jours != null ? 'Forfait 30j'     : undefined) :
    d >= 22 ? (avc.tarif_22_29      != null ? 'Tranche 22–29j'  : undefined) :
    d >= 15 ? (avc.tarif_15_21      != null ? 'Tranche 15–21j'  : undefined) :
    d >= 8  ? (avc.tarif_8_14       != null ? 'Tranche 8–14j'   : undefined) :
    d >= 5  ? (avc.tarif_5_7        != null ? 'Tranche 5–7j'    : undefined) :
              (avc.tarif_1_4        != null ? 'Tranche 1–4j'    : undefined)
  const effectivePricePerDay = isForfait30
    ? Math.round((total / 30) * 100) / 100
    : Math.round((total / d) * 100) / 100
  return { effectivePricePerDay, effectiveTotalPrice: total, hasForfait: isForfait30, forfaitLabel: isForfait30 ? 'Forfait 30j' : undefined, tarifBracketLabel }
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

export async function getMatchingResults(params: MatchingParams): Promise<MatchingResult[]> {
  return USE_SUPABASE
    ? getMatchingResultsSupabase(params)
    : getMatchingResultsMock(params)
}

async function getMatchingResultsSupabase(params: MatchingParams): Promise<MatchingResult[]> {
  const { latitude, longitude, vehicleCategory, radiusKm = 50, durationDays } = params

  const [agenciesRes, categoriesRes, deliveryRes] = await Promise.all([
    supabase.from('rental_agencies').select('*').eq('active', true).eq('is_available', true),
    supabase.from('agency_vehicle_categories').select('*').eq('category', vehicleCategory).eq('available', true),
    supabase.from('agency_services').select('agency_id').eq('type', 'livraison_vehicule').eq('available', true),
  ])

  if (agenciesRes.error) {
    console.error('[matchingService] rental_agencies:', agenciesRes.error.message)
    return []
  }
  if (categoriesRes.error) {
    console.error('[matchingService] agency_vehicle_categories:', categoriesRes.error.message)
    return []
  }

  const agencies     = (agenciesRes.data  ?? []) as RentalAgencyRow[]
  const avcMap       = new Map(
    ((categoriesRes.data ?? []) as AgencyVehicleCategoryRow[]).map(r => [r.agency_id, r]),
  )
  const deliverySet  = new Set(
    ((deliveryRes.data ?? []) as { agency_id: string }[]).map(r => r.agency_id),
  )

  const results: MatchingResult[] = []

  for (const agency of agencies) {
    if (!agency.lat || !agency.lng) continue

    const avc = avcMap.get(agency.id)
    if (!avc) continue

    if (!avc.available || avc.stock_estimate <= 0) continue

    const distanceKm = computeDistance(latitude, longitude, agency.lat, agency.lng)
    if (distanceKm > radiusKm) continue

    const company = agencyToCompany(agency, avc)
    results.push({
      company:          { ...company, distanceKm },
      distanceKm,
      stockEstimate:    avc.stock_estimate,
      available:        true,
      score:            computeScoreFromRow(avc, distanceKm, radiusKm),
      isRecommended:    false,
      modeleEquivalent: avc.modele_equivalent  ?? undefined,
      includedKmPerDay: avc.included_km_per_day > 0 ? avc.included_km_per_day : undefined,
      extraKmPrice:     avc.extra_km_price     > 0 ? avc.extra_km_price      : undefined,
      hasDelivery:      deliverySet.has(agency.id),
      ...resolvePricingFromRow(avc, durationDays),
    })
  }

  results.sort((a, b) => b.score.total - a.score.total)

  let badges = 0
  for (const r of results) {
    if (badges < 3 && r.available) { r.isRecommended = true; badges++ }
  }

  return results
}

async function getMatchingResultsMock(params: MatchingParams): Promise<MatchingResult[]> {
  const { latitude, longitude, vehicleCategory, radiusKm = 50, durationDays } = params

  const [, activeCityIds] = await Promise.all([
    new Promise(r => setTimeout(r, 800)),
    getActiveCityIds(),
  ])

  const results: MatchingResult[] = []

  for (const company of MOCK_RENTAL_COMPANIES) {
    if (activeCityIds !== null && company.cityId && !activeCityIds.includes(company.cityId)) continue
    if (!company.vehicleTypes.includes(vehicleCategory)) continue

    const distanceKm = computeDistance(latitude, longitude, company.latitude, company.longitude)
    if (distanceKm > radiusKm) continue

    const score = computeMatchingScore(company, distanceKm, vehicleCategory, radiusKm)
    const { stockEstimate, available } = getStockInfo(company.id, vehicleCategory, company.fleetSize)
    const offer = MOCK_VEHICLE_CATEGORY_OFFERS.find(o => o.agencyId === company.id && o.category === vehicleCategory)

    results.push({
      company:          { ...company, distanceKm },
      distanceKm,
      stockEstimate,
      available,
      score,
      isRecommended:    false,
      modeleEquivalent: offer?.modeleEquivalent,
      includedKmPerDay: offer?.includedKmPerDay && offer.includedKmPerDay > 0 ? offer.includedKmPerDay : undefined,
      extraKmPrice:     offer?.extraKmPrice     && offer.extraKmPrice     > 0 ? offer.extraKmPrice     : undefined,
      ...resolveEffectivePricing(company.id, vehicleCategory, company.basePrices, durationDays),
    })
  }

  results.sort((a, b) => b.score.total - a.score.total)

  let badges = 0
  for (const r of results) {
    if (badges < 3 && r.available) { r.isRecommended = true; badges++ }
  }

  return results
}
