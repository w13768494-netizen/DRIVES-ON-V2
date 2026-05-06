export type RentalDocumentType =
  | 'contrat'
  | 'etat_depart'
  | 'etat_retour'
  | 'facture'
  | 'autre'

export const DOCUMENT_TYPE_LABELS: Record<RentalDocumentType, string> = {
  contrat:     'Contrat signé',
  etat_depart: 'État des lieux départ',
  etat_retour: 'État des lieux retour',
  facture:     'Facture',
  autre:       'Autre document',
}

export const DOCUMENT_BADGE_LABELS: Record<RentalDocumentType, string | null> = {
  contrat:     'Contrat reçu',
  etat_depart: 'État départ reçu',
  etat_retour: 'État retour reçu',
  facture:     'Facture reçue',
  autre:       null,
}

export const DOCUMENT_TYPE_COLORS: Record<RentalDocumentType, string> = {
  contrat:     'bg-blue-50   text-blue-700   border-blue-200',
  etat_depart: 'bg-amber-50  text-amber-700  border-amber-200',
  etat_retour: 'bg-green-50  text-green-700  border-green-200',
  facture:     'bg-violet-50 text-violet-700 border-violet-200',
  autre:       'bg-slate-50  text-slate-600  border-slate-200',
}

export interface RentalDocument {
  id:        string
  requestId: string
  type:      RentalDocumentType
  fileName:  string
  addedAt:   Date
  comment?:  string
  sizeKb?:   number
}
