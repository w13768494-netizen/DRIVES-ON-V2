import { NextResponse }  from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAdmin }  from '@/lib/requireAdmin'

// ── Formules score (explicables, /100) ────────────────────────────────────────

function scoreReactivity(avgMin: number | null): number {
  if (avgMin === null) return 0
  if (avgMin <= 15)   return 40
  if (avgMin <= 60)   return 30
  if (avgMin <= 240)  return 20
  if (avgMin <= 1440) return 10
  return 0
}

function scoreResponseRate(ratePct: number | null): number {
  if (ratePct === null) return 0
  return Math.round(Math.min(40, ratePct * 0.40))
}

function scoreReliability(nbLitigieux: number, nbAnomalie: number): number {
  return Math.max(0, 20 - 5 * nbLitigieux - 3 * nbAnomalie)
}

// ── Types internes ────────────────────────────────────────────────────────────

type TimelineEvent = {
  type:       string
  agencyId?:  string
  at:         string
}

type RequestRow = {
  id:                  string
  confirmed_agency_id: string | null
  admin_flags:         string[] | null
  payment_status:      string | null
  timeline:            TimelineEvent[]
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const now = new Date().toISOString()

  // 1 — Charger toutes les agences actives
  const { data: agencies, error: agErr } = await supabaseAdmin
    .from('rental_agencies')
    .select('id')
    .eq('active', true)

  if (agErr || !agencies)
    return NextResponse.json({ error: 'Impossible de charger les agences' }, { status: 500 })

  // 2 — Charger toutes les demandes (une seule requête pour toutes les agences)
  const { data: requests, error: reqErr } = await supabaseAdmin
    .from('assistance_requests')
    .select('id, confirmed_agency_id, admin_flags, payment_status, timeline')

  if (reqErr || !requests)
    return NextResponse.json({ error: 'Impossible de charger les demandes' }, { status: 500 })

  const reqs = requests as RequestRow[]

  // 3 — Calculer et persister les métriques par agence
  const updated: string[] = []
  const errors:  string[] = []

  for (const agency of agencies as { id: string }[]) {
    try {
      const id = agency.id

      // Demandes où cette agence a reçu un envoi
      const received = reqs.filter(r =>
        r.timeline.some(e => e.type === 'envoi' && e.agencyId === id)
      )
      const total_received  = received.length
      const total_confirmed = reqs.filter(r => r.confirmed_agency_id === id).length

      // Demandes avec au moins une réponse (confirmation ou négociation) de cette agence
      const responded = received.filter(r =>
        r.timeline.some(e =>
          ['confirmation', 'negociation'].includes(e.type) && e.agencyId === id
        )
      ).length

      const response_rate_pct = total_received > 0
        ? Math.round(responded / total_received * 1000) / 10  // 1 décimale
        : null

      // Temps moyen de réponse : envoi.at → first(confirmation|negociation).at
      const delaysMin: number[] = []
      for (const r of received) {
        const envoi = r.timeline.find(e => e.type === 'envoi' && e.agencyId === id)
        const resp  = r.timeline.find(e =>
          ['confirmation', 'negociation'].includes(e.type) && e.agencyId === id
        )
        if (envoi && resp) {
          const delay = (new Date(resp.at).getTime() - new Date(envoi.at).getTime()) / 60000
          if (delay >= 0) delaysMin.push(delay)
        }
      }
      const avg_response_min = delaysMin.length > 0
        ? Math.round(delaysMin.reduce((a, b) => a + b, 0) / delaysMin.length * 10) / 10
        : null

      // Incidents sur dossiers confirmés par cette agence
      const nb_litigieux = reqs.filter(r =>
        r.confirmed_agency_id === id &&
        ((r.admin_flags ?? []).includes('litigieux') || r.payment_status === 'litigieux')
      ).length
      const nb_anomalie = reqs.filter(r =>
        r.confirmed_agency_id === id &&
        (r.admin_flags ?? []).includes('anomalie')
      ).length

      // Calcul du score — null si aucune donnée reçue
      const score_reactivity    = scoreReactivity(avg_response_min)
      const score_response_rate = scoreResponseRate(response_rate_pct)
      const score_reliability   = scoreReliability(nb_litigieux, nb_anomalie)
      const score_total = total_received === 0
        ? null
        : score_reactivity + score_response_rate + score_reliability

      const { error: upErr } = await supabaseAdmin
        .from('rental_agencies')
        .update({
          total_received,
          total_confirmed,
          avg_response_min:    avg_response_min ?? null,
          score_reactivity:    score_total !== null ? score_reactivity    : null,
          score_response_rate: score_total !== null ? score_response_rate : null,
          score_reliability:   score_total !== null ? score_reliability   : null,
          score_total,
          score_updated_at:    now,
        })
        .eq('id', id)

      if (upErr) errors.push(`${id}: ${upErr.message}`)
      else       updated.push(id)

    } catch (e) {
      errors.push(`${agency.id}: ${String(e)}`)
    }
  }

  return NextResponse.json({
    ok:          true,
    updated:     updated.length,
    errors,
    refreshedAt: now,
  })
}
