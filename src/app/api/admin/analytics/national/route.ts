import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin }  from '@/lib/requireAdmin'

export interface NationalStats {
  total:        number
  en_zone:      number
  hors_zone:    number
  pct_couvert:  number | null
  cities: {
    id:     string
    name:   string
    region: string
    status: string
    count:  number
  }[]
  regions: {
    region: string
    count:  number
  }[]
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  // Charger demandes et villes en parallèle
  const [reqRes, cityRes] = await Promise.all([
    supabaseAdmin.from('assistance_requests').select('id, city_id'),
    supabaseAdmin.from('deployment_cities').select('id, name, region, status'),
  ])

  if (reqRes.error || !reqRes.data)
    return NextResponse.json({ error: 'Impossible de charger les demandes' }, { status: 500 })
  if (cityRes.error || !cityRes.data)
    return NextResponse.json({ error: 'Impossible de charger les villes' }, { status: 500 })

  const requests  = reqRes.data  as { id: string; city_id: string | null }[]
  const cityRows  = cityRes.data as { id: string; name: string; region: string; status: string }[]

  const total      = requests.length
  const hors_zone  = requests.filter(r => !r.city_id).length
  const en_zone    = total - hors_zone
  const pct_couvert = total > 0 ? Math.round(en_zone / total * 100) : null

  const cityMap = new Map(cityRows.map(c => [c.id, c]))

  // Agrégation par ville
  const byCityId = new Map<string, { name: string; region: string; status: string; count: number }>()
  for (const r of requests) {
    if (!r.city_id) continue
    const city = cityMap.get(r.city_id)
    if (!city) continue
    if (!byCityId.has(r.city_id)) {
      byCityId.set(r.city_id, { name: city.name, region: city.region, status: city.status, count: 0 })
    }
    byCityId.get(r.city_id)!.count++
  }

  // Agrégation par région
  const byRegion = new Map<string, number>()
  for (const [, v] of byCityId) {
    byRegion.set(v.region, (byRegion.get(v.region) ?? 0) + v.count)
  }

  const cities = [...byCityId.entries()]
    .map(([id, v]) => ({ id, name: v.name, region: v.region, status: v.status, count: v.count }))
    .sort((a, b) => b.count - a.count)

  const regions = [...byRegion.entries()]
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({ total, en_zone, hors_zone, pct_couvert, cities, regions } satisfies NationalStats)
}
