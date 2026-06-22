import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAdmin }                   from '@/lib/requireAdmin'
import { randomUUID }                     from 'crypto'
import { REQUEST_DOCUMENT_TYPE_LABELS }   from '@/types/requestDocument'
import type { RequestDocumentType }       from '@/types/requestDocument'
import { logger }                         from '@/lib/logger'

// POST /api/admin/documents/[id]/validate
// Body: { action: 'validate' | 'reject', note?: string }
// Admin uniquement.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id: documentId } = await params

  type Body = { action?: string; note?: string }
  const body = await request.json() as Body
  const { action, note } = body

  if (action !== 'validate' && action !== 'reject')
    return NextResponse.json({ error: 'Action invalide. Valeurs acceptées : validate, reject' }, { status: 400 })

  if (action === 'reject' && (!note || note.trim().length < 10))
    return NextResponse.json(
      { error: 'Une note de refus (minimum 10 caractères) est obligatoire.' },
      { status: 422 },
    )

  // ── Charger le document ────────────────────────────────────────────────────────
  const { data: doc, error: docErr } = await supabaseAdmin
    .from('request_documents')
    .select('id, request_id, type, file_name, validation_status')
    .eq('id', documentId)
    .single()

  if (docErr || !doc)
    return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 })

  type DocRow = { id: string; request_id: string; type: string; file_name: string; validation_status: string }
  const { request_id: requestId, type: docType, validation_status: currentStatus } = doc as unknown as DocRow

  // Idempotence : ne rien faire si le statut est déjà le même
  const targetStatus = action === 'validate' ? 'valid' : 'rejected'
  if (currentStatus === targetStatus)
    return NextResponse.json({ ok: true, alreadyInStatus: true })

  const now = new Date().toISOString()

  // ── Mettre à jour le document ─────────────────────────────────────────────────
  const { error: updateErr } = await supabaseAdmin
    .from('request_documents')
    .update({
      validation_status: targetStatus,
      validated_at:      now,
      validated_by:      auth.userId,
      validation_note:   action === 'reject' ? note!.trim() : null,
    })
    .eq('id', documentId)

  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // ── Ajouter un événement à la timeline de la demande ─────────────────────────
  const { data: arRow } = await supabaseAdmin
    .from('assistance_requests')
    .select('timeline')
    .eq('id', requestId)
    .single()

  const typeLabel = REQUEST_DOCUMENT_TYPE_LABELS[docType as RequestDocumentType] ?? docType
  const msg = action === 'validate'
    ? `Document validé : ${typeLabel}`
    : `Document refusé : ${typeLabel} — ${note!.trim()}`

  const newEvent = {
    id:      randomUUID(),
    type:    action === 'validate' ? 'document_valide' : 'document_refuse',
    at:      now,
    byRole:  'admin',
    message: msg,
  }

  await supabaseAdmin
    .from('assistance_requests')
    .update({ timeline: [...((arRow?.timeline as unknown[]) ?? []), newEvent] })
    .eq('id', requestId)

  // ── Audit log (best-effort) ───────────────────────────────────────────────────
  await supabaseAdmin.from('admin_audit_logs').insert({
    admin_id:    auth.userId,
    action:      action === 'validate' ? 'document_validated' : 'document_rejected',
    target_type: 'document',
    target_id:   documentId,
    before_json: { validation_status: currentStatus },
    after_json:  { validation_status: targetStatus },
    metadata:    { request_id: requestId, doc_type: docType, note: note?.trim() || null },
  }).then(({ error }) => {
    if (error) logger.error('[admin/documents/validate] audit log:', error.message)
  })

  return NextResponse.json({ ok: true, action, documentId, newStatus: targetStatus })
}
