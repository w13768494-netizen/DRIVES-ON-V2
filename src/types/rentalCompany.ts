import type { VehicleCategoryType } from './vehicleCategory'

// Re-exports pour la compatibilité avec le code existant
export type { VehicleCategoryType as VehicleType } from './vehicleCategory'
export { VEHICLE_CATEGORY_LABELS as VEHICLE_TYPE_LABELS } from './vehicleCategory'

export interface RentalCompany {
  id:           string
  cityId?:      string
  name:         string
  address:      string
  city:         string
  latitude:     number
  longitude:    number
  vehicleTypes: VehicleCategoryType[]
  basePrices:   Partial<Record<VehicleCategoryType, number>>
  phone:        string
  fleetSize:    number
  distanceKm?:  number
}
