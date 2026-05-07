import { createClient } from '@/lib/supabase/client'
import type { AgencyServiceType, ServicePriceType } from '@/types/agencyService'

export interface AgencyServiceRow {
  id:         string
  agency_id:  string
  type:       AgencyServiceType
  label:      string | null
  available:  boolean
  price_type: ServicePriceType
  price:      number | null
  comment:    string | null
  created_at: string
}

export type AgencyServiceInput = {
  id?:        string
  type:       AgencyServiceType
  label?:     string | null
  available:  boolean
  price_type: ServicePriceType
  price?:     number | null
  comment?:   string | null
}

export async function getAgencyServices(agencyId: string): Promise<AgencyServiceRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('agency_services')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true })
  if (error) { console.error('[agencyServicesService] getAgencyServices', error.message); return [] }
  return (data as AgencyServiceRow[]) ?? []
}

export async function upsertAgencyService(
  agencyId: string,
  input: AgencyServiceInput,
): Promise<AgencyServiceRow | null> {
  const supabase = createClient()
  const { id, ...rest } = input
  const row = { ...rest, agency_id: agencyId }
  const q = id
    ? supabase.from('agency_services').update(row).eq('id', id).select().single()
    : supabase.from('agency_services').insert(row).select().single()
  const { data, error } = await q
  if (error) { console.error('[agencyServicesService] upsert', error.message); return null }
  return data as AgencyServiceRow
}

export async function deleteAgencyService(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase.from('agency_services').delete().eq('id', id)
  if (error) { console.error('[agencyServicesService] delete', error.message); return false }
  return true
}
