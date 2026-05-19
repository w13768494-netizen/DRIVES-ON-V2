import type { AssistanceRequest, RequestStatus } from './request'
import type { RequestDocumentType } from './requestDocument'
import type { AdminAlert } from './adminAlert'

export type AdminUxStatus =
  | 'en_attente'
  | 'en_cours'
  | 'docs_manquants'
  | 'attente_paiement'
  | 'cloturee'
  | 'archivee'

export type AdminUrgencyLevel = 'critique' | 'urgent' | 'attention' | 'normal'

export type AdminPaymentStatus = 'en_attente' | 'paye' | 'non_applicable'

export const ADMIN_UX_STATUS_LABELS: Record<AdminUxStatus, string> = {
  en_attente:       'En attente',
  en_cours:         'En cours',
  docs_manquants:   'Docs manquants',
  attente_paiement: 'Attente paiement',
  cloturee:         'Clôturée',
  archivee:         'Archivée',
}

export const ADMIN_UX_STATUS_COLORS: Record<AdminUxStatus, string> = {
  en_attente:       'bg-amber-100 text-amber-800',
  en_cours:         'bg-blue-100 text-blue-700',
  docs_manquants:   'bg-red-100 text-red-700',
  attente_paiement: 'bg-violet-100 text-violet-700',
  cloturee:         'bg-slate-100 text-slate-500',
  archivee:         'bg-slate-50 text-slate-400',
}

export const ADMIN_PAYMENT_LABELS: Record<AdminPaymentStatus, string> = {
  en_attente:     'À payer',
  paye:           'Payé',
  non_applicable: '',
}

export const ADMIN_PAYMENT_COLORS: Record<AdminPaymentStatus, string> = {
  en_attente:     'bg-violet-100 text-violet-700',
  paye:           'bg-green-100 text-green-700',
  non_applicable: '',
}

// Documents requis par statut — règle métier centralisée ici
export const REQUIRED_DOCS_BY_STATUS: Partial<Record<RequestStatus, RequestDocumentType[]>> = {
  acceptee:  ['prise_en_charge'],
  confirmee: ['prise_en_charge', 'contrat'],
  honoree:   ['prise_en_charge', 'contrat', 'etat_retour', 'facture'],
  cloturee:  ['prise_en_charge', 'contrat', 'etat_retour', 'facture'],
}

export const MISSING_DOC_SHORT_LABELS: Record<RequestDocumentType, string> = {
  prise_en_charge: 'PC',
  contrat:         'Ctr',
  etat_depart:     'EdL↑',
  etat_retour:     'EdL↓',
  facture:         'Fct',
  autre:           'Autre',
}

export interface AdminReservation extends AssistanceRequest {
  uxStatus:                 AdminUxStatus
  urgencyLevel:             AdminUrgencyLevel
  paymentStatus:            AdminPaymentStatus
  missingDocuments:         RequestDocumentType[]
  lastActivityAt:           Date
  minutesSinceLastActivity: number
  alerts:                   AdminAlert[]
}

export interface AdminReservationKpis {
  en_attente:         number
  en_cours:           number
  docs_manquants:     number
  attente_paiement:   number
  cloturee:           number
  archivee:           number
  total:              number
  alertes_critiques:  number  // dossiers avec ≥1 alerte rouge
}
