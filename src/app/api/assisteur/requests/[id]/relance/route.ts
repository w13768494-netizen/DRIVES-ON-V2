import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAuth }                    from '@/lib/requireAuth'
import { randomUUID }                     from 'crypto'
import { logger }                         from '@/lib/logger'

const ANTI_SPAM_MINUTES = 30

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  const { id: requestId } = await params

  // ── Charger la demande ────────────────────────────────────────────────────────
  const { data: row, error: fetchError } = await supabaseAdmin
    .from('assistance_requests')
    .select('id, status, assigned_agency_ids, timeline, created_by_user_id')
    .eq('id', requestId)
    .single()

  if (fetchError || !row)
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

  const { status, assigned_agency_ids, timeline, created_by_user_id } = row as {
    status:               string
    assigned_agency_ids:  string[] | null
    timeline:             Array<{ type: string; at: string }>
    created_by_user_id:   string | null
  }

  // ── Vérification appartenance (le partenaire doit être le créateur) ───────────
  if (created_by_user_id !== auth.userId) {
    return NextResponse.json(
      { error: 'Accès non autorisé à ce dossier' },
      { status: 403 },
    )
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

  // ── Anti-spam 30 min (admin_relance ET partenaire_relance) ────────────────────
  const RELANCE_TYPES = new Set(['admin_relance', 'partenaire_relance'])
  const lastRelance = (timeline ?? [])
    .filter(e => RELANCE_TYPES.has(e.type))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0]

  if (lastRelance) {
    const minutesSince = (Date.now() - new Date(lastRelance.at).getTime()) / 60000
    if (minutesSince < ANTI_SPAM_MINUTES)
      return NextResponse.json(
        {
          error: `Relance déjà envoyée il y a ${Math.floor(minutesSince)} min — réessayez dans ${Math.ceil(ANTI_SPAM_MINUTES - minutesSince)} min`,
          minutesRemaining: Math.ceil(ANTI_SPAM_MINUTES - minutesSince),
        },
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

  // ── Notifications ─────────────────────────────────────────────────────────────
  const notifPayloads = []
  for (const agencyId of agencyIds) {
    const agency = agencyMap.get(agencyId)
    if (!agency) continue
    notifPayloads.push({
      user_id:    agency.ownerId,
      agency_id:  agencyId,
      request_id: requestId,
      type:       'partenaire_relance',
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
      logger.error('[assisteur/relance] notifications insert:', notifError.message)
  }

  // ── Timeline event ────────────────────────────────────────────────────────────
  const now = new Date().toISOString()
  const newEvent = {
    id:      randomUUID(),
    type:    'partenaire_relance',
    at:      now,
    byRole:  'assisteur',
    message: `${notifPayloads.length} loueur${notifPayloads.length > 1 ? 's' : ''} relancé${notifPayloads.length > 1 ? 's' : ''}`,
  }

  const { error: updateError } = await supabaseAdmin
    .from('assistance_requests')
    .update({ timeline: [...(timeline ?? []), newEvent] })
    .eq('id', requestId)

  if (updateError)
    logger.error('[assisteur/relance] timeline update:', updateError.message)

  return NextResponse.json({
    ok:                true,
    agencies_notified: notifPayloads.length,
  })
}
