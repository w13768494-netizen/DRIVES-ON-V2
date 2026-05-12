import { NextRequest, NextResponse }                       from 'next/server'
import { supabaseAdmin }                                   from '@/lib/supabase/admin'
import { requireAuth }                                     from '@/lib/requireAuth'
import * as Sentry                                         from '@sentry/nextjs'
import { VEHICLE_CATEGORY_LABELS }                         from '@/types/vehicleCategory'
import { sendEmail }                                       from '@/lib/email'
import { buildLoueurEmailHtml, buildLoueurEmailText }      from '@/lib/loueurEmail'
import { getAppUrl }                                       from '@/lib/appUrl'
import type { AssistanceRequest }                          from '@/types/request'

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response

  if (auth.role !== 'assisteur' && auth.role !== 'admin') {
    return NextResponse.json({ ok: false, error: 'Accès non autorisé' }, { status: 403 })
  }

  let request: AssistanceRequest
  try {
    const body = await req.json()
    request = body.request
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  // Fail-fast si APP_URL manquante (prod uniquement — évite des liens morts silencieux)
  const appUrl = getAppUrl()

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
    // Requête unique — owner_id + email + agency_name ; gère UUID et external_id
    const { data: agencyRow } = await supabaseAdmin
      .from('rental_agencies')
      .select('owner_id, email, agency_name')
      .or(`id.eq.${agencyId},external_id.eq.${agencyId}`)
      .maybeSingle()

    // ── 1. Notification plateforme (Supabase) ──────────────────────────────
    // Requiert owner_id (user_id NOT NULL dans le schéma).
    // Si l'agence n'a pas de propriétaire connu, on saute la notification in-app.
    if (agencyRow?.owner_id) {
      const { error: notifErr } = await supabaseAdmin.from('notifications').insert({
        agency_id:  agencyId,
        user_id:    agencyRow.owner_id,
        type:       'new_request',
        title:      `Nouvelle demande — ${address}`,
        body:       `${vehicleLabel} · ${request.durationDays}j`,
        request_id: request.id,
      })
      if (notifErr) {
        console.error(`[notify-loueur] notif Supabase échouée pour ${agencyId}:`, notifErr.message)
      }
    }

    // ── 2. Email ────────────────────────────────────────────────────────────
    if (agencyRow?.email) {
      const requestUrl   = `${appUrl}/loueur/demandes/${request.id}`
      const emailParams  = {
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
      }
      const emailResult = await sendEmail({
        to:      agencyRow.email,
        subject: request.requestType === 'immediate'
          ? `⚡ Demande immédiate DRIVES ON — ${vehicleLabel}`
          : `Nouvelle demande DRIVES ON — ${vehicleLabel}`,
        html: buildLoueurEmailHtml(emailParams),
        text: buildLoueurEmailText(emailParams),
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

  if (emailsFailed > 0) {
    Sentry.captureEvent({
      message: '[notify-loueur] Email delivery failures',
      level:   'warning',
      extra:   { requestId: request.id, emailsSent, emailsFailed, totalAgencies: agencyIds.length },
    })
  }

  return NextResponse.json({ ok: true, emailsSent, emailsFailed })
}
