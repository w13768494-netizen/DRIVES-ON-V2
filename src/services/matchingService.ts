import { MOCK_RENTAL_COMPANIES }         from '@/data/mockRentalCompanies'
import { MOCK_VEHICLE_CATEGORY_OFFERS }  from '@/data/mockVehicleCategoryOffers'
import { calculateDistance }             from '@/lib/distance'
import { getActiveCityIds }              from '@/services/deploymentService'
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

function resolveEffectivePricing(
  companyId:    string,
  category:     VehicleCategoryType,
  basePrices:   Partial<Record<VehicleCategoryType, number>>,
  durationDays: number | undefined,
): Pick<MatchingResult, 'effectivePricePerDay' | 'effectiveTotalPrice' | 'hasForfait' | 'forfaitLabel'> {
  const offer     = MOCK_VEHICLE_CATEGORY_OFFERS.find(o => o.agencyId === companyId && o.category === category)
  const dailyRate = offer?.dailyRate ?? basePrices[category]
  if (durationDays && offer) {
    const pkg = offer.packages.find(p => p.days === durationDays)
    if (pkg) return { effectivePricePerDay: pkg.price / durationDays, effectiveTotalPrice: pkg.price, hasForfait: true, forfaitLabel: pkg.label }
  }
  if (dailyRate !== undefined) {
    return { effectivePricePerDay: dailyRate, effectiveTotalPrice: durationDays ? dailyRate * durationDays : undefined, hasForfait: false }
  }
  return { hasForfait: false }
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
): Pick<MatchingResult, 'effectivePricePerDay' | 'effectiveTotalPrice' | 'hasForfait' | 'forfaitLabel'> {
  if (durationDays && avc.packages?.length) {
    const pkg = avc.packages.find(p => p.days === durationDays)
    if (pkg) return { effectivePricePerDay: pkg.price / durationDays, effectiveTotalPrice: pkg.price, hasForfait: true, forfaitLabel: pkg.label }
  }
  if (avc.daily_rate) {
    return { effectivePricePerDay: avc.daily_rate, effectiveTotalPrice: durationDays ? avc.daily_rate * durationDays : undefined, hasForfait: false }
  }
  return { hasForfait: false }
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

export async function getMatchingResults(params: MatchingParams): Promise<MatchingResult[]> {
  return USE_SUPABASE
    ? getMatchingResultsSupabase(params)
    : getMatchingResultsMock(params)
}

async function getMatchingResultsSupabase(params: MatchingParams): Promise<MatchingResult[]> {
  const { latitude, longitude, vehicleCategory, radiusKm = 50, durationDays } = params

  console.log(`[matching] catégorie="${vehicleCategory}" lat=${latitude} lng=${longitude} radius=${radiusKm}km`)

  const [agenciesRes, categoriesRes] = await Promise.all([
    supabase.from('rental_agencies').select('*').eq('active', true).eq('is_available', true),
    supabase.from('agency_vehicle_categories').select('*').eq('category', vehicleCategory).eq('available', true),
  ])

  if (agenciesRes.error) {
    console.error('[matching] rental_agencies error:', agenciesRes.error.message)
    return []
  }
  if (categoriesRes.error) {
    console.error('[matching] agency_vehicle_categories error:', categoriesRes.error.message)
    return []
  }

  const agencies = (agenciesRes.data  ?? []) as RentalAgencyRow[]
  const avcRows  = (categoriesRes.data ?? []) as AgencyVehicleCategoryRow[]

  console.log(`[matching] agences actives trouvées : ${agencies.length}`)
  agencies.forEach(a => console.log(`  agence id=${a.id} name="${a.agency_name}" lat=${a.lat} lng=${a.lng} is_available=${a.is_available} active=${a.active}`))

  console.log(`[matching] catégories "${vehicleCategory}" disponibles : ${avcRows.length}`)
  avcRows.forEach(r => console.log(`  avc agency_id=${r.agency_id} available=${r.available} stock=${r.stock_estimate} daily_rate=${r.daily_rate}`))

  const avcMap = new Map(avcRows.map(r => [r.agency_id, r]))

  const results: MatchingResult[] = []

  for (const agency of agencies) {
    const label = `"${agency.agency_name}" (${agency.id})`

    if (!agency.lat || !agency.lng) {
      console.log(`[matching] EXCLUE ${label} — lat/lng manquants (lat=${agency.lat} lng=${agency.lng})`)
      continue
    }

    const avc = avcMap.get(agency.id)
    if (!avc) {
      console.log(`[matching] EXCLUE ${label} — catégorie "${vehicleCategory}" absente de agency_vehicle_categories`)
      continue
    }

    if (!avc.available || avc.stock_estimate <= 0) {
      console.log(`[matching] EXCLUE ${label} — disponibilité KO (available=${avc.available} stock=${avc.stock_estimate})`)
      continue
    }

    const distanceKm = computeDistance(latitude, longitude, agency.lat, agency.lng)
    if (distanceKm > radiusKm) {
      console.log(`[matching] EXCLUE ${label} — distance=${distanceKm.toFixed(1)}km > radius=${radiusKm}km`)
      continue
    }

    console.log(`[matching] INCLUSE ${label} — distance=${distanceKm.toFixed(1)}km stock=${avc.stock_estimate}`)

    const company = agencyToCompany(agency, avc)
    results.push({
      company:       { ...company, distanceKm },
      distanceKm,
      stockEstimate: avc.stock_estimate,
      available:     true,
      score:         computeScoreFromRow(avc, distanceKm, radiusKm),
      isRecommended: false,
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

    results.push({
      company:       { ...company, distanceKm },
      distanceKm,
      stockEstimate,
      available,
      score,
      isRecommended: false,
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
