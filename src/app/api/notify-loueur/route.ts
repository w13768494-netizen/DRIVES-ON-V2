import { NextRequest, NextResponse }          from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { supabaseAdmin }                      from '@/lib/supabase/admin'
import { VEHICLE_CATEGORY_LABELS }            from '@/types/vehicleCategory'
import { sendEmail }                          from '@/lib/email'
import { buildLoueurEmailHtml }               from '@/lib/loueurEmail'
import type { AssistanceRequest }             from '@/types/request'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  // Auth : réservé aux assisteurs et admins
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Non authentifié' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !(['assisteur', 'admin'] as string[]).includes(profile.role)) {
    return NextResponse.json({ ok: false, error: 'Accès non autorisé' }, { status: 403 })
  }

  // Corps de la requête
  let request: AssistanceRequest
  try {
    const body = await req.json()
    request = body.request
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const agencyIds = [
    ...(request.assignedAgencyIds ?? []),
    ...(request.assignedAgencyId ? [request.assignedAgencyId] : []),
  ].filter((v, i, a) => a.indexOf(v) === i)

  const vehicleLabel = VEHICLE_CATEGORY_LABELS[request.vehicleCategory] ?? request.vehicleCategory
  const address      = request.location.address

  console.log(`[notify-loueur] demande ${request.id} → ${agencyIds.length} agence(s)`)

  let emailsSent   = 0
  let emailsFailed = 0

  for (const agencyId of agencyIds) {
    // Single query — fetches owner_id, email, agency_name; handles UUID and external_id
    const { data: agencyRow } = await supabaseAdmin
      .from('rental_agencies')
      .select('owner_id, email, agency_name')
      .or(`id.eq.${agencyId},external_id.eq.${agencyId}`)
      .maybeSingle()

    // ── 1. Notification plateforme (Supabase) ────────────────────────────────
    const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
      id:         notifId,
      agency_id:  agencyId,
      user_id:    agencyRow?.owner_id ?? null,
      type:       'new_request',
      title:      `Nouvelle demande — ${address}`,
      body:       `${vehicleLabel} · ${request.durationDays}j`,
      request_id: request.id,
    })

    if (notifErr) {
      console.error(`[notify-loueur] notif Supabase échouée pour ${agencyId}:`, notifErr.message)
    }

    // ── 2. Email (awaité — l'échec est loggé et compté) ──────────────────────
    if (agencyRow?.email) {
      const requestUrl  = `${APP_URL}/loueur/demandes/${request.id}`
      const emailResult = await sendEmail({
        to:      agencyRow.email,
        subject: request.requestType === 'immediate'
          ? `⚡ Demande immédiate DRIVES ON — ${vehicleLabel}`
          : `Nouvelle demande DRIVES ON — ${vehicleLabel}`,
        html: buildLoueurEmailHtml({
          agencyName:       agencyRow.agency_name,
          dossierNumber:    request.dossierNumber,
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

      if (emailResult.ok) {
        console.log(`[notify-loueur] email envoyé pour agence ${agencyId}`)
        emailsSent++
      } else {
        console.error(`[notify-loueur] email FAILED pour agence ${agencyId} : ${emailResult.error}`)
        emailsFailed++
      }
    } else {
      console.log(`[notify-loueur] agence ${agencyId} sans email — notification plateforme uniquement`)
    }
  }

  console.log(`[notify-loueur] terminé — ${emailsSent} envoyé(s), ${emailsFailed} échec(s)`)
  return NextResponse.json({ ok: true, emailsSent, emailsFailed })
}
