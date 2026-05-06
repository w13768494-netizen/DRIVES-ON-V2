import { supabase } from '@/lib/supabaseClient'
import { rowToDeploymentCity } from '@/types/deploymentCity'
import type { DeploymentCity, DeploymentStatus } from '@/types/deploymentCity'

const USE_SUPABASE =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') &&
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
