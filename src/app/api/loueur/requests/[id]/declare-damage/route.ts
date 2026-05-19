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
    .select('id, status, assigned_agency_id, assigned_agency_ids, has_damage_claim')
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
      has_damage_claim: true,
      timeline:         [...existingTimeline, newEvent],
    })
    .eq('id', requestId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
