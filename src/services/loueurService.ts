import {
  getAllRequests, getRequestById, updateRequest,
  addTransferToRequest, lockRequestAfterConfirmation, confirmByAssisteur,
} from '@/services/requestService'
import { MOCK_RENTAL_AGENCIES, CURRENT_LOUEUR_AGENCY_IDS } from '@/data/mockRentalAgencies'
import { MOCK_RENTAL_BRANDS, CURRENT_BRAND_ID }            from '@/data/mockRentalBrands'
import { calculateDistance }   from '@/lib/distance'
import type { AssistanceRequest } from '@/types/request'
import type { ReceivedRequest, LoueurAction } from '@/types/loueur'
import type { RentalAgency }   from '@/types/rentalAgency'
import type { RentalBrand }    from '@/types/rentalBrand'
import type { RequestTimelineEvent } from '@/types/requestTimeline'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function generateEvtId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

function currentAgencies() {
  return MOCK_RENTAL_AGENCIES.filter(a => CURRENT_LOUEUR_AGENCY_IDS.includes(a.id))
}

function toReceivedRequest(request: AssistanceRequest): ReceivedRequest | null {
  const agency = currentAgencies().find(a =>
    a.id === request.assignedAgencyId ||
    request.assignedAgencyIds?.includes(a.id)
  )
  if (!agency) return null

  const distanceKm = request.location.latitude && request.location.longitude
    ? calculateDistance(
        agency.latitude, agency.longitude,
        request.location.latitude, request.location.longitude,
      )
    : 0

  return { ...request, distanceKm, agencyId: agency.id }
}

export async function getReceivedRequests(): Promise<ReceivedRequest[]> {
  const allRequests = await getAllRequests()
  return allRequests.flatMap(r => {
    const rr = toReceivedRequest(r)
    return rr ? [rr] : []
  })
}

export async function getReceivedRequestById(id: string): Promise<ReceivedRequest | null> {
  const request = await getRequestById(id)
  if (!request) return null
  return toReceivedRequest(request)
}

export async function respondToRequest(
  requestId: string,
  action: LoueurAction,
): Promise<AssistanceRequest | null> {
  await delay(600)

  if (action.type === 'transferer') {
    if (!action.toAgencyId || !action.toAgencyName) return null
    const agency = currentAgencies()[0]
    return addTransferToRequest(requestId, {
      fromAgencyId:   agency?.id   ?? CURRENT_LOUEUR_AGENCY_IDS[0],
      fromAgencyName: agency?.name ?? 'Agence',
      toAgencyId:     action.toAgencyId,
      toAgencyName:   action.toAgencyName,
      reason:         action.message,
      proposedAt:     new Date(),
      status:         'en_attente',
    })
  }

  if (action.type === 'accepter') {
    const brand      = MOCK_RENTAL_BRANDS.find(b => b.id === CURRENT_BRAND_ID)
    const agency     = currentAgencies()[0]
    const agencyId   = agency?.id   ?? CURRENT_LOUEUR_AGENCY_IDS[0]
    const agencyName = agency?.name ?? brand?.name ?? 'Loueur'

    const loueurResponse = {
      agencyId,
      agencyName,
      pricePerDay:  action.pricePerDay,
      vehicleModel: action.vehicleModel,
      message:      action.message,
      respondedAt:  new Date(),
    }

    const { request: accepted } = await lockRequestAfterConfirmation(
      requestId, agencyId, agencyName, loueurResponse,
    )
    if (!accepted) return null
    const confirmed = await confirmByAssisteur(requestId)
    return confirmed ?? accepted
  }

  if (action.type === 'refuser') {
    const agency = currentAgencies()[0]
    const request = await getRequestById(requestId)
    if (!request) return null

    const evt: RequestTimelineEvent = {
      id: generateEvtId(), type: 'refus', at: new Date(), byRole: 'loueur',
      agencyId: agency?.id, message: action.message,
    }

    return updateRequest(requestId, {
      status: 'refusee',
      loueurResponse: {
        agencyId:    agency?.id ?? CURRENT_LOUEUR_AGENCY_IDS[0],
        agencyName:  agency?.name ?? 'Loueur',
        message:     action.message,
        respondedAt: new Date(),
      },
      timeline: [...request.timeline, evt],
    })
  }

  return null
}

export async function getCurrentBrand(): Promise<RentalBrand | null> {
  await delay(200)
  return MOCK_RENTAL_BRANDS.find(b => b.id === CURRENT_BRAND_ID) ?? null
}

export async function getCurrentAgencies(): Promise<RentalAgency[]> {
  await delay(200)
  return currentAgencies()
}

export async function getRentalAgencyById(id: string): Promise<RentalAgency | null> {
  await delay(150)
  return MOCK_RENTAL_AGENCIES.find(a => a.id === id) ?? null
}

export async function getNearbyAgenciesForTransfer(
  requestId: string,
): Promise<RentalAgency[]> {
  await delay(200)
  const request = await getRequestById(requestId)
  if (!request) return []

  return MOCK_RENTAL_AGENCIES.filter(a =>
    !CURRENT_LOUEUR_AGENCY_IDS.includes(a.id) && a.isAvailable
  ).map(a => ({
    ...a,
    distanceKm: calculateDistance(
      a.latitude, a.longitude,
      request.location.latitude, request.location.longitude,
    ),
  }))
}
