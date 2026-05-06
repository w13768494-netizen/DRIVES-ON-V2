import { MOCK_RENTAL_COMPANIES } from '@/data/mockRentalCompanies'
import { calculateDistance, sortByDistance } from '@/lib/distance'
import type { RentalCompany } from '@/types/rentalCompany'
import type { VehicleCategoryType } from '@/types/vehicleCategory'

const SIMULATED_LATENCY_MS = 900

export interface GetNearbyCompaniesParams {
  latitude:         number
  longitude:        number
  vehicleCategory:  VehicleCategoryType
  radiusKm?:        number
}

export async function getNearbyRentalCompanies(
  params: GetNearbyCompaniesParams,
): Promise<RentalCompany[]> {
  const { latitude, longitude, vehicleCategory, radiusKm = 500 } = params

  await new Promise(resolve => setTimeout(resolve, SIMULATED_LATENCY_MS))

  const withDistance = MOCK_RENTAL_COMPANIES
    .filter(c => c.vehicleTypes.includes(vehicleCategory))
    .map(c => ({
      ...c,
      distanceKm: calculateDistance(latitude, longitude, c.latitude, c.longitude),
    }))
    .filter(c => c.distanceKm <= radiusKm)

  return sortByDistance(withDistance)
}

export async function getRentalCompanyById(id: string): Promise<RentalCompany | null> {
  await new Promise(resolve => setTimeout(resolve, 200))
  return MOCK_RENTAL_COMPANIES.find(c => c.id === id) ?? null
}
