export type ExtensionStatus = 'en_attente' | 'acceptee' | 'refusee'

export interface ExtensionRequest {
  id:            string
  requestedDays: number
  note?:         string
  status:        ExtensionStatus
  requestedAt:   Date | string
  respondedAt?:  Date | string
  // Pricing snapshot chosen by the assisteur at request time
  appliedPricePerDay?: number
  extensionCost?:      number
  newTotalPrice?:      number
  isForfait?:          boolean
  forfaitLabel?:       string
}
