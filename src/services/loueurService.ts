import {
  getAllRequests, getRequestById, updateRequest,
  addTransferToRequest, lockRequestAfterConfirmation, confirmByAssisteur,
} from '@/services/requestService'
import { getMyAgencies, type RentalAgencyRow } from '@/services/rentalAgencyService'
import { MOCK_RENTAL_AGENCIES }    from '@/data/mockRentalAgencies'
import { calculateDistance }       from '@/lib/distance'
import type { AssistanceRequest }  from '@/types/request'
import type { ReceivedRequest, LoueurAction } from '@/types/loueur'
import type { RentalAgency }       from '@/types/rentalAgency'
import type { RequestTimelineEvent } from '@/types/requestTimeline'

function generateEvtId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

/** Clé utilisée pour référencer l'agence dans les demandes : external_id si défini, sinon UUID Supabase */
function agencyKey(row: RentalAgencyRow): string {
  return row.external_id ?? row.id
}

/** Trouve l'agence du loueur qui correspond à une demande (par id UUID ou external_id) */
function findMatchingAgency(
  request:  AssistanceRequest,
  agencies: RentalAgencyRow[],
): RentalAgencyRow | undefined {
  const ids = new Set([
    ...(request.assignedAgencyIds ?? []),
    ...(request.assignedAgencyId ? [request.assignedAgencyId] : []),
  ])
  return agencies.find(a =>
    ids.has(a.id) || (a.external_id !== null && ids.has(a.external_id))
  )
}

function buildReceivedRequest(
  request: AssistanceRequest,
  agency:  RentalAgencyRow,
): ReceivedRequest {
  const distanceKm =
    request.location.latitude && request.location.longitude && agency.lat && agency.lng
      ? calculateDistance(
          agency.lat, agency.lng,
          request.location.latitude, request.location.longitude,
        )
      : 0
  return { ...request, distanceKm, agencyId: agencyKey(agency) }
}

function rowToRentalAgency(row: RentalAgencyRow): RentalAgency {
  return {
    id:              agencyKey(row),
    brandId:         '',
    name:            row.agency_name,
    address:         row.address ?? '',
    city:            row.city ?? '',
    postalCode:      row.postal_code ?? '',
    latitude:        row.lat ?? 0,
    longitude:       row.lng ?? 0,
    serviceRadiusKm: row.service_radius_km ?? 0,
    phone:           row.phone ?? '',
    email:           row.email ?? '',
    contactName:     row.contact_name ?? '',
    isAvailable:     row.is_available,
    openingHours: {
      weekdays: row.opening_hours_weekdays ?? '',
      saturday: row.opening_hours_saturday,
      sunday:   row.opening_hours_sunday,
    },
  }
}

/**
 * Demandes assignées aux agences du loueur.
 * Prend les agences en paramètre pour éviter un double appel quand le dashboard les a déjà.
 */
export async function getReceivedRequests(agencies: RentalAgencyRow[]): Promise<ReceivedRequest[]> {
  if (agencies.length === 0) return []
  const allRequests = await getAllRequests()
  return allRequests.flatMap(r => {
    const agency = findMatchingAgency(r, agencies)
    return agency ? [buildReceivedRequest(r, agency)] : []
  })
}

export async function getReceivedRequestById(id: string): Promise<ReceivedRequest | null> {
  const [myAgencies, request] = await Promise.all([getMyAgencies(), getRequestById(id)])
  if (!request) return null
  const agency = findMatchingAgency(request, myAgencies)
  return agency ? buildReceivedRequest(request, agency) : null
}

export async function respondToRequest(
  requestId: string,
  action:    LoueurAction,
): Promise<AssistanceRequest | null> {
  const [myAgencies, request] = await Promise.all([getMyAgencies(), getRequestById(requestId)])
  if (!request) return null

  const agency = findMatchingAgency(request, myAgencies)
  const aKey   = agency ? agencyKey(agency) : ''
  const aName  = agency?.agency_name ?? ''

  if (action.type === 'transferer') {
    if (!action.toAgencyId || !action.toAgencyName) return null
    return addTransferToRequest(requestId, {
      fromAgencyId:   aKey,
      fromAgencyName: aName,
      toAgencyId:     action.toAgencyId,
      toAgencyName:   action.toAgencyName,
      reason:         action.message,
      proposedAt:     new Date(),
      status:         'en_attente',
    })
  }

  if (action.type === 'accepter') {
    const loueurResponse = {
      agencyId:     aKey,
      agencyName:   aName,
      pricePerDay:  action.pricePerDay,
      vehicleModel: action.vehicleModel,
      message:      action.message,
      respondedAt:  new Date(),
    }
    const { request: accepted } = await lockRequestAfterConfirmation(
      requestId, aKey, aName, loueurResponse,
    )
    if (!accepted) return null
    const confirmed = await confirmByAssisteur(requestId)
    return confirmed ?? accepted
  }

  if (action.type === 'refuser') {
    const evt: RequestTimelineEvent = {
      id: generateEvtId(), type: 'refus', at: new Date(), byRole: 'loueur',
      agencyId: aKey, message: action.message,
    }
    return updateRequest(requestId, {
      status: 'refusee',
      loueurResponse: {
        agencyId:    aKey,
        agencyName:  aName,
        message:     action.message,
        respondedAt: new Date(),
      },
      timeline: [...request.timeline, evt],
    })
  }

  return null
}

export async function getCurrentAgencies(): Promise<RentalAgency[]> {
  const rows = await getMyAgencies()
  return rows.map(rowToRentalAgency)
}

/** Utilisé par la page assisteur pour afficher les détails d'une agence loueur. */
export async function getRentalAgencyById(id: string): Promise<RentalAgency | null> {
  return MOCK_RENTAL_AGENCIES.find(a => a.id === id) ?? null
}

export async function getNearbyAgenciesForTransfer(requestId: string): Promise<RentalAgency[]> {
  const [myAgencies, request] = await Promise.all([getMyAgencies(), getRequestById(requestId)])
  if (!request) return []

  const myKeys = new Set(
    myAgencies.flatMap(a => [a.id, ...(a.external_id ? [a.external_id] : [])])
  )

  return MOCK_RENTAL_AGENCIES
    .filter(a => !myKeys.has(a.id) && a.isAvailable)
    .map(a => ({
      ...a,
      distanceKm: calculateDistance(
        a.latitude, a.longitude,
        request.location.latitude, request.location.longitude,
      ),
    }))
}
