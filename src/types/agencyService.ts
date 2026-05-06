export type AgencyServiceType =
  | 'livraison_vehicule'
  | 'recuperation_vehicule'
  | 'prise_en_charge_gare_aeroport'
  | 'vehicule_relais_immediat'
  | 'prolongation_possible'
  | 'livraison_hors_horaires'
  | 'service_week_end'
  | 'custom'

export const STANDARD_SERVICE_TYPES: Exclude<AgencyServiceType, 'custom'>[] = [
  'livraison_vehicule',
  'recuperation_vehicule',
  'prise_en_charge_gare_aeroport',
  'vehicule_relais_immediat',
  'prolongation_possible',
  'livraison_hors_horaires',
  'service_week_end',
]

export const AGENCY_SERVICE_LABELS: Record<AgencyServiceType, string> = {
  livraison_vehicule:             'Livraison du véhicule',
  recuperation_vehicule:          'Récupération du véhicule',
  prise_en_charge_gare_aeroport:  'Prise en charge gare / aéroport',
  vehicule_relais_immediat:       'Véhicule relais immédiat',
  prolongation_possible:          'Prolongation possible',
  livraison_hors_horaires:        'Livraison hors horaires',
  service_week_end:               'Service week-end',
  custom:                         'Service personnalisé',
}

export type ServicePriceType = 'inclus' | 'fixe' | 'sur_devis'

export const SERVICE_PRICE_LABELS: Record<ServicePriceType, string> = {
  inclus:    'Inclus',
  fixe:      'Prix fixe',
  sur_devis: 'Sur devis',
}

export interface AgencyService {
  id:        string
  agencyId:  string
  type:      AgencyServiceType
  label?:    string   // libellé libre pour les services custom
  available: boolean
  priceType: ServicePriceType
  price?:    number   // € si priceType === 'fixe'
  comment?:  string
}

export function getServiceLabel(service: AgencyService): string {
  if (service.type === 'custom' && service.label) return service.label
  return AGENCY_SERVICE_LABELS[service.type]
}
