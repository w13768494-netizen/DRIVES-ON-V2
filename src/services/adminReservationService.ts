import { getAllRequests }   from './requestService'
import { supabase }        from '@/lib/supabaseClient'
import type { AssistanceRequest, RequestStatus } from '@/types/request'
import type { RequestDocumentType } from '@/types/requestDocument'
import type {
  AdminReservation, AdminUxStatus, AdminUrgencyLevel,
  AdminPaymentStatus, AdminReservationKpis,
} from '@/types/adminReservation'
import { REQUIRED_DOCS_BY_STATUS } from '@/types/adminReservation'

// ── Documents batch loader ────────────────────────────────────────────────────
// Charge tous les documents en une seule requête Supabase (pas de N+1)

async function loadDocsByRequest(requestIds: string[]): Promise<Map<string, RequestDocumentType[]>> {
  const map = new Map<string, RequestDocumentType[]>()
  if (requestIds.length === 0) return map
  const { data, error } = await supabase
    .from('request_documents')
    .select('request_id, type')
    .in('request_id', requestIds)
  if (error) { console.error('[adminReservationService] docs:', error.message); return map }
  for (const doc of (data ?? []) as { request_id: string; type: string }[]) {
    const list = map.get(doc.request_id) ?? []
    list.push(doc.type as RequestDocumentType)
    map.set(doc.request_id, list)
  }
  return map
}

// ── Documents manquants ───────────────────────────────────────────────────────

function computeMissingDocs(
  status: RequestStatus,
  presentTypes: RequestDocumentType[],
): RequestDocumentType[] {
  const required = REQUIRED_DOCS_BY_STATUS[status] ?? []
  const present  = new Set(presentTypes)
  return required.filter(r => !present.has(r))
}

// ── Dernière activité ─────────────────────────────────────────────────────────

function computeLastActivityAt(request: AssistanceRequest): Date {
  if (request.timeline.length > 0) {
    return new Date(request.timeline[request.timeline.length - 1].at)
  }
  return new Date(request.createdAt)
}

// ── Statut UX ─────────────────────────────────────────────────────────────────

function computeUxStatus(
  status: RequestStatus,
  missingDocs: RequestDocumentType[],
): AdminUxStatus {
  if (status === 'refusee') return 'archivee'
  if (status === 'cloturee') return 'cloturee'

  if (status === 'honoree') {
    return missingDocs.length > 0 ? 'docs_manquants' : 'attente_paiement'
  }
  if (status === 'confirmee' || status === 'acceptee') {
    return missingDocs.length > 0 ? 'docs_manquants' : 'en_cours'
  }
  // envoyee, recue, brouillon, transfert_*
  return 'en_attente'
}

// ── Niveau d'urgence ──────────────────────────────────────────────────────────

function computeUrgencyLevel(
  request:     AssistanceRequest,
  uxStatus:    AdminUxStatus,
  minutesSince: number,
): AdminUrgencyLevel {
  if (uxStatus === 'cloturee' || uxStatus === 'archivee') return 'normal'

  // Critique : demande immédiate sans réponse depuis > 45 min
  if (
    request.requestType === 'immediate' &&
    uxStatus === 'en_attente' &&
    minutesSince > 45
  ) return 'critique'

  // Urgent : docs manquants depuis > 48h
  if (uxStatus === 'docs_manquants' && minutesSince > 2880) return 'urgent'

  // Attention : en attente de paiement depuis > 7 jours
  if (uxStatus === 'attente_paiement' && minutesSince > 10080) return 'attention'

  return 'normal'
}

// ── Statut paiement ───────────────────────────────────────────────────────────

function computePaymentStatus(status: RequestStatus): AdminPaymentStatus {
  if (status === 'honoree')  return 'en_attente'
  if (status === 'cloturee') return 'paye'
  return 'non_applicable'
}

// ── Enrichissement ────────────────────────────────────────────────────────────

function enrichRequest(
  request: AssistanceRequest,
  docsMap: Map<string, RequestDocumentType[]>,
): AdminReservation {
  const presentTypes              = docsMap.get(request.id) ?? []
  const missingDocuments          = computeMissingDocs(request.status, presentTypes)
  const lastActivityAt            = computeLastActivityAt(request)
  const minutesSinceLastActivity  = Math.floor((Date.now() - lastActivityAt.getTime()) / 60000)
  const uxStatus                  = computeUxStatus(request.status, missingDocuments)
  const urgencyLevel              = computeUrgencyLevel(request, uxStatus, minutesSinceLastActivity)
  const paymentStatus             = computePaymentStatus(request.status)

  return {
    ...request,
    uxStatus,
    urgencyLevel,
    paymentStatus,
    missingDocuments,
    lastActivityAt,
    minutesSinceLastActivity,
  }
}

// ── API publique ──────────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<AdminUrgencyLevel, number> = {
  critique: 0, urgent: 1, attention: 2, normal: 3,
}

export async function getAdminReservations(): Promise<AdminReservation[]> {
  const requests = await getAllRequests()
  const docsMap  = await loadDocsByRequest(requests.map(r => r.id))

  return requests
    .map(r => enrichRequest(r, docsMap))
    .sort((a, b) => {
      const diff = URGENCY_ORDER[a.urgencyLevel] - URGENCY_ORDER[b.urgencyLevel]
      if (diff !== 0) return diff
      return b.lastActivityAt.getTime() - a.lastActivityAt.getTime()
    })
}

export function computeKpis(reservations: AdminReservation[]): AdminReservationKpis {
  const kpis: AdminReservationKpis = {
    en_attente: 0, en_cours: 0, docs_manquants: 0,
    attente_paiement: 0, cloturee: 0, archivee: 0,
    total: reservations.length,
  }
  for (const r of reservations) kpis[r.uxStatus]++
  return kpis
}
