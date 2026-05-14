// ── Groupes ───────────────────────────────────────────────────────────────────

export type VehicleGroupType = 'tourisme' | 'utilitaire'

export const VEHICLE_GROUP_LABELS: Record<VehicleGroupType, string> = {
  tourisme:   'Véhicule de tourisme',
  utilitaire: 'Véhicule utilitaire',
}

// ── Catégories ────────────────────────────────────────────────────────────────

export type VehicleCategoryType =
  // Tourisme
  | 'citadine'
  | 'compacte'
  | 'berline'
  | 'suv'
  | '7_places'
  | 'electrique'
  | 'hybride'
  | 'premium'
  // Utilitaire
  | 'petit_utilitaire'
  | 'fourgon_3m3'
  | 'fourgon_6m3'
  | 'fourgon_12m3'
  | 'camion_20m3'
  | 'benne'
  | 'frigorifique'

export const VEHICLE_CATEGORY_LABELS: Record<VehicleCategoryType, string> = {
  citadine:         'Citadine',
  compacte:         'Compacte',
  berline:          'Berline',
  suv:              'SUV / 4×4',
  '7_places':       '7 places',
  electrique:       'Électrique',
  hybride:          'Hybride',
  premium:          'Premium / Cabriolet',
  petit_utilitaire: 'Citadine commerciale 2 places',
  fourgon_3m3:      'Fourgon 3m³',
  fourgon_6m3:      'Fourgon 6m³',
  fourgon_12m3:     'Fourgon 12m³',
  camion_20m3:      'Camion 20m³',
  benne:            'Benne',
  frigorifique:     'Frigorifique',
}

export const VEHICLE_CATEGORY_GROUPS: Record<VehicleCategoryType, VehicleGroupType> = {
  citadine:         'tourisme',
  compacte:         'tourisme',
  berline:          'tourisme',
  suv:              'tourisme',
  '7_places':       'tourisme',
  electrique:       'tourisme',
  hybride:          'tourisme',
  premium:          'tourisme',
  petit_utilitaire: 'utilitaire',
  fourgon_3m3:      'utilitaire',
  fourgon_6m3:      'utilitaire',
  fourgon_12m3:     'utilitaire',
  camion_20m3:      'utilitaire',
  benne:            'utilitaire',
  frigorifique:     'utilitaire',
}

export const TOURISME_CATEGORIES: VehicleCategoryType[] = [
  'citadine', 'compacte', 'berline', 'suv', '7_places', 'electrique', 'hybride', 'premium',
]
export const UTILITAIRE_CATEGORIES: VehicleCategoryType[] = [
  'petit_utilitaire', 'fourgon_3m3', 'fourgon_6m3', 'fourgon_12m3', 'camion_20m3', 'benne', 'frigorifique',
]

export function getCategoriesForGroup(group: VehicleGroupType): VehicleCategoryType[] {
  return group === 'tourisme' ? TOURISME_CATEGORIES : UTILITAIRE_CATEGORIES
}

// ── Tarification ──────────────────────────────────────────────────────────────

export interface PricingPackage {
  label: string  // "3 jours", "7 jours", "Week-end"
  days:  number
  price: number
}

export interface VehicleCategoryOffer {
  id:               string
  agencyId:         string
  category:         VehicleCategoryType
  group:            VehicleGroupType
  available:        boolean
  stockEstimate:    number
  dailyRate:        number
  packages:         PricingPackage[]
  deposit:          number
  includedKmPerDay: number
  extraKmPrice:     number
  // Grille tarifaire par tranche (beta loueur) — fallback sur dailyRate si absent
  modeleEquivalent?:  string
  tarif1_4?:          number
  tarif5_7?:          number
  tarif8_14?:         number
  tarif15_21?:        number
  tarif22_29?:        number
  forfait30Jours?:    number
  actif?:             boolean
}
