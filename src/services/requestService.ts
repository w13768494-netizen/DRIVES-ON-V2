import { supabase }       from '@/lib/supabaseClient'
import { MOCK_REQUESTS }  from '@/data/mockRequests'
import type {
  AssistanceRequest, RequestFormInput, RequestStatus,
  LoueurResponse, CoverageInfo, Sinistre, BreakdownLocation,
} from '@/types/request'
import type { VehicleCategoryType, VehicleGroupType } from '@/types/vehicleCategory'
import type { AgencyServiceType } from '@/types/agencyService'
import type { RequestTransfer }     from '@/types/requestTransfer'
import type { RequestTimelineEvent } from '@/types/requestTimeline'
import type { ExtensionRequest }    from '@/types/requestExtension'
import type { PricingOption }       from '@/lib/extensionPricing'
import { getSession }               from './currentSessionService'

// ── Feature flag ──────────────────────────────────────────────────────────────

const USE_SUPABASE =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://') &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('VOTRE')

// ── DB row type (snake_case, dates as ISO strings) ────────────────────────────

interface DbRow {
  id:                    string
  status:                string
  request_type:          string
  dossier_number:        string
  reference_number:      string | null
  sinistre:              Sinistre
  location:              BreakdownLocation
  vehicle_group:         string | null
  vehicle_category:      string
  duration_days:         number
  max_extension_days:    number | null
  date_needed:           string
  coverage:              CoverageInfo
  requested_services:    string[] | null
  target_price_per_day:  number | null
  notes:                 string | null
  assigned_agency_id:    string | null
  assigned_agency_ids:   string[] | null
  confirmed_agency_id:   string | null
  confirmed_agency_name: string | null
  confirmed_at:          string | null
  returned_at:           string | null
  loueur_response:       (LoueurResponse & { respondedAt: string }) | null
  counter_offer_price:   number | null
  counter_offer_message: string | null
  transfers:             (RequestTransfer & { proposedAt: string; validatedAt?: string })[]
  timeline:              (RequestTimelineEvent & { at: string })[]
  extensions:            ExtensionRequest[] | null
  created_at:            string
  created_by_user_id:    string | null
  created_by_name:       string | null
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function rowToRequest(row: DbRow): AssistanceRequest {
  return {
    id:                  row.id,
    status:              row.status as RequestStatus,
    requestType:         row.request_type as 'immediate' | 'planifiee',
    dossierNumber:       row.dossier_number,
    referenceNumber:     row.reference_number ?? undefined,
    sinistre:            row.sinistre,
    location:            row.location,
    vehicleGroup:        (row.vehicle_group ?? 'tourisme') as VehicleGroupType,
    vehicleCategory:     row.vehicle_category as VehicleCategoryType,
    dateNeeded:          new Date(row.date_needed),
    durationDays:        row.duration_days,
    maxExtensionDays:    row.max_extension_days ?? undefined,
    coverage:            row.coverage,
    requestedServices:   (row.requested_services ?? []) as AgencyServiceType[],
    targetPricePerDay:   row.target_price_per_day ?? undefined,
    notes:               row.notes ?? undefined,
    assignedAgencyId:    row.assigned_agency_id  ?? undefined,
    assignedAgencyIds:   row.assigned_agency_ids ?? undefined,
    confirmedAgencyId:   row.confirmed_agency_id  ?? undefined,
    confirmedAgencyName: row.confirmed_agency_name ?? undefined,
    confirmedAt:         row.confirmed_at ? new Date(row.confirmed_at) : undefined,
    returnedAt:          row.returned_at  ? new Date(row.returned_at)  : undefined,
    loueurResponse:      row.loueur_response
      ? { ...row.loueur_response, respondedAt: new Date(row.loueur_response.respondedAt) }
      : undefined,
    counterOfferPrice:   row.counter_offer_price   ?? undefined,
    counterOfferMessage: row.counter_offer_message ?? undefined,
    transfers: (row.transfers ?? []).map(t => ({
      ...t,
      proposedAt:  new Date(t.proposedAt),
      validatedAt: t.validatedAt ? new Date(t.validatedAt) : undefined,
    })),
    timeline: (row.timeline ?? []).map(e => ({ ...e, at: new Date(e.at) })),
    extensions:      row.extensions ?? undefined,
    createdAt:       new Date(row.created_at),
    createdByUserId: row.created_by_user_id ?? 'unknown',
    createdByName:   row.created_by_name    ?? 'Inconnu',
  }
}

function requestToRow(r: AssistanceRequest): Record<string, unknown> {
  return {
    id:                   r.id,
    status:               r.status,
    request_type:         r.requestType,
    dossier_number:       r.dossierNumber,
    reference_number:     r.referenceNumber    ?? null,
    sinistre:             r.sinistre,
    location:             r.location,
    vehicle_group:        r.vehicleGroup,
    vehicle_category:     r.vehicleCategory,
    date_needed:          r.dateNeeded.toISOString(),
    duration_days:        r.durationDays,
    max_extension_days:   r.maxExtensionDays   ?? null,
    coverage:             r.coverage,
    requested_services:   r.requestedServices  ?? [],
    target_price_per_day: r.targetPricePerDay  ?? null,
    notes:                r.notes              ?? null,
    assigned_agency_id:   r.assignedAgencyId   ?? null,
    assigned_agency_ids:  r.assignedAgencyIds  ?? null,
    confirmed_agency_id:  r.confirmedAgencyId  ?? null,
    confirmed_agency_name:r.confirmedAgencyName ?? null,
    confirmed_at:         r.confirmedAt?.toISOString()  ?? null,
    returned_at:          r.returnedAt?.toISOString()   ?? null,
    loueur_response:      r.loueurResponse ?? null,
    counter_offer_price:  r.counterOfferPrice   ?? null,
    counter_offer_message:r.counterOfferMessage ?? null,
    transfers:            r.transfers,
    timeline:             r.timeline,
    extensions:           r.extensions ?? null,
    created_at:           r.createdAt.toISOString(),
    created_by_user_id:   r.createdByUserId,
    created_by_name:      r.createdByName,
  }
}

function patchToRow(patch: Partial<AssistanceRequest>): Record<string, unknown> {
  const map: Record<string, string> = {
    status:              'status',
    requestType:         'request_type',
    dossierNumber:       'dossier_number',
    referenceNumber:     'reference_number',
    sinistre:            'sinistre',
    location:            'location',
    vehicleGroup:        'vehicle_group',
    vehicleCategory:     'vehicle_category',
    dateNeeded:          'date_needed',
    durationDays:        'duration_days',
    maxExtensionDays:    'max_extension_days',
    coverage:            'coverage',
    requestedServices:   'requested_services',
    targetPricePerDay:   'target_price_per_day',
    notes:               'notes',
    assignedAgencyId:    'assigned_agency_id',
    assignedAgencyIds:   'assigned_agency_ids',
    confirmedAgencyId:   'confirmed_agency_id',
    confirmedAgencyName: 'confirmed_agency_name',
    confirmedAt:         'confirmed_at',
    returnedAt:          'returned_at',
    loueurResponse:      'loueur_response',
    counterOfferPrice:   'counter_offer_price',
    counterOfferMessage: 'counter_offer_message',
    transfers:           'transfers',
    timeline:            'timeline',
    extensions:          'extensions',
    createdByUserId:     'created_by_user_id',
    createdByName:       'created_by_name',
  }
  const row: Record<string, unknown> = {}
  for (const [camel, snake] of Object.entries(map)) {
    if (!(camel in patch)) continue
    const val = (patch as Record<string, unknown>)[camel]
    if (val instanceof Date) row[snake] = val.toISOString()
    else if (val === undefined) row[snake] = null
    else row[snake] = val
  }
  return row
}

// ── localStorage helpers (fallback) ──────────────────────────────────────────

const STORE_KEY = 'driveson:requests:v3'

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value)
  }
  return value
}

function loadStore(): AssistanceRequest[] {
  if (typeof window === 'undefined') return [...MOCK_REQUESTS]
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw, reviveDates) as AssistanceRequest[]
  } catch { /* ignore */ }
  const initial = [...MOCK_REQUESTS]
  try { localStorage.setItem(STORE_KEY, JSON.stringify(initial)) } catch { /* ignore */ }
  return initial
}

function saveStore(data: AssistanceRequest[]): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function generateEvtId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ── Lecture ───────────────────────────────────────────────────────────────────

export async function getAllRequests(): Promise<AssistanceRequest[]> {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('assistance_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) return (data as DbRow[]).map(rowToRequest)
  }
  await delay(500)
  return loadStore().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getRequestById(id: string): Promise<AssistanceRequest | null> {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('assistance_requests')
      .select('*')
      .eq('id', id)
      .single()
    if (!error && data) return rowToRequest(data as DbRow)
    return null
  }
  await delay(250)
  return loadStore().find(r => r.id === id) ?? null
}

// ── Écriture ──────────────────────────────────────────────────────────────────

export async function sendRequest(
  input:     RequestFormInput,
  agencyIds: string | string[],
): Promise<AssistanceRequest> {
  const ids       = Array.isArray(agencyIds) ? agencyIds : [agencyIds]
  const primaryId = ids[0]
  const now       = new Date()

  let createdByUserId: string
  let createdByName:   string

  if (USE_SUPABASE) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Utilisateur non authentifié — impossible de créer une demande.')

    createdByUserId = user.id

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    createdByName = (profile as { full_name?: string | null } | null)?.full_name
      ?? user.email
      ?? 'Assisteur'
  } else {
    throw new Error('Supabase non configuré — impossible de créer une demande.')
  }

  const request: AssistanceRequest = {
    ...input,
    id:                generateId(),
    status:            'envoyee',
    assignedAgencyId:  primaryId,
    assignedAgencyIds: ids.length > 1 ? ids : undefined,
    transfers:         [],
    timeline: [
      { id: generateEvtId(), type: 'creation', at: now, byRole: 'assisteur' },
      ...ids.map((agencyId, i) => ({
        id:       generateEvtId(),
        type:     'envoi' as const,
        at:       new Date(now.getTime() + 1000 + i * 100),
        byRole:   'assisteur' as const,
        agencyId,
      })),
    ],
    createdAt: now,
    createdByUserId,
    createdByName,
  }

  if (USE_SUPABASE) {
    await supabase.from('assistance_requests').insert(requestToRow(request))
  } else {
    await delay(1100)
    saveStore([request, ...loadStore()])
  }

  // Notifications + email — fire-and-forget, ne bloque jamais la création
  if (typeof window !== 'undefined') {
    fetch('/api/notify-loueur', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ request }),
    }).catch(err => console.error('[sendRequest] notify-loueur failed:', err))
  }

  return request
}

export async function updateRequest(
  id: string,
  patch: Partial<AssistanceRequest>,
): Promise<AssistanceRequest | null> {
  if (USE_SUPABASE) {
    const { data, error } = await supabase
      .from('assistance_requests')
      .update(patchToRow(patch))
      .eq('id', id)
      .select()
      .single()
    if (!error && data) return rowToRequest(data as DbRow)
    return null
  }
  await delay(300)
  let updated: AssistanceRequest | null = null
  const next = loadStore().map(r => {
    if (r.id !== id) return r
    updated = { ...r, ...patch }
    return updated
  })
  saveStore(next)
  return updated
}

// ── Verrouillage après confirmation ──────────────────────────────────────────

export async function lockRequestAfterConfirmation(
  requestId:    string,
  agencyId:     string,
  agencyName:   string,
  loueurResponse: import('@/types/request').LoueurResponse,
): Promise<{ request: AssistanceRequest; wasAlreadyLocked: boolean }> {

  if (USE_SUPABASE) {
    const current = await getRequestById(requestId)
    if (!current) return { request: null as unknown as AssistanceRequest, wasAlreadyLocked: false }

    if (current.confirmedAgencyId && current.confirmedAgencyId !== agencyId) {
      return { request: current, wasAlreadyLocked: true }
    }
    if (current.confirmedAgencyId === agencyId) {
      return { request: current, wasAlreadyLocked: false }
    }

    const now         = new Date()
    const isMultiSend = (current.assignedAgencyIds?.length ?? 0) > 1

    const newEvents: RequestTimelineEvent[] = [
      { id: generateEvtId(), type: 'confirmation', at: now, byRole: 'loueur', agencyId, message: String(loueurResponse.pricePerDay ?? '') },
    ]
    if (isMultiSend) {
      newEvents.push({ id: generateEvtId(), type: 'attribution_fermee', at: new Date(now.getTime() + 50), byRole: 'system' })
    }

    const updated = await updateRequest(requestId, {
      status:              'acceptee',
      confirmedAgencyId:   agencyId,
      confirmedAgencyName: agencyName,
      confirmedAt:         now,
      loueurResponse,
      timeline:            [...current.timeline, ...newEvents],
    })
    return { request: updated ?? current, wasAlreadyLocked: false }
  }

  await delay(600)
  const store   = loadStore()
  const request = store.find(r => r.id === requestId)
  if (!request) return { request: null as unknown as AssistanceRequest, wasAlreadyLocked: false }

  if (request.confirmedAgencyId && request.confirmedAgencyId !== agencyId) {
    return { request, wasAlreadyLocked: true }
  }
  if (request.confirmedAgencyId === agencyId) {
    return { request, wasAlreadyLocked: false }
  }

  const now         = new Date()
  const isMultiSend = (request.assignedAgencyIds?.length ?? 0) > 1
  const newEvents: RequestTimelineEvent[] = [
    { id: generateEvtId(), type: 'confirmation', at: now, byRole: 'loueur', agencyId, message: String(loueurResponse.pricePerDay ?? '') },
  ]
  if (isMultiSend) {
    newEvents.push({ id: generateEvtId(), type: 'attribution_fermee', at: new Date(now.getTime() + 50), byRole: 'system' })
  }

  const updated: AssistanceRequest = {
    ...request,
    status:              'acceptee',
    confirmedAgencyId:   agencyId,
    confirmedAgencyName: agencyName,
    confirmedAt:         now,
    loueurResponse,
    timeline: [...request.timeline, ...newEvents],
  }
  saveStore(store.map(r => r.id === requestId ? updated : r))
  return { request: updated, wasAlreadyLocked: false }
}

export async function confirmByAssisteur(
  requestId: string,
): Promise<AssistanceRequest | null> {
  const request = await getRequestById(requestId)
  if (!request || request.status !== 'acceptee') return null

  const evt: RequestTimelineEvent = {
    id: generateEvtId(), type: 'attribution', at: new Date(), byRole: 'assisteur',
    message: request.confirmedAgencyName,
  }
  return updateRequest(requestId, {
    status:              'confirmee',
    counterOfferPrice:   undefined,
    counterOfferMessage: undefined,
    timeline:            [...request.timeline, evt],
  })
}


export async function closeRequest(id: string, message?: string): Promise<void> {
  const request = await getRequestById(id)
  if (!request) return

  const evt: RequestTimelineEvent = {
    id: generateEvtId(), type: 'cloture', at: new Date(), byRole: 'assisteur', message,
  }
  await updateRequest(id, { status: 'cloturee', timeline: [...request.timeline, evt] })
}

// ── Transferts ────────────────────────────────────────────────────────────────

export async function addTransferToRequest(
  requestId: string,
  transfer: Omit<RequestTransfer, 'id' | 'requestId'>,
): Promise<AssistanceRequest | null> {
  const request = await getRequestById(requestId)
  if (!request) return null

  const newTransfer: RequestTransfer = { ...transfer, id: `tr-${Date.now()}`, requestId }
  const evt: RequestTimelineEvent = {
    id: generateEvtId(), type: 'transfert_propose', at: new Date(), byRole: 'loueur',
    agencyId: transfer.fromAgencyId, message: transfer.reason,
  }
  return updateRequest(requestId, {
    status:    'transfert_propose' as RequestStatus,
    transfers: [...request.transfers, newTransfer],
    timeline:  [...request.timeline, evt],
  })
}

export async function validateTransfer(
  requestId: string,
  transferId: string,
): Promise<AssistanceRequest | null> {
  const request = await getRequestById(requestId)
  if (!request) return null

  const transfer = request.transfers.find(t => t.id === transferId)
  if (!transfer) return null

  const now = new Date()
  return updateRequest(requestId, {
    status:           'transferee' as RequestStatus,
    assignedAgencyId: transfer.toAgencyId,
    transfers: request.transfers.map(t =>
      t.id === transferId ? { ...t, status: 'valide' as const, validatedAt: now } : t
    ),
    timeline: [
      ...request.timeline,
      { id: generateEvtId(), type: 'transfert_valide', at: now,                           byRole: 'assisteur' },
      { id: generateEvtId(), type: 'transfert',        at: new Date(now.getTime() + 500),  byRole: 'system' as const, agencyId: transfer.toAgencyId },
    ],
  })
}

export async function refuseTransfer(
  requestId: string,
  transferId: string,
): Promise<AssistanceRequest | null> {
  const request = await getRequestById(requestId)
  if (!request) return null

  const evt: RequestTimelineEvent = {
    id: generateEvtId(), type: 'transfert_refuse', at: new Date(), byRole: 'assisteur',
  }
  return updateRequest(requestId, {
    status: 'recue' as RequestStatus,
    transfers: request.transfers.map(t =>
      t.id === transferId ? { ...t, status: 'refuse' as const } : t
    ),
    timeline: [...request.timeline, evt],
  })
}

// ── Prolongations ─────────────────────────────────────────────────────────────

export async function requestExtension(
  requestId: string,
  days:      number,
  note?:     string,
  pricing?:  PricingOption,
): Promise<AssistanceRequest | null> {
  const request = await getRequestById(requestId)
  if (!request || request.status !== 'confirmee') return null

  const extension: ExtensionRequest = {
    id:            `ext-${Date.now()}`,
    requestedDays: days,
    note:          note || undefined,
    status:        'en_attente',
    requestedAt:   new Date(),
    ...(pricing && {
      appliedPricePerDay: pricing.pricePerDay,
      extensionCost:      pricing.extensionCost,
      newTotalPrice:      pricing.newTotalPrice,
      isForfait:          pricing.isForfait,
      forfaitLabel:       pricing.forfaitLabel,
    }),
  }

  const evt: RequestTimelineEvent = {
    id: generateEvtId(), type: 'prolongation_demandee', at: new Date(), byRole: 'assisteur',
    message: String(days),
  }
  return updateRequest(requestId, {
    extensions: [...(request.extensions ?? []), extension],
    timeline:   [...request.timeline, evt],
  })
}

export async function respondToExtension(
  requestId:   string,
  extensionId: string,
  response:    'acceptee' | 'refusee',
): Promise<AssistanceRequest | null> {
  const request = await getRequestById(requestId)
  if (!request) return null

  const now = new Date()
  const evt: RequestTimelineEvent = {
    id: generateEvtId(), type: 'prolongation_reponse', at: now, byRole: 'loueur',
    message: response === 'acceptee' ? 'Prolongation acceptée' : 'Prolongation refusée',
  }
  return updateRequest(requestId, {
    extensions: (request.extensions ?? []).map(e =>
      e.id === extensionId ? { ...e, status: response, respondedAt: now } : e
    ),
    timeline: [...request.timeline, evt],
  })
}

// ── Retour & paiement ─────────────────────────────────────────────────────────

export async function confirmVehicleReturn(
  requestId:  string,
  returnedAt: Date,
): Promise<AssistanceRequest | null> {
  const request = await getRequestById(requestId)
  if (!request || request.status !== 'confirmee') return null

  const evt: RequestTimelineEvent = {
    id: generateEvtId(), type: 'retour_confirme', at: new Date(), byRole: 'loueur',
    message: returnedAt.toISOString(),
  }
  return updateRequest(requestId, {
    status:    'honoree',
    returnedAt,
    timeline:  [...request.timeline, evt],
  })
}

export async function validatePayment(
  requestId: string,
): Promise<AssistanceRequest | null> {
  const request = await getRequestById(requestId)
  if (!request || request.status !== 'honoree') return null

  const evt: RequestTimelineEvent = {
    id: generateEvtId(), type: 'paiement_valide', at: new Date(), byRole: 'assisteur',
  }
  return updateRequest(requestId, {
    status:   'cloturee',
    timeline: [...request.timeline, evt],
  })
}
