import { supabase }        from '@/lib/supabaseClient'
import { getRequestById }  from './requestService'
import { logAdminAction }  from './adminAuditService'
import type { AssistanceRequest } from '@/types/request'
import type { AdminUxStatus, AdminUrgencyLevel, AdminPaymentStatus } from '@/types/adminReservation'
import { REQUIRED_DOCS_BY_STATUS } from '@/types/adminReservation'
import type { RequestDocumentType } from '@/types/requestDocument'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RequesterProfile {
  fullName:    string
  companyName: string | null
  phone:       string | null
}

export interface AdminDossierData {
  request:                 AssistanceRequest
  agencyNames:             Map<string, string>  // agencyId → agency_name
  requesterProfile:        RequesterProfile | null
  adminUpdatedByName:      string | null
  uxStatus:                AdminUxStatus
  urgencyLevel:            AdminUrgencyLevel
  paymentStatus:           AdminPaymentStatus
  lastActivityAt:          Date
  minutesSinceLastActivity: number
  // computed from documents passed by caller — not loaded here
  missingDocTypes:         (docs: RequestDocumentType[]) => RequestDocumentType[]
}

// ── Helpers enrichissement ────────────────────────────────────────────────────

function computeUxStatus(
  status:      AssistanceRequest['status'],
  missingDocs: RequestDocumentType[],
): AdminUxStatus {
  if (status === 'refusee')  return 'archivee'
  if (status === 'cloturee') return 'cloturee'
  if (status === 'honoree')
    return missingDocs.length > 0 ? 'docs_manquants' : 'attente_paiement'
  if (status === 'confirmee' || status === 'acceptee')
    return missingDocs.length > 0 ? 'docs_manquants' : 'en_cours'
  return 'en_attente'
}

function computeUrgencyLevel(
  request:      AssistanceRequest,
  uxStatus:     AdminUxStatus,
  minutesSince: number,
): AdminUrgencyLevel {
  if (uxStatus === 'cloturee' || uxStatus === 'archivee') return 'normal'
  if (request.requestType === 'immediate' && uxStatus === 'en_attente' && minutesSince > 45)
    return 'critique'
  if (uxStatus === 'docs_manquants' && minutesSince > 2880) return 'urgent'
  if (uxStatus === 'attente_paiement' && minutesSince > 10080) return 'attention'
  return 'normal'
}

function computePaymentStatus(status: AssistanceRequest['status']): AdminPaymentStatus {
  if (status === 'honoree')  return 'en_attente'
  if (status === 'cloturee') return 'paye'
  return 'non_applicable'
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

export async function getAdminDossier(id: string): Promise<AdminDossierData | null> {
  const request = await getRequestById(id)
  if (!request) return null

  // Agency names lookup
  const agencyIds = [...new Set([
    ...(request.assignedAgencyIds ?? []),
    request.assignedAgencyId,
    request.confirmedAgencyId,
  ].filter(Boolean) as string[])]

  const agencyNames = new Map<string, string>()
  if (agencyIds.length > 0) {
    const { data: agencies } = await supabase
      .from('rental_agencies')
      .select('id, agency_name')
      .in('id', agencyIds)
    for (const a of (agencies ?? []) as { id: string; agency_name: string }[]) {
      agencyNames.set(a.id, a.agency_name)
    }
  }

  // Requester profile
  let requesterProfile: RequesterProfile | null = null
  if (request.createdByUserId && request.createdByUserId !== 'unknown') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, company_name, phone')
      .eq('id', request.createdByUserId)
      .single()
    if (profile) {
      const p = profile as { full_name: string; company_name: string | null; phone: string | null }
      requesterProfile = { fullName: p.full_name, companyName: p.company_name, phone: p.phone }
    }
  }

  // Admin author name
  let adminUpdatedByName: string | null = null
  if (request.adminUpdatedBy) {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', request.adminUpdatedBy)
      .single()
    if (adminProfile) {
      adminUpdatedByName = (adminProfile as { full_name: string }).full_name
    }
  }

  // UX enrichments — computed with empty docs initially; caller recomputes with real docs
  const lastEvent = request.timeline[request.timeline.length - 1]
  const lastActivityAt = lastEvent ? new Date(lastEvent.at) : new Date(request.createdAt)
  const minutesSinceLastActivity = Math.floor((Date.now() - lastActivityAt.getTime()) / 60000)

  const missingDocTypes = (presentTypes: RequestDocumentType[]) => {
    const required = REQUIRED_DOCS_BY_STATUS[request.status] ?? []
    const presentSet = new Set(presentTypes)
    return required.filter(r => !presentSet.has(r))
  }

  const uxStatus = computeUxStatus(request.status, missingDocTypes([]))
  const urgencyLevel = computeUrgencyLevel(request, uxStatus, minutesSinceLastActivity)
  const paymentStatus = computePaymentStatus(request.status)

  return {
    request,
    agencyNames,
    requesterProfile,
    adminUpdatedByName,
    uxStatus,
    urgencyLevel,
    paymentStatus,
    lastActivityAt,
    minutesSinceLastActivity,
    missingDocTypes,
  }
}

// ── Actions admin ─────────────────────────────────────────────────────────────

export async function saveAdminNote(requestId: string, note: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: before } = await supabase
    .from('assistance_requests')
    .select('admin_notes')
    .eq('id', requestId)
    .single()

  const { error } = await supabase
    .from('assistance_requests')
    .update({
      admin_notes:      note || null,
      admin_updated_at: new Date().toISOString(),
      admin_updated_by: user?.id ?? null,
    })
    .eq('id', requestId)

  if (error) { console.error('[adminDossierService] saveAdminNote:', error.message); return false }

  await logAdminAction({
    action:     'note_saved',
    targetType: 'request',
    targetId:   requestId,
    beforeJson: { admin_notes: (before as { admin_notes: string | null } | null)?.admin_notes ?? null },
    afterJson:  { admin_notes: note || null },
  })

  return true
}

export async function saveAdminFlags(requestId: string, flags: string[]): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: before } = await supabase
    .from('assistance_requests')
    .select('admin_flags')
    .eq('id', requestId)
    .single()

  const { error } = await supabase
    .from('assistance_requests')
    .update({
      admin_flags:      flags,
      admin_updated_at: new Date().toISOString(),
      admin_updated_by: user?.id ?? null,
    })
    .eq('id', requestId)

  if (error) { console.error('[adminDossierService] saveAdminFlags:', error.message); return false }

  await logAdminAction({
    action:     'flags_updated',
    targetType: 'request',
    targetId:   requestId,
    beforeJson: { admin_flags: (before as { admin_flags: string[] } | null)?.admin_flags ?? [] },
    afterJson:  { admin_flags: flags },
  })

  return true
}
