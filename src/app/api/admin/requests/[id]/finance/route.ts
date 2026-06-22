import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAdmin }                   from '@/lib/requireAdmin'
import { calculatePricing }               from '@/lib/rentalPricing'
import { randomUUID }                     from 'crypto'
import type { AdminPaymentStatus }        from '@/types/adminReservation'
import type { ExtensionRequest }          from '@/types/requestExtension'
import { logger }                         from '@/lib/logger'

type FinanceAction =
  | 'recalculate'
  | 'mark_ready'
  | 'mark_paid'
  | 'mark_litigieux'
  | 'unblock_litige'
  | 'revert_ready'

type PostBody = {
  action: FinanceAction
  reason?: string
}

// Transitions autorisées par action
const ALLOWED_FROM: Record<FinanceAction, AdminPaymentStatus[]> = {
  recalculate:    ['non_applicable', 'en_attente'],
  mark_ready:     ['en_attente'],
  mark_paid:      ['pret_a_payer'],
  mark_litigieux: ['en_attente', 'pret_a_payer'],
  unblock_litige: ['litigieux'],
  revert_ready:   ['pret_a_payer'],
}

const ACTION_RESULT: Record<FinanceAction, AdminPaymentStatus | null> = {
  recalculate:    null,          // ne change pas le payment_status (sauf non_applicable → en_attente)
  mark_ready:     'pret_a_payer',
  mark_paid:      'paye',
  mark_litigieux: 'litigieux',
  unblock_litige: 'en_attente',
  revert_ready:   'en_attente',
}

const ACTION_TIMELINE_MSG: Record<FinanceAction, string> = {
  recalculate:    'Montants recalculés',
  mark_ready:     'Dossier marqué prêt à payer',
  mark_paid:      'Paiement confirmé',
  mark_litigieux: 'Litige signalé',
  unblock_litige: 'Litige débloqué',
  revert_ready:   'Statut paiement révertit vers en attente',
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id: requestId } = await params
  const body = await request.json() as PostBody
  const { action, reason } = body

  if (!action || !(action in ALLOWED_FROM))
    return NextResponse.json({ error: 'Action invalide' }, { status: 400 })

  // ── Charger la demande ────────────────────────────────────────────────────────
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('assistance_requests')
    .select(
      'status, loueur_response, counter_offer_price, duration_days, extensions, ' +
      'commission_rate, payment_status, total_amount_ht, timeline',
    )
    .eq('id', requestId)
    .single()

  if (fetchError || !row)
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

  type RowType = {
    status:              string
    loueur_response:     { pricePerDay?: number } | null
    counter_offer_price: number | null
    duration_days:       number
    extensions:          ExtensionRequest[] | null
    commission_rate:     number
    payment_status:      string
    total_amount_ht:     number | null
    timeline:            Array<Record<string, unknown>>
  }
  const {
    status:          opStatus,
    loueur_response: loueurResponse,
    counter_offer_price: counterOfferPrice,
    duration_days:   durationDays,
    extensions,
    commission_rate: commissionRate,
    payment_status:  rawPaymentStatus,
    total_amount_ht: existingTotal,
    timeline,
  } = row as unknown as RowType

  const paymentStatus = rawPaymentStatus as AdminPaymentStatus

  // ── Validation accès ──────────────────────────────────────────────────────────
  const allowedFrom = ALLOWED_FROM[action]
  if (!allowedFrom.includes(paymentStatus))
    return NextResponse.json(
      { error: `Action « ${action} » non autorisée depuis le statut paiement « ${paymentStatus} »` },
      { status: 422 },
    )

  // ── Validation mark_ready : montants obligatoires ─────────────────────────────
  if (action === 'mark_ready' && !existingTotal)
    return NextResponse.json(
      { error: 'Recalcul des montants obligatoire avant de marquer prêt à payer' },
      { status: 422 },
    )

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    admin_updated_at: now,
    admin_updated_by: auth.userId,
  }

  // ── Recalcul des montants ─────────────────────────────────────────────────────
  if (action === 'recalculate') {
    const confirmedPpd = (loueurResponse as { pricePerDay?: number } | null)?.pricePerDay
      ?? counterOfferPrice
      ?? null

    if (confirmedPpd === null)
      return NextResponse.json(
        { error: 'Aucun tarif confirmé disponible (loueur_response.pricePerDay manquant)' },
        { status: 422 },
      )

    const effectiveDays = durationDays + ((extensions ?? []) as ExtensionRequest[])
      .filter(e => e.status === 'acceptee')
      .reduce((acc, e) => acc + e.requestedDays, 0)

    const rate    = (commissionRate as number) ?? 0.15
    const pricing = calculatePricing(confirmedPpd, effectiveDays, 0, rate)

    update.confirmed_price_per_day = confirmedPpd
    update.confirmed_duration_days = effectiveDays
    update.commission_amount       = pricing.commission
    update.total_amount_ht         = pricing.total
    update.amount_due_to_loueur    = pricing.net

    // non_applicable → en_attente automatiquement lors du premier calcul
    if (paymentStatus === 'non_applicable') {
      update.payment_status = 'en_attente'
    }
  }

  // ── Transition payment_status ─────────────────────────────────────────────────
  const nextStatus = ACTION_RESULT[action]
  if (nextStatus !== null) {
    update.payment_status = nextStatus
    if (action === 'mark_paid') {
      update.payment_validated_at = now
      update.payment_validated_by = auth.userId
    }
  }

  // ── Timeline event ────────────────────────────────────────────────────────────
  const msg = reason?.trim()
    ? `${ACTION_TIMELINE_MSG[action]} — ${reason.trim()}`
    : ACTION_TIMELINE_MSG[action]

  const newEvent = {
    id:      randomUUID(),
    type:    'admin_finance',
    at:      now,
    byRole:  'admin',
    message: msg,
  }
  update.timeline = [...(timeline ?? []), newEvent]

  // ── Appliquer l'update ────────────────────────────────────────────────────────
  const { error: updateError } = await supabaseAdmin
    .from('assistance_requests')
    .update(update)
    .eq('id', requestId)

  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })

  // ── Audit log (best-effort) ───────────────────────────────────────────────────
  const auditAction = action === 'recalculate' ? 'finance_recalculated' : 'payment_status_changed'

  await supabaseAdmin.from('admin_audit_logs').insert({
    admin_id:    auth.userId,
    action:      auditAction,
    target_type: 'request',
    target_id:   requestId,
    before_json: { payment_status: paymentStatus },
    after_json:  {
      payment_status: (update.payment_status ?? paymentStatus),
      total_amount_ht: update.total_amount_ht ?? existingTotal,
    },
    metadata: { finance_action: action, reason: reason?.trim() || null },
  }).then(({ error }) => {
    if (error) logger.error('[admin/finance] audit log:', error.message)
  })

  const opStatus_check = opStatus
  void opStatus_check  // confirmé non utilisé — on ne touche pas au statut opérationnel

  return NextResponse.json({ ok: true, action, newPaymentStatus: update.payment_status ?? paymentStatus })
}
