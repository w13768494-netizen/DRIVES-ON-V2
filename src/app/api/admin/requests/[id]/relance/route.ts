import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAdmin }                   from '@/lib/requireAdmin'
import { randomUUID }                     from 'crypto'
import { logger }                         from '@/lib/logger'

const ANTI_SPAM_MINUTES = 30

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id: requestId } = await params

  // ── Charger la demande ────────────────────────────────────────────────────────
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('assistance_requests')
    .select('id, status, assigned_agency_ids, timeline')
    .eq('id', requestId)
    .single()

  if (fetchError || !row)
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

  const { status, assigned_agency_ids, timeline } = row as {
    status:               string
    assigned_agency_ids:  string[] | null
    timeline:             Array<{ type: string; at: string }>
  }

  // ── Validation métier ─────────────────────────────────────────────────────────
  if (status !== 'envoyee' && status !== 'recue')
    return NextResponse.json(
      { error: `Relance impossible pour le statut « ${status} »` },
      { status: 422 },
    )

  const agencyIds = (assigned_agency_ids ?? []).filter(Boolean)
  if (agencyIds.length === 0)
    return NextResponse.json(
      { error: 'Aucun loueur assigné à cette demande' },
      { status: 422 },
    )

  // ── Anti-spam 30 min ──────────────────────────────────────────────────────────
  const lastRelance = (timeline ?? [])
    .filter(e => e.type === 'admin_relance')
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]

  if (lastRelance) {
    const minutesSince = (Date.now() - new Date(lastRelance.at).getTime()) / 60000
    if (minutesSince < ANTI_SPAM_MINUTES)
      return NextResponse.json(
        { error: `Relance déjà envoyée il y a ${Math.floor(minutesSince)} min — réessayez dans ${Math.ceil(ANTI_SPAM_MINUTES - minutesSince)} min` },
        { status: 429 },
      )
  }

  // ── Charger les agences (owner_id) ────────────────────────────────────────────
  const { data: agencies } = await supabaseAdmin
    .from('rental_agencies')
    .select('id, owner_id, agency_name')
    .in('id', agencyIds)

  const agencyMap = new Map<string, { ownerId: string; name: string }>()
  for (const a of (agencies ?? []) as { id: string; owner_id: string; agency_name: string }[]) {
    agencyMap.set(a.id, { ownerId: a.owner_id, name: a.agency_name })
  }

  // ── Notifications (skip orphelins) ────────────────────────────────────────────
  const notifPayloads = []
  for (const agencyId of agencyIds) {
    const agency = agencyMap.get(agencyId)
    if (!agency) {
      logger.warn('[admin/relance] agency orpheline ignorée:', agencyId)
      continue
    }
    notifPayloads.push({
      user_id:    agency.ownerId,
      agency_id:  agencyId,
      request_id: requestId,
      type:       'admin_relance',
      title:      'Rappel — demande en attente',
      body:       'Cette demande n\'a pas encore reçu de réponse. Merci de traiter ce dossier en priorité.',
      read:       false,
    })
  }

  if (notifPayloads.length > 0) {
    const { error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert(notifPayloads)
    if (notifError)
      logger.error('[admin/relance] notifications insert:', notifError.message)
  }

  // ── Append timeline event ─────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const newEvent = {
    id:      randomUUID(),
    type:    'admin_relance',
    at:      now,
    byRole:  'admin',
    message: `${notifPayloads.length} partenaire${notifPayloads.length > 1 ? 's' : ''} relancé${notifPayloads.length > 1 ? 's' : ''}`,
  }

  const { error: updateError } = await supabaseAdmin
    .from('assistance_requests')
    .update({
      timeline:         [...(timeline ?? []), newEvent],
      admin_updated_at: now,
      admin_updated_by: auth.userId,
    })
    .eq('id', requestId)

  if (updateError)
    logger.error('[admin/relance] timeline update:', updateError.message)

  // ── Audit log (best-effort) ───────────────────────────────────────────────────
  await supabaseAdmin.from('admin_audit_logs').insert({
    admin_id:    auth.userId,
    action:      'loueur_relance',
    target_type: 'request',
    target_id:   requestId,
    before_json: null,
    after_json:  null,
    metadata: {
      agencies_notified: notifPayloads.length,
      agency_ids:        agencyIds,
    },
  }).then(({ error }) => {
    if (error) logger.error('[admin/relance] audit log:', error.message)
  })

  return NextResponse.json({
    ok:                true,
    agencies_notified: notifPayloads.length,
  })
}
