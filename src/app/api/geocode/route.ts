import { NextRequest, NextResponse } from 'next/server'
import { requireAuth }              from '@/lib/requireAuth'

export interface GeocodeResult {
  latitude:    number
  longitude:   number
  displayName: string
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Paramètre q manquant' }, { status: 400 })

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=json&q=${encodeURIComponent(q)}&countrycodes=fr&limit=1&addressdetails=0`

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent':      'DriveOn/1.0 dev',
        'Accept-Language': 'fr',
      },
      next: { revalidate: 0 },
    })
  } catch {
    return NextResponse.json({ error: 'Nominatim injoignable' }, { status: 502 })
  }

  if (!res.ok) return NextResponse.json({ error: 'Erreur Nominatim' }, { status: 502 })

  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json(null)
  }

  const { lat, lon, display_name } = data[0]
  return NextResponse.json({
    latitude:    parseFloat(lat),
    longitude:   parseFloat(lon),
    displayName: display_name as string,
  } satisfies GeocodeResult)
}
