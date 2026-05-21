import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase/admin'
import { addDays }                   from 'date-fns'
import type { ExtensionRequest }     from '@/types/requestExtension'

// UUID réservé pour les actions système automatiques (non lié à un utilisateur réel)
const SYSTEM_CRON_UUID = '00000000-0000-0000-0000-000000000001'

// ── Auth cron ────────────────────────────────────────────────────────────────
//
// Appelé par Vercel Cron (Authorization: Bearer <CRON_SECRET>)
// ou manuellement via /api/cron/check-overdue?secret=<CRON_SECRET>
//
// Ajouter dans vercel.json :
//   "crons": [{ "path": "/api/cron/check-overdue", "schedule": "5 0 * * *" }]

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (bearer === secret) return true
  const qs = new URL(req.url).searchParams.get('secret')
  return qs === secret
}

// ── Calcul durée effective (mirrors getEffectiveDuration côté client) ─────────

function computeEffectiveDuration(durationDays: number, extensions: ExtensionRequest[]): number {
  const extra = extensions
    .filter(e => e.status === 'acceptee')
    .reduce((acc, e) => acc + e.requestedDays, 0)
  return durationDays + extra
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  return handleCron(req)
}

export async function POST(req: NextRequest) {
  return handleCron(req)
}

async function handleCron(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now    = new Date()
  const nowIso = now.toISOString()

  // ── 1. Charger tous les dossiers confirmee ────────────────────────────────
  const { data: rows, error: fetchErr } = await supabaseAdmin
    .from('assistance_requests')
    .select(
      'id, dossier_number, date_needed, duration_days, extensions, ' +
      'timeline, assigned_agency_id, assigned_agency_ids, confirmed_agency_id, ' +
      'created_by_user_id',
    )
    .eq('status', 'confirmee')

  if (fetchErr) {
    console.error('[cron/check-overdue] fetch error:', fetchErr.message)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ processed: 0, overdue: 0 })
  }

  type Row = {
    id:                  string
    dossier_number:      string
    date_needed:         string
    duration_days:       number
    extensions:          ExtensionRequest[] | null
    timeline:            Array<Record<string, unknown>>
    assigned_agency_id:  string | null
    assigned_agency_ids: string[] | null
    confirmed_agency_id: string | null
    created_by_user_id:  string | null
  }

  const candidates = rows as unknown as Row[]

  // ── 2. Identifier les dossiers réellement overdue ─────────────────────────
  const overdueRows = candidates.filter(row => {
    const effectiveDays = computeEffectiveDuration(
      row.duration_days,
      (row.extensions ?? []) as ExtensionRequest[],
    )
    const endDate = addDays(new Date(row.date_needed), effectiveDays)
    return now >= endDate
  })

  if (overdueRows.length === 0) {
    return NextResponse.json({ processed: candidates.length, overdue: 0 })
  }

  // ── 3. Transiter chaque dossier overdue ───────────────────────────────────
  let successCount = 0
  const errors: string[] = []

  for (const row of overdueRows) {
    const newEvent = {
      id:      `evt-cron-${row.id}-${Date.now()}`,
      type:    'overdue_detecte',
      at:      nowIso,
      byRole:  'system',
      message: 'Détection automatique — date de retour dépassée',
    }

    // UPDATE avec verrou optimiste sur status = 'confirmee' — idempotent
    const { error: updateErr } = await supabaseAdmin
      .from('assistance_requests')
      .update({
        status:     'overdue',
        overdue_at: nowIso,
        timeline:   [...(row.timeline ?? []), newEvent],
      })
      .eq('id', row.id)
      .eq('status', 'confirmee')

    if (updateErr) {
      errors.push(`${row.id}: ${updateErr.message}`)
      continue
    }

    successCount++

    // ── 4. Notifications ────────────────────────────────────────────────────

    const notifTitle = `Dossier #${row.dossier_number} — OVERDUE`
    const notifBody  = 'Le véhicule devait être retourné. Traitez ce dossier en urgence.'

    const notifInserts: Array<Record<string, unknown>> = []

    // Notifier le loueur assigné
    const agencyId = row.confirmed_agency_id ?? row.assigned_agency_id
    if (agencyId) {
      const { data: agency } = await supabaseAdmin
        .from('rental_agencies')
        .select('owner_id, agency_name')
        .or(`id.eq.${agencyId},external_id.eq.${agencyId}`)
        .maybeSingle()

      if (agency?.owner_id) {
        notifInserts.push({
          agency_id:  agencyId,
          user_id:    agency.owner_id,
          type:       'overdue',
          title:      notifTitle,
          body:       `${notifBody} (${agency.agency_name ?? agencyId})`,
          request_id: row.id,
        })
      }
    }

    // Notifier le partenaire (assisteur qui a créé le dossier)
    if (row.created_by_user_id) {
      notifInserts.push({
        agency_id:  null,
        user_id:    row.created_by_user_id,
        type:       'overdue',
        title:      notifTitle,
        body:       notifBody,
        request_id: row.id,
      })
    }

    if (notifInserts.length > 0) {
      const { error: notifErr } = await supabaseAdmin
        .from('notifications')
        .insert(notifInserts)
      if (notifErr) {
        console.error(`[cron/check-overdue] notif error pour ${row.id}:`, notifErr.message)
      }
    }

    // ── 5. Audit log ─────────────────────────────────────────────────────────
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id:    SYSTEM_CRON_UUID,
      action:      'status_changed',
      target_type: 'request',
      target_id:   row.id,
      before_json: { status: 'confirmee' },
      after_json:  { status: 'overdue', overdue_at: nowIso },
      metadata:    { source: 'cron/check-overdue' },
    }).then(({ error }) => {
      if (error) console.error(`[cron/check-overdue] audit log ${row.id}:`, error.message)
    })
  }

  console.log(
    `[cron/check-overdue] ${candidates.length} confirmee analysés — ` +
    `${successCount}/${overdueRows.length} passés en overdue — ` +
    `${errors.length} erreur(s)`,
  )

  return NextResponse.json({
    processed:    candidates.length,
    overdueFound: overdueRows.length,
    overdue:      successCount,
    errors:       errors.length > 0 ? errors : undefined,
  })
}
