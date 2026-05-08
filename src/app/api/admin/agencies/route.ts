import { createClient }                   from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin }                   from '@/lib/requireAdmin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export interface AdminAgency {
  id:               string
  agency_name:      string
  contact_name:     string | null
  email:            string | null
  phone:            string | null
  city:             string | null
  is_available:     boolean
  service_radius_km: number | null
  categories:       { category: string; available: boolean }[]
  services:         { type: string; available: boolean }[]
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const city = new URL(request.url).searchParams.get('city')

  let query = supabaseAdmin
    .from('rental_agencies')
    .select('id, agency_name, contact_name, email, phone, city, is_available, service_radius_km')
    .eq('active', true)
    .order('agency_name')

  if (city) query = query.ilike('city', city)

  const { data: agencies, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const agencyList = (agencies ?? []) as Omit<AdminAgency, 'categories' | 'services'>[]

  if (agencyList.length === 0) {
    return NextResponse.json([])
  }

  const agencyIds = agencyList.map(a => a.id)

  const [catsRes, svcsRes] = await Promise.all([
    supabaseAdmin
      .from('agency_vehicle_categories')
      .select('agency_id, category, available')
      .in('agency_id', agencyIds),
    supabaseAdmin
      .from('agency_services')
      .select('agency_id, type, available')
      .in('agency_id', agencyIds),
  ])

  const catsByAgency = new Map<string, { category: string; available: boolean }[]>()
  for (const cat of (catsRes.data ?? [])) {
    if (!catsByAgency.has(cat.agency_id)) catsByAgency.set(cat.agency_id, [])
    catsByAgency.get(cat.agency_id)!.push({ category: cat.category, available: cat.available })
  }

  const svcsByAgency = new Map<string, { type: string; available: boolean }[]>()
  for (const svc of (svcsRes.data ?? [])) {
    if (!svcsByAgency.has(svc.agency_id)) svcsByAgency.set(svc.agency_id, [])
    svcsByAgency.get(svc.agency_id)!.push({ type: svc.type, available: svc.available })
  }

  const enriched: AdminAgency[] = agencyList.map(a => ({
    ...a,
    categories: catsByAgency.get(a.id) ?? [],
    services:   svcsByAgency.get(a.id) ?? [],
  }))

  return NextResponse.json(enriched)
}
