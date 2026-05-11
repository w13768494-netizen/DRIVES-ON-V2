import { createClient } from '@/lib/supabase/client'

export interface RentalAgencyRow {
  id:                       string
  owner_id:                 string
  company_name:             string | null
  agency_name:              string
  email:                    string | null
  phone:                    string | null
  address:                  string | null
  city:                     string | null
  postal_code:              string | null
  lat:                      number | null
  lng:                      number | null
  service_radius_km:        number | null
  contact_name:             string | null
  is_available:             boolean
  opening_hours_weekdays:   string | null
  opening_hours_saturday:   string | null
  opening_hours_sunday:     string | null
  active:                   boolean
  created_at:               string
  external_id:              string | null
}

/** Retourne les agences du loueur connecté (RLS filtre par owner_id = auth.uid()). */
export async function getMyAgencies(): Promise<RentalAgencyRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('rental_agencies')
    .select('*')
    .eq('active', true)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[rentalAgencyService] getMyAgencies', error.message)
    return []
  }
  return (data as RentalAgencyRow[]) ?? []
}

export type AgencyInput = Pick<
  RentalAgencyRow,
  'agency_name' | 'company_name' | 'email' | 'phone' |
  'address' | 'city' | 'postal_code' | 'service_radius_km' |
  'contact_name' | 'is_available' |
  'opening_hours_weekdays' | 'opening_hours_saturday' | 'opening_hours_sunday'
>

async function geocodeAgencyAddress(
  address: string | null,
  city:    string | null,
  postal:  string | null,
): Promise<{ lat: number; lng: number } | null> {
  const q = [address, postal, city].filter(Boolean).join(', ')
  if (!q) return null
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
    if (!res.ok) return null
    const data = (await res.json()) as { latitude: number; longitude: number } | null
    if (!data) return null
    return { lat: data.latitude, lng: data.longitude }
  } catch {
    return null
  }
}

export async function createAgency(input: AgencyInput): Promise<RentalAgencyRow | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const coords = await geocodeAgencyAddress(input.address, input.city, input.postal_code)
  const { data, error } = await supabase
    .from('rental_agencies')
    .insert({ ...input, owner_id: user.id, ...(coords ?? {}) })
    .select()
    .single()
  if (error) { console.error('[rentalAgencyService] createAgency', error.message); return null }
  return data as RentalAgencyRow
}

export async function updateAgency(id: string, patch: Partial<AgencyInput>): Promise<RentalAgencyRow | null> {
  const supabase = createClient()
  const hasLocation = patch.address !== undefined || patch.city !== undefined || patch.postal_code !== undefined
  const coords = hasLocation
    ? await geocodeAgencyAddress(patch.address ?? null, patch.city ?? null, patch.postal_code ?? null)
    : null
  const { data, error } = await supabase
    .from('rental_agencies')
    .update({ ...patch, ...(coords ?? {}) })
    .eq('id', id)
    .select()
    .single()
  if (error) { console.error('[rentalAgencyService] updateAgency', error.message); return null }
  return data as RentalAgencyRow
}

export async function deleteAgency(id: string): Promise<boolean> {
  const supabase = createClient()
  const { error } = await supabase
    .from('rental_agencies')
    .update({ active: false })
    .eq('id', id)
  if (error) { console.error('[rentalAgencyService] deleteAgency', error.message); return false }
  return true
}
