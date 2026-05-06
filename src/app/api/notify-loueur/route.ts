import { NextRequest, NextResponse } from 'next/server'
import { createClient }             from '@supabase/supabase-js'
import { MOCK_RENTAL_AGENCIES }     from '@/data/mockRentalAgencies'
import { VEHICLE_CATEGORY_LABELS }  from '@/types/vehicleCategory'
import { sendEmail }                from '@/lib/email'
import { buildLoueurEmailHtml }     from '@/lib/loueurEmail'
import type { AssistanceRequest }   from '@/types/request'

// Client admin (service_role) — server-side uniquement, jamais exposé au client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  let request: AssistanceRequest

  try {
    const body = await req.json()
    request = body.request
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  // Agences uniques ciblées
  const agencyIds = [
    ...(request.assignedAgencyIds ?? []),
    ...(request.assignedAgencyId ? [request.assignedAgencyId] : []),
  ].filter((v, i, a) => a.indexOf(v) === i)

  const vehicleLabel = VEHICLE_CATEGORY_LABELS[request.vehicleCategory] ?? request.vehicleCategory
  const address      = request.location.address

  console.log(`[notify-loueur] demande ${request.id} → ${agencyIds.length} agence(s)`)

  for (const agencyId of agencyIds) {
    const agency = MOCK_RENTAL_AGENCIES.find(a => a.id === agencyId)

    // ── 1. Notification plateforme (Supabase) ────────────────────────────────
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
      id:         notifId,
      agency_id:  agencyId,
      type:       'new_request',
      title:      `Nouvelle demande — ${address}`,
      body:       `${vehicleLabel} · ${request.durationDays}j`,
      request_id: request.id,
    })

    if (notifErr) {
      console.error(`[notify-loueur] notif Supabase échouée pour ${agencyId}:`, notifErr.message)
    } else {
      console.log(`[notify-loueur] notif créée pour ${agencyId}`)
    }

    // ── 2. Email (best-effort, indépendant de la notif) ──────────────────────
    if (agency?.email) {
      const requestUrl = `${APP_URL}/loueur/demandes/${request.id}`
      sendEmail({
        to:      agency.email,
        subject: request.requestType === 'immediate'
          ? `⚡ Demande immédiate DRIVES ON — ${vehicleLabel}`
          : `Nouvelle demande DRIVES ON — ${vehicleLabel}`,
        html: buildLoueurEmailHtml({
          agencyName:    agency.name,
          dossierNumber: request.dossierNumber,
          address,
          vehicleLabel,
          durationDays:     request.durationDays,
          dateNeeded:       request.dateNeeded,
          maxExtensionDays: request.maxExtensionDays,
          coverageType:     request.coverage.creditType,
          requestType:      request.requestType,
          targetPrice:      request.targetPricePerDay,
          agencyCount:      agencyIds.length,
          requestUrl,
        }),
      })
        .then(() => console.log(`[notify-loueur] email envoyé à ${agency.email}`))
        .catch(err => console.error(`[notify-loueur] email échoué pour ${agency.email}:`, err))
    } else {
      console.log(`[notify-loueur] pas d'email pour ${agencyId} (agence inconnue ou sans email)`)
    }
  }

  return NextResponse.json({ ok: true })
}
