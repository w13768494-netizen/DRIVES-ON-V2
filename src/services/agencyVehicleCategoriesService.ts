import { createClient } from '@/lib/supabase/client'
import type { VehicleCategoryType, VehicleGroupType, PricingPackage } from '@/types/vehicleCategory'

export interface AgencyVehicleCategoryRow {
  id:                  string
  agency_id:           string
  category:            VehicleCategoryType
  group_type:          VehicleGroupType
  available:           boolean
  stock_estimate:      number
  daily_rate:          number
  deposit:             number
  included_km_per_day: number
  extra_km_price:      number
  packages:            PricingPackage[]
  created_at:          string
}

export type AgencyVehicleCategoryInput = {
  id?:                 string
  category:            VehicleCategoryType
  group_type:          VehicleGroupType
  available:           boolean
  stock_estimate:      number
  daily_rate:          number
  deposit:             number
  included_km_per_day: number
  extra_km_price:      number
  packages:            PricingPackage[]
}

export async function getAgencyVehicleCategories(agencyId: string): Promise<AgencyVehicleCategoryRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agency_vehicle_categories')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true })
  if (error) { console.error('[agencyVehicleCategoriesService] get', error.message); return [] }
  return (data as AgencyVehicleCategoryRow[]) ?? []
}

export async function upsertAgencyVehicleCategory(
  agencyId: string,
  input: AgencyVehicleCategoryInput,
): Promise<AgencyVehicleCategoryRow | null> {
  const supabase = createClient()
  const { id, ...rest } = input
  const row = { ...rest, agency_id: agencyId }
  const q = id
    ? supabase.from('agency_vehicle_categories').update(row).eq('id', id).select().single()
    : supabase.from('agency_vehicle_categories').insert(row).select().single()
  const { data, error } = await q
  if (error) { console.error('[agencyVehicleCategoriesService] upsert', error.message); return null }
  return data as AgencyVehicleCategoryRow
}

export async function deleteAgencyVehicleCategory(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('agency_vehicle_categories').delete().eq('id', id)
  if (error) { console.error('[agencyVehicleCategoriesService] delete', error.message); return false }
  return true
}
