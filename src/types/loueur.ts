import type { AssistanceRequest } from './request'

export type LoueurActionType =
  | 'accepter'
  | 'contre_proposition'
  | 'refuser'
  | 'transferer'
  | 'confirmer_retour'

export const LOUEUR_ACTION_LABELS: Record<LoueurActionType, string> = {
  accepter:           'Accepter',
  contre_proposition: 'Contre-proposition',
  refuser:            'Refuser',
  transferer:         'Transférer',
  confirmer_retour:   'Confirmer le retour',
}

export interface LoueurAction {
  type:          LoueurActionType
  pricePerDay?:  number
  vehicleModel?: string
  message?:      string
  toAgencyId?:   string
  toAgencyName?: string
}

export type ReceivedRequest = AssistanceRequest & {
  distanceKm: number
  agencyId:   string
}
