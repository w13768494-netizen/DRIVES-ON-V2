import { supabase }           from '@/lib/supabaseClient'
import type { AdminPaymentStatus } from '@/types/adminReservation'
import type { RequestStatus }      from '@/types/request'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminFinanceRow {
  id:                    string
  dossierNumber:         string
  status:                RequestStatus      // statut opérationnel — jamais fusionné avec paymentStatus
  confirmedAgencyName:   string | null
  partnerName:           string | null      // résolu depuis profiles (company_name ?? full_name)
  confirmedPricePerDay:  number | null
  confirmedDurationDays: number | null
  commissionRate:        number
  commissionAmount:      number | null
  totalAmountHt:         number | null
  amountDueToLoueur:     number | null
  paymentStatus:         AdminPaymentStatus
  paymentValidatedAt:    Date | null
  createdAt:             Date
}

export interface AdminFinanceKpis {
  totalHt:           number  // somme total_amount_ht (dossiers avec montants seulement)
  totalCommission:   number  // somme commission_amount
  totalDueToLoueurs: number  // somme amount_due_to_loueur
  enAttente:         number
  pretAPayer:        number
  paye:              number
  litigieux:         number
}

// ── Interne ───────────────────────────────────────────────────────────────────

const VALID_PAYMENT_STATUSES: AdminPaymentStatus[] = [
  'non_applicable', 'en_attente', 'pret_a_payer', 'paye', 'litigieux',
]

type DbRow = {
  id:                      string
  dossier_number:          string
  status:                  string
  created_by_user_id:      string | null
  confirmed_agency_name:   string | null
  confirmed_price_per_day: number | null
  confirmed_duration_days: number | null
  commission_rate:         number | null
  commission_amount:       number | null
  total_amount_ht:         number | null
  amount_due_to_loueur:    number | null
  payment_status:          string | null
  payment_validated_at:    string | null
  created_at:              string
}

// ── API publique ──────────────────────────────────────────────────────────────

export async function getAdminFinanceRows(): Promise<AdminFinanceRow[]> {
  const { data, error } = await supabase
    .from('assistance_requests')
    .select(
      'id, dossier_number, status, created_by_user_id, confirmed_agency_name, ' +
      'confirmed_price_per_day, confirmed_duration_days, commission_rate, ' +
      'commission_amount, total_amount_ht, amount_due_to_loueur, ' +
      'payment_status, payment_validated_at, created_at',
    )
    .neq('status', 'brouillon')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[adminFinanceService] getAdminFinanceRows:', error.message)
    return []
  }

  const rows = (data ?? []) as unknown as DbRow[]

  // Résolution batch des noms partenaires (1 requête, pas N)
  const userIds = [...new Set(
    rows.map(r => r.created_by_user_id).filter(Boolean),
  )] as string[]

  const nameMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, company_name')
      .in('id', userIds)
    for (const p of (profiles ?? []) as { id: string; full_name: string; company_name: string | null }[]) {
      nameMap.set(p.id, p.company_name ?? p.full_name)
    }
  }

  return rows.map(r => {
    const ps = r.payment_status as AdminPaymentStatus
    return {
      id:                    r.id,
      dossierNumber:         r.dossier_number,
      status:                r.status as RequestStatus,
      confirmedAgencyName:   r.confirmed_agency_name,
      partnerName:           r.created_by_user_id ? (nameMap.get(r.created_by_user_id) ?? null) : null,
      confirmedPricePerDay:  r.confirmed_price_per_day,
      confirmedDurationDays: r.confirmed_duration_days,
      commissionRate:        r.commission_rate ?? 0.15,
      commissionAmount:      r.commission_amount,
      totalAmountHt:         r.total_amount_ht,
      amountDueToLoueur:     r.amount_due_to_loueur,
      paymentStatus:         VALID_PAYMENT_STATUSES.includes(ps) ? ps : 'non_applicable',
      paymentValidatedAt:    r.payment_validated_at ? new Date(r.payment_validated_at) : null,
      createdAt:             new Date(r.created_at),
    }
  })
}

export function computeFinanceKpis(rows: AdminFinanceRow[]): AdminFinanceKpis {
  let totalHt = 0, totalCommission = 0, totalDueToLoueurs = 0
  let enAttente = 0, pretAPayer = 0, paye = 0, litigieux = 0

  for (const r of rows) {
    if (r.totalAmountHt     != null) totalHt           += r.totalAmountHt
    if (r.commissionAmount  != null) totalCommission   += r.commissionAmount
    if (r.amountDueToLoueur != null) totalDueToLoueurs += r.amountDueToLoueur
    if (r.paymentStatus === 'en_attente')   enAttente++
    if (r.paymentStatus === 'pret_a_payer') pretAPayer++
    if (r.paymentStatus === 'paye')         paye++
    if (r.paymentStatus === 'litigieux')    litigieux++
  }

  return { totalHt, totalCommission, totalDueToLoueurs, enAttente, pretAPayer, paye, litigieux }
}
