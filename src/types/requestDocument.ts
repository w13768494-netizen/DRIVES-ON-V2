export type RequestDocumentType =
  | 'prise_en_charge'
  | 'contrat'
  | 'etat_depart'
  | 'etat_retour'
  | 'facture'
  | 'photo_degat'
  | 'autre'

export type RequestDocumentOwner = 'assisteur' | 'loueur'

export const REQUEST_DOCUMENT_TYPE_LABELS: Record<RequestDocumentType, string> = {
  prise_en_charge: 'Prise en charge',
  contrat:         'Contrat signé',
  etat_depart:     'État des lieux départ',
  etat_retour:     'État des lieux retour',
  facture:         'Facture',
  photo_degat:     'Photo de dégât',
  autre:           'Autre document',
}

export const REQUEST_DOCUMENT_BADGE_LABELS: Record<RequestDocumentType, string | null> = {
  prise_en_charge: 'Prise en charge',
  contrat:         'Contrat reçu',
  etat_depart:     'État départ reçu',
  etat_retour:     'État retour reçu',
  facture:         'Facture reçue',
  photo_degat:     'Photo dégât reçue',
  autre:           null,
}

export const REQUEST_DOCUMENT_TYPE_COLORS: Record<RequestDocumentType, string> = {
  prise_en_charge: 'bg-orange-50  text-orange-700  border-orange-200',
  contrat:         'bg-blue-50    text-blue-700    border-blue-200',
  etat_depart:     'bg-amber-50   text-amber-700   border-amber-200',
  etat_retour:     'bg-green-50   text-green-700   border-green-200',
  facture:         'bg-violet-50  text-violet-700  border-violet-200',
  photo_degat:     'bg-red-50     text-red-700     border-red-200',
  autre:           'bg-slate-50   text-slate-600   border-slate-200',
}

export const ASSISTEUR_DOCUMENT_TYPES: RequestDocumentType[] = ['prise_en_charge', 'autre']
export const LOUEUR_DOCUMENT_TYPES: RequestDocumentType[]    = ['contrat', 'etat_depart', 'etat_retour', 'facture', 'photo_degat', 'autre']

export interface RequestDocument {
  id:        string
  requestId: string
  type:      RequestDocumentType
  owner:     RequestDocumentOwner
  fileName:  string
  addedAt:   Date
  comment?:  string
  sizeKb?:   number
  viewUrl?:  string  // signed URL Supabase Storage ou URL externe
  url?:      string  // URL externe uniquement — distingue l'icône Link vs Eye
}
