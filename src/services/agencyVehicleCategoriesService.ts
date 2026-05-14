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
  // Grille tarifaire par tranche
  modele_equivalent?:  string | null
  tarif_1_4?:          number | null
  tarif_5_7?:          number | null
  tarif_8_14?:         number | null
  tarif_15_21?:        number | null
  tarif_22_29?:        number | null
  forfait_30_jours?:   number | null
  actif?:              boolean
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

export interface LoueurTarifInput {
  id?:                  string
  category:             VehicleCategoryType
  group_type:           VehicleGroupType
  modele_equivalent?:   string | null
  tarif_1_4?:           number | null
  tarif_5_7?:           number | null
  tarif_8_14?:          number | null
  tarif_15_21?:         number | null
  tarif_22_29?:         number | null
  forfait_30_jours?:    number | null
  included_km_per_day?: number
  extra_km_price?:      number
  actif:                boolean
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

export async function saveLoueurTarifs(
  agencyId: string,
  input: LoueurTarifInput,
): Promise<AgencyVehicleCategoryRow | null> {
  const supabase = createClient()
  const patch = {
    modele_equivalent:   input.modele_equivalent   ?? null,
    tarif_1_4:           input.tarif_1_4           ?? null,
    tarif_5_7:           input.tarif_5_7           ?? null,
    tarif_8_14:          input.tarif_8_14          ?? null,
    tarif_15_21:         input.tarif_15_21         ?? null,
    tarif_22_29:         input.tarif_22_29         ?? null,
    forfait_30_jours:    input.forfait_30_jours    ?? null,
    included_km_per_day: input.included_km_per_day ?? 0,
    extra_km_price:      input.extra_km_price      ?? 0,
    actif:               input.actif,
  }

  if (input.id) {
    // Row exists — UPDATE only tarif fields, sans toucher daily_rate / packages / stock
    const { data, error } = await supabase
      .from('agency_vehicle_categories')
      .update(patch)
      .eq('id', input.id)
      .select()
      .single()
    if (error) { console.error('[saveLoueurTarifs] update', error.message); return null }
    return data as AgencyVehicleCategoryRow
  }

  // Première saisie — INSERT avec valeurs par défaut pour les champs profil
  const { data, error } = await supabase
    .from('agency_vehicle_categories')
    .insert({
      agency_id:      agencyId,
      category:       input.category,
      group_type:     input.group_type,
      available:      true,
      stock_estimate: 0,
      daily_rate:     input.tarif_1_4 ?? 0,
      deposit:        0,
      packages:       [],
      ...patch,
    })
    .select()
    .single()
  if (error) { console.error('[saveLoueurTarifs] insert', error.message); return null }
  return data as AgencyVehicleCategoryRow
}
