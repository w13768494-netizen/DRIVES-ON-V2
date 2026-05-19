import { getAllRequests }   from './requestService'
import { computeAlerts }   from './adminAlertService'
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

// ── Statut paiement (lecture depuis DB) ───────────────────────────────────────

const VALID_PAYMENT_STATUSES: AdminPaymentStatus[] = [
  'non_applicable', 'en_attente', 'pret_a_payer', 'paye', 'litigieux',
]

async function loadPaymentStatuses(
  requestIds: string[],
): Promise<Map<string, AdminPaymentStatus>> {
  const map = new Map<string, AdminPaymentStatus>()
  if (requestIds.length === 0) return map
  const { data } = await supabase
    .from('assistance_requests')
    .select('id, payment_status')
    .in('id', requestIds)
  for (const row of (data ?? []) as { id: string; payment_status: string }[]) {
    const v = row.payment_status as AdminPaymentStatus
    map.set(row.id, VALID_PAYMENT_STATUSES.includes(v) ? v : 'non_applicable')
  }
  return map
}

// ── Enrichissement ────────────────────────────────────────────────────────────

function enrichRequest(
  request:          AssistanceRequest,
  docsMap:          Map<string, RequestDocumentType[]>,
  paymentStatusMap: Map<string, AdminPaymentStatus>,
): AdminReservation {
  const presentTypes              = docsMap.get(request.id) ?? []
  const missingDocuments          = computeMissingDocs(request.status, presentTypes)
  const lastActivityAt            = computeLastActivityAt(request)
  const minutesSinceLastActivity  = Math.floor((Date.now() - lastActivityAt.getTime()) / 60000)
  const uxStatus                  = computeUxStatus(request.status, missingDocuments)
  const urgencyLevel              = computeUrgencyLevel(request, uxStatus, minutesSinceLastActivity)
  const paymentStatus             = paymentStatusMap.get(request.id) ?? 'non_applicable'

  const partial = {
    ...request,
    uxStatus,
    urgencyLevel,
    paymentStatus,
    missingDocuments,
    lastActivityAt,
    minutesSinceLastActivity,
    alerts: [] as AdminReservation['alerts'],
  }
  const alerts = computeAlerts(partial)

  return { ...partial, alerts }
}

// ── API publique ──────────────────────────────────────────────────────────────

const URGENCY_ORDER: Record<AdminUrgencyLevel, number> = {
  critique: 0, urgent: 1, attention: 2, normal: 3,
}

export async function getAdminReservations(): Promise<AdminReservation[]> {
  const requests = await getAllRequests()
  const ids      = requests.map(r => r.id)

  const [docsMap, paymentStatusMap] = await Promise.all([
    loadDocsByRequest(ids),
    loadPaymentStatuses(ids),
  ])

  return requests
    .map(r => enrichRequest(r, docsMap, paymentStatusMap))
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
    alertes_critiques: 0,
  }
  for (const r of reservations) {
    kpis[r.uxStatus]++
    if (r.alerts.some(a => a.severity === 'rouge')) kpis.alertes_critiques++
  }
  return kpis
}
