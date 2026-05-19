import { supabase }        from '@/lib/supabaseClient'
import { getRequestById }  from './requestService'
import { logAdminAction }  from './adminAuditService'
import type { AssistanceRequest } from '@/types/request'
import type {
  AdminUxStatus, AdminUrgencyLevel, AdminPaymentStatus,
  RequestFinanceData,
} from '@/types/adminReservation'
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
  paymentStatus:           AdminPaymentStatus   // miroir de financeData.paymentStatus
  financeData:             RequestFinanceData
  lastActivityAt:          Date
  minutesSinceLastActivity: number
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

function castPaymentStatus(raw: string | null | undefined): AdminPaymentStatus {
  const valid: AdminPaymentStatus[] = ['non_applicable', 'en_attente', 'pret_a_payer', 'paye', 'litigieux']
  if (raw && valid.includes(raw as AdminPaymentStatus)) return raw as AdminPaymentStatus
  return 'non_applicable'
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

export async function getAdminDossier(id: string): Promise<AdminDossierData | null> {
  const request = await getRequestById(id)
  if (!request) return null

  const agencyIds = [...new Set([
    ...(request.assignedAgencyIds ?? []),
    request.assignedAgencyId,
    request.confirmedAgencyId,
  ].filter(Boolean) as string[])]

  // ── Requêtes parallèles ───────────────────────────────────────────────────────
  const [agencyRes, requesterRes, adminRes, finRes] = await Promise.all([
    agencyIds.length > 0
      ? supabase.from('rental_agencies').select('id, agency_name').in('id', agencyIds)
      : Promise.resolve({ data: [] }),
    request.createdByUserId && request.createdByUserId !== 'unknown'
      ? supabase.from('profiles').select('full_name, company_name, phone').eq('id', request.createdByUserId).single()
      : Promise.resolve({ data: null }),
    request.adminUpdatedBy
      ? supabase.from('profiles').select('full_name').eq('id', request.adminUpdatedBy).single()
      : Promise.resolve({ data: null }),
    supabase
      .from('assistance_requests')
      .select('confirmed_price_per_day, confirmed_duration_days, commission_rate, commission_amount, total_amount_ht, amount_due_to_loueur, payment_status, payment_validated_at, payment_validated_by')
      .eq('id', id)
      .single(),
  ])

  // Agency names
  const agencyNames = new Map<string, string>()
  for (const a of (agencyRes.data ?? []) as { id: string; agency_name: string }[]) {
    agencyNames.set(a.id, a.agency_name)
  }

  // Requester profile
  let requesterProfile: RequesterProfile | null = null
  if (requesterRes.data) {
    const p = requesterRes.data as { full_name: string; company_name: string | null; phone: string | null }
    requesterProfile = { fullName: p.full_name, companyName: p.company_name, phone: p.phone }
  }

  // Admin author name
  const adminUpdatedByName = adminRes.data
    ? (adminRes.data as { full_name: string }).full_name
    : null

  // Finance data
  type FinRow = {
    confirmed_price_per_day:  number | null
    confirmed_duration_days:  number | null
    commission_rate:          number
    commission_amount:        number | null
    total_amount_ht:          number | null
    amount_due_to_loueur:     number | null
    payment_status:           string
    payment_validated_at:     string | null
    payment_validated_by:     string | null
  }
  const fin = finRes.data as FinRow | null

  // Payment validated by name (sequential — only if needed)
  let paymentValidatedByName: string | null = null
  if (fin?.payment_validated_by) {
    const { data: validatedByProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', fin.payment_validated_by)
      .single()
    if (validatedByProfile) {
      paymentValidatedByName = (validatedByProfile as { full_name: string }).full_name
    }
  }

  const financeData: RequestFinanceData = {
    confirmedPricePerDay:   fin?.confirmed_price_per_day  ?? null,
    confirmedDurationDays:  fin?.confirmed_duration_days  ?? null,
    commissionRate:         fin?.commission_rate          ?? 0.15,
    commissionAmount:       fin?.commission_amount        ?? null,
    totalAmountHt:          fin?.total_amount_ht          ?? null,
    amountDueToLoueur:      fin?.amount_due_to_loueur     ?? null,
    paymentStatus:          castPaymentStatus(fin?.payment_status),
    paymentValidatedAt:     fin?.payment_validated_at ? new Date(fin.payment_validated_at) : null,
    paymentValidatedByName,
  }

  // ── UX enrichments ────────────────────────────────────────────────────────────
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

  return {
    request,
    agencyNames,
    requesterProfile,
    adminUpdatedByName,
    uxStatus,
    urgencyLevel,
    paymentStatus:          financeData.paymentStatus,
    financeData,
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
