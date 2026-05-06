import type { RentalCompany } from './rentalCompany'
import type { VehicleCategoryType } from './vehicleCategory'

export interface MatchingParams {
  latitude:        number
  longitude:       number
  vehicleCategory: VehicleCategoryType
  radiusKm?:       number
  durationDays?:   number
}

export interface ScoreBreakdown {
  total:      number  // 0–100
  distance:   number  // 0–40
  stock:      number  // 0–30
  category:   number  // 0–20
  reactivity: number  // 0–10
}

export interface MatchingResult {
  company:              RentalCompany   // inclut distanceKm
  distanceKm:           number
  stockEstimate:        number | null
  available:            boolean
  score:                ScoreBreakdown
  isRecommended:        boolean         // top 3 avec score ≥ 50
  effectivePricePerDay?: number         // taux journalier effectif (forfait ou tarif de base)
  effectiveTotalPrice?:  number         // total sur la durée demandée
  hasForfait?:           boolean        // true si un forfait correspond à durationDays
  forfaitLabel?:         string         // ex. "7 jours"
}
