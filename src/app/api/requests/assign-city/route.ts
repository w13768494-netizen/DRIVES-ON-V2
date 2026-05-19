import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { createClient }                   from '@/lib/supabase/server'

// ── Haversine (km) ────────────────────────────────────────────────────────────

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R    = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a    = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1 — Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  // 2 — Body
  let requestId: string, latitude: number, longitude: number
  try {
    const body = await request.json()
    requestId  = body.requestId
    latitude   = body.latitude
    longitude  = body.longitude
    if (!requestId || typeof latitude !== 'number' || typeof longitude !== 'number')
      throw new Error()
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  // 3 — Load all deployment cities (all statuses — analytics inclut planned/deploying)
  const { data: cities, error: cityErr } = await supabaseAdmin
    .from('deployment_cities')
    .select('id, latitude, longitude, cover_radius_km')

  if (cityErr || !cities)
    return NextResponse.json({ error: 'Erreur villes' }, { status: 500 })

  // 4 — Nearest city within its cover_radius_km
  let bestId:   string | null = null
  let bestDist: number        = Infinity

  for (const city of cities as { id: string; latitude: number; longitude: number; cover_radius_km: number }[]) {
    const dist = haversine(latitude, longitude, city.latitude, city.longitude)
    if (dist <= city.cover_radius_km && dist < bestDist) {
      bestDist = dist
      bestId   = city.id
    }
  }

  if (!bestId) return NextResponse.json({ ok: true, city_id: null })

  // 5 — Atomic update — ownership guard via created_by_user_id
  const { error: upErr } = await supabaseAdmin
    .from('assistance_requests')
    .update({ city_id: bestId })
    .eq('id', requestId)
    .eq('created_by_user_id', user.id)

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, city_id: bestId })
}
