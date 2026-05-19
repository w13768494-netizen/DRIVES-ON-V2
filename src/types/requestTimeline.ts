export type TimelineEventType =
  | 'creation'
  | 'envoi'
  | 'reception'
  | 'acceptation'
  | 'refus'
  | 'transfert_propose'
  | 'transfert_valide'
  | 'transfert_refuse'
  | 'transfert'
  | 'confirmation'
  | 'negociation'
  | 'attribution'
  | 'attribution_fermee'
  | 'honore'
  | 'cloture'
  | 'prolongation_demandee'
  | 'prolongation_reponse'
  | 'retour_confirme'
  | 'paiement_valide'
  | 'admin_changement_statut'
  | 'admin_relance'
  | 'admin_finance'

export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  creation:           'Demande créée',
  envoi:              'Demande envoyée au loueur',
  reception:          'Demande reçue par le loueur',
  acceptation:        'Demande acceptée',
  refus:              'Demande refusée',
  transfert_propose:  'Transfert proposé vers une autre agence',
  transfert_valide:   'Transfert validé par l\'assisteur',
  transfert_refuse:   'Transfert refusé par l\'assisteur',
  transfert:          'Demande transférée',
  confirmation:       'Prix proposé par le loueur',
  negociation:        'Contre-offre proposée',
  attribution:        'Demande attribuée',
  attribution_fermee: 'Autres réponses fermées automatiquement',
  honore:                 'Location honorée',
  cloture:               'Dossier clôturé',
  prolongation_demandee: 'Prolongation demandée',
  prolongation_reponse:  'Réponse à la prolongation',
  retour_confirme:           'Retour du véhicule confirmé par le loueur',
  paiement_valide:           'Paiement validé par l\'assisteur',
  admin_changement_statut:   'Statut modifié par l\'administration',
  admin_relance:             'Partenaire relancé par l\'administration',
  admin_finance:             'Mise à jour financière',
}

export const TIMELINE_EVENT_COLORS: Record<TimelineEventType, string> = {
  creation:           'bg-slate-100   text-slate-600',
  envoi:              'bg-amber-100   text-amber-700',
  reception:          'bg-sky-100     text-sky-700',
  acceptation:        'bg-teal-100    text-teal-700',
  refus:              'bg-red-100     text-red-700',
  transfert_propose:  'bg-orange-100  text-orange-700',
  transfert_valide:   'bg-orange-100  text-orange-700',
  transfert_refuse:   'bg-red-100     text-red-700',
  transfert:          'bg-blue-100    text-blue-700',
  confirmation:       'bg-teal-100    text-teal-700',
  negociation:        'bg-purple-100  text-purple-700',
  attribution:        'bg-green-100   text-green-700',
  attribution_fermee: 'bg-slate-100   text-slate-500',
  honore:                 'bg-emerald-100 text-emerald-700',
  cloture:               'bg-slate-100   text-slate-500',
  prolongation_demandee: 'bg-orange-100  text-orange-700',
  prolongation_reponse:  'bg-orange-100  text-orange-700',
  retour_confirme:           'bg-blue-100    text-blue-700',
  paiement_valide:           'bg-green-100   text-green-700',
  admin_changement_statut:   'bg-violet-100  text-violet-700',
  admin_relance:             'bg-violet-100  text-violet-700',
  admin_finance:             'bg-emerald-100 text-emerald-700',
}

export interface RequestTimelineEvent {
  id:        string
  type:      TimelineEventType
  at:        Date
  byRole:    'assisteur' | 'loueur' | 'system' | 'admin'
  agencyId?: string
  message?:  string
}
