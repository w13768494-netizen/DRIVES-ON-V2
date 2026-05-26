import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase/admin'
import { sendEmail }                 from '@/lib/email'

// UUID réservé pour les actions système automatiques (non lié à un utilisateur réel)
const SYSTEM_CRON_UUID = '00000000-0000-0000-0000-000000000001'

// ── SLA thresholds ────────────────────────────────────────────────────────────
const SLA_IMMEDIATE_MS = 45 * 60 * 1000       // 45 minutes
const SLA_PLANIFIEE_MS = 4  * 60 * 60 * 1000  // 4 heures
const ANTI_SPAM_MS     = 2  * 60 * 60 * 1000  // délai min entre deux relances
const MAX_RELANCES     = 3

// ── Auth cron ─────────────────────────────────────────────────────────────────
//
// Appelé par Vercel Cron (Authorization: Bearer <CRON_SECRET>)
// ou manuellement via /api/cron/check-sla?secret=<CRON_SECRET>
//
// vercel.json :
//   "crons": [{ "path": "/api/cron/check-sla", "schedule": "*/15 * * * *" }]
// Note : schedule sub-hourly requiert Vercel Pro

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const bearer = req.headers.get('authorization')?.replace('Bearer ', '')
  if (bearer === secret) return true
  const qs = new URL(req.url).searchParams.get('secret')
  return qs === secret
}

// ── Types row DB ──────────────────────────────────────────────────────────────

type TlEntry = { type: string; at: string; [key: string]: unknown }

type Row = {
  id:                  string
  dossier_number:      string
  request_type:        'immediate' | 'planifiee'
  status:              string
  timeline:            TlEntry[] | null
  assigned_agency_id:  string | null
  assigned_agency_ids: string[] | null
  created_by_user_id:  string | null
}

// ── Helpers timeline ──────────────────────────────────────────────────────────

function eventsOfType(tl: TlEntry[], type: string): TlEntry[] {
  return tl.filter(e => e.type === type)
}

function latestDate(events: TlEntry[]): Date | null {
  if (events.length === 0) return null
  const ts = events.map(e => new Date(e.at).getTime()).filter(t => !isNaN(t))
  return ts.length === 0 ? null : new Date(Math.max(...ts))
}

// ── Email relance ─────────────────────────────────────────────────────────────

function buildRelanceHtml(agencyName: string, dossierNumber: string, requestUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:sans-serif;color:#1e293b;max-width:500px;margin:0 auto;padding:24px">
  <p>Bonjour <strong>${agencyName}</strong>,</p>
  <p>Une demande DRIVES ON (<strong>#${dossierNumber}</strong>) attend toujours votre réponse.</p>
  <p>
    <a href="${requestUrl}"
       style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
      Voir la demande
    </a>
  </p>
  <p style="color:#64748b;font-size:12px;margin-top:24px">
    Cet email est envoyé automatiquement par DRIVES ON. Ne pas répondre à ce message.
  </p>
</body>
</html>`
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) { return handleCron(req) }
export async function POST(req: NextRequest) { return handleCron(req) }

async function handleCron(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now    = new Date()
  const nowIso = now.toISOString()

  const appUrl = (() => {
    try {
      const url = process.env.NEXT_PUBLIC_APP_URL
      return (url ?? 'https://app.drives-on.fr').replace(/\/$/, '')
    } catch {
      return 'https://app.drives-on.fr'
    }
  })()

  // ── 1. Charger les dossiers envoyee + recue ───────────────────────────────
  const { data: rows, error: fetchErr } = await supabaseAdmin
    .from('assistance_requests')
    .select(
      'id, dossier_number, request_type, status, timeline, ' +
      'assigned_agency_id, assigned_agency_ids, created_by_user_id',
    )
    .in('status', ['envoyee', 'recue'])

  if (fetchErr) {
    console.error('[cron/check-sla] fetch error:', fetchErr.message)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ processed: 0, relanced: 0 })
  }

  const candidates = rows as unknown as Row[]
  let relancedCount = 0
  const errors: string[] = []

  for (const row of candidates) {
    const timeline = (row.timeline ?? []) as TlEntry[]

    // ── 2. Date du dernier envoi ─────────────────────────────────────────────
    const lastEnvoiAt = latestDate(eventsOfType(timeline, 'envoi'))
    if (!lastEnvoiAt) continue

    // ── 3. SLA dépassé ? ─────────────────────────────────────────────────────
    const slaMs = row.request_type === 'immediate' ? SLA_IMMEDIATE_MS : SLA_PLANIFIEE_MS
    if (now.getTime() - lastEnvoiAt.getTime() < slaMs) continue

    // ── 4. Max relances atteint ? ────────────────────────────────────────────
    const relanceEvents = eventsOfType(timeline, 'relance_auto')
    if (relanceEvents.length >= MAX_RELANCES) continue

    // ── 5. Anti-spam (délai entre deux relances) ─────────────────────────────
    if (relanceEvents.length > 0) {
      const lastRelanceAt = latestDate(relanceEvents)!
      if (now.getTime() - lastRelanceAt.getTime() < ANTI_SPAM_MS) continue
    }

    // ── 6. Construire l'événement relance_auto ───────────────────────────────
    const relanceNum = relanceEvents.length + 1
    const relanceEvt: TlEntry = {
      id:      `evt-sla-${row.id}-${Date.now()}`,
      type:    'relance_auto',
      at:      nowIso,
      byRole:  'system',
      message: `Relance automatique #${relanceNum}`,
    }

    // ── 7. UPDATE (verrou optimiste sur status) ──────────────────────────────
    const { error: updateErr } = await supabaseAdmin
      .from('assistance_requests')
      .update({ timeline: [...timeline, relanceEvt] })
      .eq('id', row.id)
      .in('status', ['envoyee', 'recue'])

    if (updateErr) {
      errors.push(`${row.id}: ${updateErr.message}`)
      continue
    }

    relancedCount++

    // ── 8. Notifications ─────────────────────────────────────────────────────

    const agencyIds = [
      ...(row.assigned_agency_ids ?? []),
      ...(row.assigned_agency_id ? [row.assigned_agency_id] : []),
    ].filter((v, i, a) => a.indexOf(v) === i)

    const notifInserts: Array<Record<string, unknown>> = []

    for (const agencyId of agencyIds) {
      const { data: agency } = await supabaseAdmin
        .from('rental_agencies')
        .select('id, owner_id, email, agency_name')
        .or(`id.eq.${agencyId},external_id.eq.${agencyId}`)
        .maybeSingle()

      if (agency?.owner_id) {
        notifInserts.push({
          agency_id:  agencyId,
          user_id:    agency.owner_id,
          type:       'sla_relance',
          title:      `Rappel — Demande #${row.dossier_number} en attente`,
          body:       'Cette demande attend toujours votre réponse.',
          request_id: row.id,
        })
      }

      if (agency?.email) {
        const requestUrl = `${appUrl}/loueur/demandes/${row.id}`
        await sendEmail({
          to:      agency.email,
          subject: `⏰ Rappel — Demande DRIVES ON #${row.dossier_number} en attente`,
          html:    buildRelanceHtml(agency.agency_name ?? 'Partenaire', row.dossier_number, requestUrl),
          text:    `Une demande DRIVES ON (#${row.dossier_number}) attend votre réponse : ${requestUrl}`,
        }).catch(err => console.error(`[cron/check-sla] email loueur ${agencyId}:`, err))
      }
    }

    // Notification partenaire créateur
    if (row.created_by_user_id) {
      notifInserts.push({
        agency_id:  null,
        user_id:    row.created_by_user_id,
        type:       'sla_relance',
        title:      `Relance auto — Demande #${row.dossier_number}`,
        body:       `Relance automatique #${relanceNum} envoyée — aucune réponse loueur reçue.`,
        request_id: row.id,
      })
    }

    if (notifInserts.length > 0) {
      const { error: notifErr } = await supabaseAdmin
        .from('notifications')
        .insert(notifInserts)
      if (notifErr) {
        console.error(`[cron/check-sla] notif error pour ${row.id}:`, notifErr.message)
      }
    }

    // ── 9. Audit log ─────────────────────────────────────────────────────────
    await supabaseAdmin.from('admin_audit_logs').insert({
      admin_id:    SYSTEM_CRON_UUID,
      action:      'sla_relance',
      target_type: 'request',
      target_id:   row.id,
      before_json: { relanceCount: relanceEvents.length },
      after_json:  { relanceCount: relanceNum },
      metadata:    { source: 'cron/check-sla', requestType: row.request_type },
    }).then(({ error }) => {
      if (error) console.error(`[cron/check-sla] audit log ${row.id}:`, error.message)
    })
  }

  console.log(
    `[cron/check-sla] ${candidates.length} dossiers analysés — ` +
    `${relancedCount} relancé(s) — ${errors.length} erreur(s)`,
  )

  return NextResponse.json({
    processed: candidates.length,
    relanced:  relancedCount,
    errors:    errors.length > 0 ? errors : undefined,
  })
}
