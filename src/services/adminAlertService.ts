import { supabase } from '@/lib/supabaseClient'
import type { RequestStatus, RequestType, CoverageInfo, LoueurResponse } from '@/types/request'
import type { RequestDocumentType } from '@/types/requestDocument'
import type { AdminUxStatus } from '@/types/adminReservation'
import type { AdminAlert, AlertCode, AlertSeverity } from '@/types/adminAlert'

// Interface minimale — satisfaite par AdminReservation et les données du cockpit dossier
export interface AlertInput {
  status:                   RequestStatus
  requestType:              RequestType
  coverage:                 CoverageInfo
  adminFlags?:              string[]
  assignedAgencyId?:        string
  assignedAgencyIds?:       string[]
  confirmedAgencyId?:       string
  loueurResponse?:          LoueurResponse
  returnedAt?:              Date
  missingDocuments:         RequestDocumentType[]
  uxStatus:                 AdminUxStatus
  minutesSinceLastActivity: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function a(code: AlertCode, severity: AlertSeverity, label: string, detail?: string): AdminAlert {
  return { code, severity, label, detail }
}

function fmtDelay(minutes: number): string {
  if (minutes < 60)   return `Depuis ${minutes}min`
  if (minutes < 1440) return `Depuis ${Math.floor(minutes / 60)}h`
  return `Depuis ${Math.floor(minutes / 1440)}j`
}

const ACTIVE_STATUSES = new Set<RequestStatus>([
  'envoyee', 'recue', 'acceptee', 'confirmee', 'honoree',
])

const LOUEUR_DOCS: RequestDocumentType[] = ['contrat', 'etat_retour', 'facture']

// ── Alertes par dossier (sync, pas de Supabase) ───────────────────────────────

export function computeAlerts(r: AlertInput): AdminAlert[] {
  const alerts: AdminAlert[] = []
  const min = r.minutesSinceLastActivity

  // 1 — Dossier actif sans aucun loueur associé
  if (
    ACTIVE_STATUSES.has(r.status) &&
    (r.assignedAgencyIds ?? []).length === 0 &&
    !r.assignedAgencyId &&
    !r.confirmedAgencyId
  ) {
    alerts.push(a('sans_loueur', 'orange', 'Sans loueur assigné'))
  }

  // 2a — Immédiate sans réponse > 45 min
  if (r.requestType === 'immediate' && r.uxStatus === 'en_attente' && min > 45) {
    alerts.push(a('sans_reponse_immediate', 'rouge', 'Sans réponse (immédiate)', fmtDelay(min)))
  }

  // 2b — Planifiée sans réponse > 4h
  if (r.requestType === 'planifiee' && r.uxStatus === 'en_attente' && min > 240) {
    alerts.push(a('sans_reponse_planifiee', 'orange', 'Sans réponse (planifiée)', fmtDelay(min)))
  }

  // 3 — Prise en charge full/partial mais document manquant
  if (
    r.coverage.creditType !== 'client' &&
    ['acceptee', 'confirmee', 'honoree'].includes(r.status) &&
    r.missingDocuments.includes('prise_en_charge')
  ) {
    alerts.push(a('pc_manquante', 'orange', 'Prise en charge manquante'))
  }

  // 4 — Loueur confirmé mais docs loueur incomplets
  if (['confirmee', 'honoree'].includes(r.status)) {
    const missing = LOUEUR_DOCS.filter(d => r.missingDocuments.includes(d))
    if (missing.length > 0) {
      alerts.push(a('docs_loueur_manquants', 'jaune', 'Docs loueur incomplets',
        `${missing.length} manquant${missing.length > 1 ? 's' : ''}`))
    }
  }

  // 6 — Confirmée sans tarif
  if (r.status === 'confirmee' && !(r.loueurResponse?.pricePerDay)) {
    alerts.push(a('tarif_manquant', 'orange', 'Tarif confirmé manquant'))
  }

  // 7 — Flags admin
  for (const flag of (r.adminFlags ?? [])) {
    if (flag === 'litigieux')   alerts.push(a('flag_litigieux',   'rouge',  'Litigieux'))
    if (flag === 'anomalie')    alerts.push(a('flag_anomalie',    'orange', 'Anomalie signalée'))
    if (flag === 'prioritaire') alerts.push(a('flag_prioritaire', 'jaune',  'Prioritaire'))
  }

  // 8a — Transfert validé bloqué > 24h
  if (r.status === 'transfert_valide' && min > 1440) {
    alerts.push(a('transfert_bloque', 'orange', 'Transfert bloqué', fmtDelay(min)))
  }

  // 8b — Confirmée sans agence (état incohérent)
  if (r.status === 'confirmee' && !r.confirmedAgencyId) {
    alerts.push(a('confirmation_sans_agence', 'rouge', 'Confirmée sans agence'))
  }

  // 8c — Honorée sans retour véhicule depuis > 7 jours
  if (r.status === 'honoree' && !r.returnedAt && min > 10080) {
    alerts.push(a('honore_sans_retour', 'orange', 'Honorée sans retour véhicule', fmtDelay(min)))
  }

  return alerts
}

// ── Alertes système (async, niveau plateforme) ────────────────────────────────

export async function getAgencyConfigAlerts(): Promise<AdminAlert[]> {
  try {
    const { data, error } = await supabase
      .from('rental_agencies')
      .select('id')
      .eq('active', true)
      .or('lat.is.null,lng.is.null')
    if (error || !data || data.length === 0) return []
    return [{
      code:     'agence_sans_coords',
      severity: 'jaune',
      label:    'Agences sans coordonnées',
      detail:   `${data.length} agence${data.length > 1 ? 's' : ''} active${data.length > 1 ? 's' : ''} sans géolocalisation`,
    }]
  } catch (err) {
    console.error('[adminAlertService] getAgencyConfigAlerts:', err)
    return []
  }
}
