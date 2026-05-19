import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAdmin }                   from '@/lib/requireAdmin'
import { randomUUID }                     from 'crypto'
import type { RequestStatus }             from '@/types/request'

// Whitelist stricte — 5 transitions sûres uniquement
type Transition = { from: RequestStatus; to: RequestStatus; label: string }
const WHITELIST: Transition[] = [
  { from: 'envoyee',          to: 'recue',    label: 'Notification manquée — marquée reçue manuellement' },
  { from: 'recue',            to: 'envoyee',  label: 'Réception incorrecte — retour envoyée' },
  { from: 'transfert_valide', to: 'envoyee',  label: 'Déblocage transfert bloqué — retour envoyée' },
  { from: 'transfert_valide', to: 'recue',    label: 'Déblocage transfert bloqué — retour reçue' },
  { from: 'honoree',          to: 'cloturee', label: 'Clôture manuelle — paiement validé hors système' },
]

// Statuts explicitement refusés en destination
const FORBIDDEN_TO: RequestStatus[] = ['brouillon', 'refusee', 'confirmee', 'honoree', 'acceptee', 'transfert_propose', 'transferee']
const FORBIDDEN_FROM: RequestStatus[] = ['cloturee', 'refusee']

type PostBody = {
  toStatus: RequestStatus
  message?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id: requestId } = await params
  const body = await request.json() as PostBody
  const { toStatus, message } = body

  if (!toStatus)
    return NextResponse.json({ error: 'toStatus requis' }, { status: 400 })

  // ── Charger la demande ────────────────────────────────────────────────────────
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('assistance_requests')
    .select('id, status, timeline')
    .eq('id', requestId)
    .single()

  if (fetchError || !row)
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

  const { status: fromStatus, timeline } = row as {
    status:   RequestStatus
    timeline: Array<Record<string, unknown>>
  }

  // ── Refus explicites ──────────────────────────────────────────────────────────
  if (FORBIDDEN_FROM.includes(fromStatus))
    return NextResponse.json(
      { error: `Transition impossible depuis le statut « ${fromStatus} »` },
      { status: 422 },
    )

  if (FORBIDDEN_TO.includes(toStatus))
    return NextResponse.json(
      { error: `Transition vers « ${toStatus} » non autorisée` },
      { status: 422 },
    )

  if (fromStatus === toStatus)
    return NextResponse.json(
      { error: 'Le statut cible est identique au statut actuel' },
      { status: 422 },
    )

  // ── Validation whitelist ──────────────────────────────────────────────────────
  const transition = WHITELIST.find(t => t.from === fromStatus && t.to === toStatus)
  if (!transition)
    return NextResponse.json(
      { error: `Transition ${fromStatus} → ${toStatus} non autorisée` },
      { status: 422 },
    )

  // ── Read-modify-write : status + timeline en un seul UPDATE ──────────────────
  const now = new Date().toISOString()
  const newEvent = {
    id:      randomUUID(),
    type:    'admin_changement_statut',
    at:      now,
    byRole:  'admin',
    message: message?.trim() || transition.label,
  }

  const { error: updateError } = await supabaseAdmin
    .from('assistance_requests')
    .update({
      status:           toStatus,
      timeline:         [...(timeline ?? []), newEvent],
      admin_updated_at: now,
      admin_updated_by: auth.userId,
    })
    .eq('id', requestId)

  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 })

  // ── Audit log (best-effort) ───────────────────────────────────────────────────
  await supabaseAdmin.from('admin_audit_logs').insert({
    admin_id:    auth.userId,
    action:      'status_changed',
    target_type: 'request',
    target_id:   requestId,
    before_json: { status: fromStatus },
    after_json:  { status: toStatus },
    metadata: {
      reason:     message?.trim() || null,
      transition: transition.label,
    },
  }).then(({ error }) => {
    if (error) console.error('[admin/status] audit log:', error.message)
  })

  return NextResponse.json({ ok: true, fromStatus, toStatus })
}
