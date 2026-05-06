export type RequestTransferStatus = 'en_attente' | 'valide' | 'refuse'

export interface RequestTransfer {
  id:             string
  requestId:      string
  fromAgencyId:   string
  fromAgencyName: string
  toAgencyId:     string
  toAgencyName:   string
  reason?:        string
  proposedAt:     Date
  validatedAt?:   Date
  status:         RequestTransferStatus
}
