import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }            from '@/lib/supabase/admin'
import { requireAuth }              from '@/lib/requireAuth'
import * as Sentry                  from '@sentry/nextjs'

interface EventPayload {
  requestId:   string
  eventType:   string
  agencyId?:   string
  agencyName?: string
  pricePerDay?: number
}

interface EventLabel {
  title: string
  body:  (p: EventPayload) => string
}

const EVENT_LABELS: Record<string, EventLabel> = {
  loueur_accepte:          { title: 'Réponse reçue',      body: p => `${p.agencyName} confirme à ${p.pricePerDay ?? '?'} €/j` },
  loueur_contre_propose:   { title: 'Contre-proposition', body: p => `${p.agencyName} propose ${p.pricePerDay ?? '?'} €/j — à valider` },
  loueur_refuse:           { title: 'Demande refusée',    body: p => `${p.agencyName} ne peut pas honorer cette demande` },
  retour_confirme:         { title: 'Retour confirmé',    body: p => `${p.agencyName} — véhicule rendu, paiement à valider` },
  loueur_document_ajoute:  { title: 'Document déposé',   body: p => `${p.agencyName} a ajouté un document sur ce dossier` },
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  if (auth.role !== 'loueur' && auth.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Accès non autorisé' }, { status: 403 })
  }

  let payload: EventPayload
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const { requestId, eventType } = payload
  const agencyName = payload.agencyName ?? 'Loueur'

  if (!requestId || !eventType) {
    return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
  }

  const label = EVENT_LABELS[eventType]
  if (!label) {
    return NextResponse.json({ ok: false, error: 'unknown_event_type' }, { status: 400 })
  }

  const { data: requestRow } = await supabaseAdmin
    .from('assistance_requests')
    .select('created_by_user_id')
    .eq('id', requestId)
    .maybeSingle()

  if (!requestRow?.created_by_user_id) {
    console.error(`[notify-assisteur] request ${requestId} not found or no created_by_user_id`)
    return NextResponse.json({ ok: false, error: 'request_not_found' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.from('notifications').insert({
    user_id:    requestRow.created_by_user_id,
    agency_id:  payload.agencyId ?? null,
    type:       eventType,
    title:      label.title,
    body:       label.body({ ...payload, agencyName }),
    request_id: requestId,
  })

  if (error) {
    console.error('[notify-assisteur] insert error:', error.message)
    Sentry.captureException(error, { extra: { requestId, eventType } })
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  console.log(`[notify-assisteur] ${eventType} → assisteur ${requestRow.created_by_user_id} pour demande ${requestId}`)
  return NextResponse.json({ ok: true })
}
