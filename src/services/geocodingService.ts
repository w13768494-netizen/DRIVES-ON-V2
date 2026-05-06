export interface GeocodingResult {
  latitude:    number
  longitude:   number
  displayName: string
}

/**
 * Géocode une adresse via le proxy interne /api/geocode (Nominatim OSM).
 * Retourne null si l'adresse est introuvable ou en cas d'erreur réseau.
 *
 * → Remplacer par Google Maps / Mapbox quand nécessaire : changer uniquement ce fichier.
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const res = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`)
  if (!res.ok) return null

  const data = await res.json()
  if (!data || typeof data.latitude !== 'number') return null

  return data as GeocodingResult
}
