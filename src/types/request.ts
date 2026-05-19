import type { VehicleCategoryType, VehicleGroupType } from './vehicleCategory'
import type { AccountType } from './session'
import type { RequestTransfer } from './requestTransfer'
import type { RequestTimelineEvent } from './requestTimeline'
import type { AgencyServiceType } from './agencyService'
import type { ExtensionRequest } from './requestExtension'

export type RequestStatus =
  | 'brouillon'
  | 'envoyee'
  | 'recue'
  | 'acceptee'
  | 'refusee'
  | 'transfert_propose'
  | 'transfert_valide'
  | 'transferee'
  | 'confirmee'
  | 'honoree'
  | 'cloturee'

export type RequestType = 'immediate' | 'planifiee'

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  immediate: 'Immédiate',
  planifiee: 'Planifiée',
}

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  brouillon:         'Brouillon',
  envoyee:           'Envoyée',
  recue:             'Reçue',
  acceptee:          'Acceptée',
  refusee:           'Refusée',
  transfert_propose: 'Transfert proposé',
  transfert_valide:  'Transfert validé',
  transferee:        'Transférée',
  confirmee:         'Confirmée',
  honoree:           'Honorée',
  cloturee:          'Clôturée',
}

export const LOUEUR_STATUS_LABELS: Record<RequestStatus, string> = {
  brouillon:         'Brouillon',
  envoyee:           'Nouvelle',
  recue:             'Reçue',
  acceptee:          'Acceptée',
  refusee:           'Refusée',
  transfert_propose: 'Transfert proposé',
  transfert_valide:  'Transfert validé',
  transferee:        'Transférée',
  confirmee:         'Confirmée',
  honoree:           'Honorée',
  cloturee:          'Clôturée',
}

export const REQUEST_STATUS_COLORS: Record<RequestStatus, string> = {
  brouillon:         'bg-slate-100  text-slate-600',
  envoyee:           'bg-amber-100  text-amber-700',
  recue:             'bg-sky-100    text-sky-700',
  acceptee:          'bg-teal-100   text-teal-700',
  refusee:           'bg-red-100    text-red-600',
  transfert_propose: 'bg-orange-100 text-orange-700',
  transfert_valide:  'bg-orange-100 text-orange-700',
  transferee:        'bg-blue-100   text-blue-700',
  confirmee:         'bg-green-100  text-green-700',
  honoree:           'bg-emerald-100 text-emerald-700',
  cloturee:          'bg-slate-100  text-slate-500',
}

export interface BreakdownLocation {
  address:   string
  latitude:  number
  longitude: number
}

export interface Sinistre {
  lastName:       string
  firstName:      string
  phone:          string
  email?:         string
  licenseNumber?: string
}

export interface LoueurResponse {
  agencyId:      string
  agencyName:    string
  pricePerDay?:  number
  vehicleModel?: string
  message?:      string
  respondedAt:   Date
}

/** Conservé pour la compatibilité avec RentalCompanyCard / RentalCompanyList */
export interface PriceOffer {
  loueurBasePrice: number
  assisteurOffer:  number
  isCounterOffer:  boolean
  totalOffer:      number
}

export type CreditType = 'full' | 'partial' | 'client'

export const CREDIT_TYPE_LABELS: Record<CreditType, string> = {
  full:    'Prise en charge totale',
  partial: 'Prise en charge partielle',
  client:  'À la charge du client',
}

export interface CoverageInfo {
  creditType: CreditType
}

export type CoverageType = 'none' | 'partial' | 'full'

export const COVERAGE_TYPE_LABELS: Record<CoverageType, string> = {
  none:    'Aucune prise en charge',
  partial: 'Prise en charge partielle',
  full:    'Prise en charge totale',
}

export function creditTypeToCoverageType(creditType: CreditType): CoverageType {
  if (creditType === 'full')    return 'full'
  if (creditType === 'partial') return 'partial'
  return 'none'
}

export interface RequestFormInput {
  requestType:         RequestType
  dossierNumber:       string
  referenceNumber?:    string
  coverage:            CoverageInfo
  targetPricePerDay?:  number
  sinistre:            Sinistre
  location:            BreakdownLocation
  vehicleGroup:        VehicleGroupType
  vehicleCategory:     VehicleCategoryType
  dateNeeded:          Date
  durationDays:        number
  maxExtensionDays?:   number
  notes?:              string
  requestedServices?:  AgencyServiceType[]
}

export interface AssistanceRequest extends RequestFormInput {
  id:                   string
  status:               RequestStatus
  assignedAgencyId?:    string
  assignedAgencyIds?:   string[]
  confirmedAgencyId?:   string
  confirmedAgencyName?: string
  confirmedAt?:         Date
  returnedAt?:          Date
  loueurResponse?:      LoueurResponse
  counterOfferPrice?:   number
  counterOfferMessage?: string
  transfers:            RequestTransfer[]
  timeline:             RequestTimelineEvent[]
  extensions?:          ExtensionRequest[]
  coverageType?:         CoverageType
  requesterAccountType?: AccountType
  createdAt:             Date
  createdByUserId:       string
  createdByName:         string
  adminNotes?:           string | null
  adminFlags?:           string[]
  adminUpdatedAt?:       Date
  adminUpdatedBy?:       string
  paymentStatus?:        string
}

export function getEffectiveDuration(request: AssistanceRequest): number {
  const extra = (request.extensions ?? [])
    .filter(e => e.status === 'acceptee')
    .reduce((acc, e) => acc + e.requestedDays, 0)
  return request.durationDays + extra
}
