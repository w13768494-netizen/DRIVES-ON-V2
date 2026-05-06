import type { AssistanceRequest } from './request'

export type LoueurActionType =
  | 'accepter'
  | 'refuser'
  | 'transferer'
  | 'confirmer_retour'

export const LOUEUR_ACTION_LABELS: Record<LoueurActionType, string> = {
  accepter:         'Accepter',
  refuser:          'Refuser',
  transferer:       'Transférer',
  confirmer_retour: 'Confirmer le retour',
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
