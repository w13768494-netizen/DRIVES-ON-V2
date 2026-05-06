import { MOCK_RENTAL_AGENCIES, CURRENT_LOUEUR_AGENCY_IDS } from '@/data/mockRentalAgencies'
import { MOCK_AGENCY_SERVICES } from '@/data/mockAgencyServices'
import { MOCK_VEHICLE_CATEGORY_OFFERS } from '@/data/mockVehicleCategoryOffers'
import type { RentalAgency } from '@/types/rentalAgency'
import type { AgencyService } from '@/types/agencyService'
import type { VehicleCategoryOffer } from '@/types/vehicleCategory'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

// ── Agences ───────────────────────────────────────────────────────────────────

export async function getAgencyById(id: string): Promise<RentalAgency | null> {
  await delay(200)
  return MOCK_RENTAL_AGENCIES.find(a => a.id === id) ?? null
}

export async function getAgenciesByBrand(brandId: string): Promise<RentalAgency[]> {
  await delay(300)
  return MOCK_RENTAL_AGENCIES.filter(a => a.brandId === brandId)
}

export async function createAgency(
  data: Omit<RentalAgency, 'id'>,
): Promise<RentalAgency> {
  await delay(600)
  const agency: RentalAgency = { ...data, id: genId('agency') }
  MOCK_RENTAL_AGENCIES.push(agency)
  CURRENT_LOUEUR_AGENCY_IDS.push(agency.id)
  return agency
}

export async function updateAgency(
  id: string,
  patch: Partial<Omit<RentalAgency, 'id' | 'brandId'>>,
): Promise<RentalAgency | null> {
  await delay(400)
  const idx = MOCK_RENTAL_AGENCIES.findIndex(a => a.id === id)
  if (idx === -1) return null
  const updated = { ...MOCK_RENTAL_AGENCIES[idx], ...patch }
  MOCK_RENTAL_AGENCIES[idx] = updated
  return updated
}

export async function deleteAgency(id: string): Promise<void> {
  await delay(400)
  const idx = MOCK_RENTAL_AGENCIES.findIndex(a => a.id === id)
  if (idx !== -1) MOCK_RENTAL_AGENCIES.splice(idx, 1)
  const idIdx = CURRENT_LOUEUR_AGENCY_IDS.indexOf(id)
  if (idIdx !== -1) CURRENT_LOUEUR_AGENCY_IDS.splice(idIdx, 1)
  // Supprimer aussi les services et offres liés
  const svcIdxs = MOCK_AGENCY_SERVICES.reduce<number[]>((acc, s, i) => {
    if (s.agencyId === id) acc.push(i)
    return acc
  }, [])
  for (let i = svcIdxs.length - 1; i >= 0; i--) MOCK_AGENCY_SERVICES.splice(svcIdxs[i], 1)
  const offerIdxs = MOCK_VEHICLE_CATEGORY_OFFERS.reduce<number[]>((acc, o, i) => {
    if (o.agencyId === id) acc.push(i)
    return acc
  }, [])
  for (let i = offerIdxs.length - 1; i >= 0; i--) MOCK_VEHICLE_CATEGORY_OFFERS.splice(offerIdxs[i], 1)
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function getServicesByAgency(agencyId: string): Promise<AgencyService[]> {
  await delay(200)
  return MOCK_AGENCY_SERVICES.filter(s => s.agencyId === agencyId)
}

export async function createService(
  data: Omit<AgencyService, 'id'>,
): Promise<AgencyService> {
  await delay(400)
  const service: AgencyService = { ...data, id: genId('svc') }
  MOCK_AGENCY_SERVICES.push(service)
  return service
}

export async function updateAgencyService(
  serviceId: string,
  patch: Partial<AgencyService>,
): Promise<AgencyService | null> {
  await delay(300)
  const idx = MOCK_AGENCY_SERVICES.findIndex(s => s.id === serviceId)
  if (idx === -1) return null
  const updated = { ...MOCK_AGENCY_SERVICES[idx], ...patch }
  MOCK_AGENCY_SERVICES[idx] = updated
  return updated
}

export async function deleteService(serviceId: string): Promise<void> {
  await delay(300)
  const idx = MOCK_AGENCY_SERVICES.findIndex(s => s.id === serviceId)
  if (idx !== -1) MOCK_AGENCY_SERVICES.splice(idx, 1)
}

// ── Catégories de véhicules ───────────────────────────────────────────────────

export async function getCategoryOffersByAgency(agencyId: string): Promise<VehicleCategoryOffer[]> {
  await delay(200)
  return MOCK_VEHICLE_CATEGORY_OFFERS.filter(o => o.agencyId === agencyId)
}

export async function createCategoryOffer(
  data: Omit<VehicleCategoryOffer, 'id'>,
): Promise<VehicleCategoryOffer> {
  await delay(400)
  const offer: VehicleCategoryOffer = { ...data, id: genId('vco') }
  MOCK_VEHICLE_CATEGORY_OFFERS.push(offer)
  return offer
}

export async function updateCategoryOffer(
  offerId: string,
  patch: Partial<VehicleCategoryOffer>,
): Promise<VehicleCategoryOffer | null> {
  await delay(300)
  const idx = MOCK_VEHICLE_CATEGORY_OFFERS.findIndex(o => o.id === offerId)
  if (idx === -1) return null
  const updated = { ...MOCK_VEHICLE_CATEGORY_OFFERS[idx], ...patch }
  MOCK_VEHICLE_CATEGORY_OFFERS[idx] = updated
  return updated
}

export async function deleteCategoryOffer(offerId: string): Promise<void> {
  await delay(300)
  const idx = MOCK_VEHICLE_CATEGORY_OFFERS.findIndex(o => o.id === offerId)
  if (idx !== -1) MOCK_VEHICLE_CATEGORY_OFFERS.splice(idx, 1)
}
