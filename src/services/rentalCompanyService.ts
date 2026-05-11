import { MOCK_RENTAL_COMPANIES } from '@/data/mockRentalCompanies'
import { calculateDistance, sortByDistance } from '@/lib/distance'
import { supabase }               from '@/lib/supabaseClient'
import type { RentalCompany }     from '@/types/rentalCompany'
import type { VehicleCategoryType } from '@/types/vehicleCategory'
import type { RentalAgencyRow }   from '@/services/rentalAgencyService'

const USE_SUPABASE =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://') &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('VOTRE')

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
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('rental_agencies')
      .select('*')
      .eq('id', id)
      .eq('active', true)
      .maybeSingle()

    if (!error && data) {
      const row = data as RentalAgencyRow
      return {
        id:           row.id,
        name:         row.agency_name,
        address:      row.address ?? '',
        city:         row.city    ?? '',
        latitude:     row.lat     ?? 0,
        longitude:    row.lng     ?? 0,
        vehicleTypes: [],
        basePrices:   {},
        phone:        row.phone   ?? '',
        fleetSize:    0,
      }
    }
  }
  // Fallback mock (IDs legacy ou Supabase indisponible)
  return MOCK_RENTAL_COMPANIES.find(c => c.id === id) ?? null
}
