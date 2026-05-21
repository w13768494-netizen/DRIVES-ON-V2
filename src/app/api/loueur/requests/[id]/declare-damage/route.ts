import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAuth }                    from '@/lib/requireAuth'

// POST /api/loueur/requests/[id]/declare-damage
// Body JSON : { description: string }
// Accessible : loueur assigné à la demande
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  if (auth.role !== 'loueur') {
    return NextResponse.json({ error: 'Accès réservé aux loueurs.' }, { status: 403 })
  }

  const { id: requestId } = await params

  let description = ''
  try {
    const body = await request.json() as { description?: string }
    description = body.description?.trim() ?? ''
  } catch {
    // description optionnelle
  }

  // Vérifier que la demande existe et est en statut honoree
  const { data: ar, error: arErr } = await supabaseAdmin
    .from('assistance_requests')
    .select('id, status, assigned_agency_id, assigned_agency_ids, has_damage_claim, created_by_user_id, dossier_number')
    .eq('id', requestId)
    .single()

  if (arErr || !ar) {
    return NextResponse.json({ error: 'Demande introuvable.' }, { status: 404 })
  }

  if (ar.status !== 'honoree') {
    return NextResponse.json(
      { error: 'La déclaration de sinistre n\'est possible qu\'après le retour du véhicule.' },
      { status: 400 },
    )
  }

  if (ar.has_damage_claim) {
    return NextResponse.json({ error: 'Un sinistre a déjà été déclaré sur ce dossier.' }, { status: 409 })
  }

  // Vérifier que le loueur est bien assigné à cette demande
  const { data: agency } = await supabaseAdmin
    .from('rental_agencies')
    .select('id, external_id')
    .eq('owner_id', auth.userId)

  const agencyIds = (agency ?? []).flatMap(a => [a.id, a.external_id].filter(Boolean))
  const assigned  = [ar.assigned_agency_id, ...(ar.assigned_agency_ids ?? [])]
  const hasAccess = agencyIds.some(aid => assigned.includes(aid))

  if (!hasAccess) {
    return NextResponse.json({ error: 'Accès non autorisé à cette demande.' }, { status: 403 })
  }

  // Ajouter l'événement sinistre_declare à la timeline
  const { data: current } = await supabaseAdmin
    .from('assistance_requests')
    .select('timeline')
    .eq('id', requestId)
    .single()

  const existingTimeline = (current?.timeline as unknown[]) ?? []
  const newEvent = {
    id:      `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    type:    'sinistre_declare',
    at:      new Date().toISOString(),
    byRole:  'loueur',
    message: description || undefined,
  }

  const { error: updateErr } = await supabaseAdmin
    .from('assistance_requests')
    .update({
      status:             'litige_degat',   // Statut persisté — bloque la clôture
      has_damage_claim:   true,
      damage_description: description || null,
      timeline:           [...existingTimeline, newEvent],
    })
    .eq('id', requestId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Notifier l'admin et le partenaire
  type ArRow = {
    status: string
    assigned_agency_id: string | null
    assigned_agency_ids: string[] | null
    has_damage_claim: boolean
    created_by_user_id: string | null
    dossier_number: string
  }
  const arTyped = ar as unknown as ArRow

  const notifInserts: Array<Record<string, unknown>> = []

  // Notifier le partenaire
  if (arTyped.created_by_user_id) {
    notifInserts.push({
      agency_id:  null,
      user_id:    arTyped.created_by_user_id,
      type:       'damage_claim',
      title:      `Sinistre déclaré — dossier #${arTyped.dossier_number}`,
      body:       description
        ? `Le loueur a déclaré un dégât : ${description.slice(0, 100)}`
        : 'Le loueur a déclaré un dégât sur le véhicule. Consultez le dossier.',
      request_id: requestId,
    })
  }

  // Notifier tous les admins (best-effort via profils role=admin)
  const { data: admins } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  for (const admin of admins ?? []) {
    notifInserts.push({
      agency_id:  null,
      user_id:    admin.id,
      type:       'damage_claim',
      title:      `Sinistre déclaré — dossier #${arTyped.dossier_number}`,
      body:       `Un loueur a déclaré un dégât. Le dossier est passé en litige_degat et nécessite une action admin.`,
      request_id: requestId,
    })
  }

  if (notifInserts.length > 0) {
    await supabaseAdmin.from('notifications').insert(notifInserts)
  }

  return NextResponse.json({ success: true })
}
