import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin }                  from '@/lib/supabase/admin'
import { requireAdmin }                   from '@/lib/requireAdmin'
import { randomUUID }                     from 'crypto'
import type { RequestStatus }             from '@/types/request'
import { REQUEST_DOCUMENT_TYPE_LABELS }   from '@/types/requestDocument'
import type { RequestDocumentType }       from '@/types/requestDocument'

// Whitelist stricte des transitions admin autorisées
type Transition = { from: RequestStatus; to: RequestStatus; label: string }
const WHITELIST: Transition[] = [
  // ── Corrections flux normal ──────────────────────────────────────────────
  { from: 'envoyee',          to: 'recue',     label: 'Notification manquée — marquée reçue manuellement' },
  { from: 'recue',            to: 'envoyee',   label: 'Réception incorrecte — retour envoyée' },
  { from: 'transfert_valide', to: 'envoyee',   label: 'Déblocage transfert bloqué — retour envoyée' },
  { from: 'transfert_valide', to: 'recue',     label: 'Déblocage transfert bloqué — retour reçue' },
  { from: 'honoree',          to: 'cloturee',  label: 'Clôture manuelle — paiement validé hors système' },
  // ── Résolution overdue ───────────────────────────────────────────────────
  { from: 'overdue',          to: 'confirmee', label: 'Résolution overdue — prolongation rétroactive accordée par admin' },
  { from: 'overdue',          to: 'honoree',   label: 'Retour véhicule déclaré manuellement sur dossier overdue' },
  // ── Résolution litige dégât ──────────────────────────────────────────────
  { from: 'litige_degat',     to: 'honoree',   label: 'Litige dégât résolu — dossier remis en honorée' },
]

// Statuts explicitement refusés en destination (transitions réservées au flux métier)
const FORBIDDEN_TO: RequestStatus[] = [
  'brouillon', 'refusee', 'acceptee', 'transfert_propose', 'transferee',
  // confirmee, honoree, overdue, litige_degat : accessibles via whitelist uniquement
]
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
    .select('id, status, timeline, coverage_type, has_damage_claim')
    .eq('id', requestId)
    .single()

  if (fetchError || !row)
    return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 })

  const { status: fromStatus, timeline, coverage_type, has_damage_claim } = row as {
    status:           RequestStatus
    timeline:         Array<Record<string, unknown>>
    coverage_type:    string | null
    has_damage_claim: boolean | null
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

  // ── Note obligatoire pour résolution de litige dégât ─────────────────────────
  if (fromStatus === 'litige_degat' && toStatus === 'honoree') {
    if (!message || message.trim().length < 10)
      return NextResponse.json(
        { error: 'Une note de résolution (minimum 10 caractères) est obligatoire pour résoudre un litige dégât.' },
        { status: 422 },
      )
  }

  // ── Guard documentaire : clôture conditionnelle ───────────────────────────────
  if (fromStatus === 'honoree' && toStatus === 'cloturee') {
    const { data: docs } = await supabaseAdmin
      .from('request_documents')
      .select('type, validation_status')
      .eq('request_id', requestId)

    // Types présents → compter valid, pending, rejected par type
    const counts = new Map<string, { valid: number; pending: number; rejected: number }>()
    for (const d of docs ?? []) {
      const t = d.type as string
      if (!counts.has(t)) counts.set(t, { valid: 0, pending: 0, rejected: 0 })
      const c = counts.get(t)!
      const vs = (d.validation_status as string) ?? 'pending'
      if (vs === 'valid')    c.valid++
      else if (vs === 'pending')  c.pending++
      else if (vs === 'rejected') c.rejected++
    }

    // Construire la liste des types requis pour la clôture
    const required: RequestDocumentType[] = [
      ...(coverage_type !== 'none' ? ['prise_en_charge' as RequestDocumentType] : []),
      'contrat',
      'etat_retour',
      'facture',
      ...(has_damage_claim ? ['etat_depart' as RequestDocumentType] : []),
    ]

    for (const docType of required) {
      const c = counts.get(docType)
      if (!c) {
        return NextResponse.json(
          { error: `Document manquant : ${REQUEST_DOCUMENT_TYPE_LABELS[docType]}` },
          { status: 422 },
        )
      }
      // Bloquant uniquement si aucun valid ET aucun pending (tous rejected)
      if (c.valid === 0 && c.pending === 0) {
        return NextResponse.json(
          { error: `Document refusé : ${REQUEST_DOCUMENT_TYPE_LABELS[docType]} — uploadez une nouvelle version pour débloquer la clôture` },
          { status: 422 },
        )
      }
    }
  }

  // ── Read-modify-write : status + timeline en un seul UPDATE ──────────────────
  const now = new Date().toISOString()
  // Utiliser le type d'événement sémantique pour les résolutions métier clés
  const eventType =
    fromStatus === 'litige_degat' && toStatus === 'honoree'   ? 'litige_resolu'
    : fromStatus === 'overdue'    && toStatus === 'confirmee'  ? 'admin_changement_statut'
    : fromStatus === 'overdue'    && toStatus === 'honoree'    ? 'retour_confirme'
    : 'admin_changement_statut'

  const newEvent = {
    id:      randomUUID(),
    type:    eventType,
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
