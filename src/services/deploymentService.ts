import { supabase } from '@/lib/supabaseClient'
import { rowToDeploymentCity } from '@/types/deploymentCity'
import type { DeploymentCity, DeploymentStatus } from '@/types/deploymentCity'

const USE_SUPABASE =
  (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('http://')
  ) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('VOTRE')

export async function getAllDeploymentCities(): Promise<DeploymentCity[]> {
  if (!USE_SUPABASE) return []

  const { data, error } = await supabase
    .from('deployment_cities')
    .select('*')
    .order('region', { ascending: true })
    .order('name',   { ascending: true })

  if (error) {
    console.error('[deploymentService] getAllDeploymentCities:', error.message)
    return []
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => rowToDeploymentCity(row))
}

/**
 * Retourne les IDs des villes actives pour filtrer le matching.
 * Retourne null si Supabase n'est pas configuré (pas de filtre appliqué).
 */
export async function getActiveCityIds(): Promise<string[] | null> {
  if (!USE_SUPABASE) return null

  const { data, error } = await supabase
    .from('deployment_cities')
    .select('id')
    .eq('status', 'active')

  if (error) {
    console.error('[deploymentService] getActiveCityIds:', error.message)
    return null
  }

  return (data ?? []).map((r: { id: string }) => r.id)
}

export type DeploymentZone = { latitude: number; longitude: number; radiusKm: number }

/**
 * Zones de couverture des villes actives, pour le gate géographique du matching.
 * Retourne null si Supabase non configuré OU aucune ville active (pas de gate appliqué).
 */
export async function getActiveDeploymentZones(): Promise<DeploymentZone[] | null> {
  if (!USE_SUPABASE) return null

  const { data, error } = await supabase
    .from('deployment_cities')
    .select('latitude, longitude, cover_radius_km')
    .eq('status', 'active')

  if (error) {
    console.error('[deploymentService] getActiveDeploymentZones:', error.message)
    return null
  }
  if (!data || data.length === 0) return null

  return data.map((c: { latitude: number; longitude: number; cover_radius_km: number }) => ({
    latitude:  c.latitude,
    longitude: c.longitude,
    radiusKm:  c.cover_radius_km,
  }))
}

export async function updateDeploymentCityStatus(
  id: string,
  status: DeploymentStatus,
): Promise<void> {
  const res = await fetch(`/api/admin/deployment-cities/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Erreur serveur')
  }
}
