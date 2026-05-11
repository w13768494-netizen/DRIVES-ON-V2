import type { RentalAgency } from '@/types/rentalAgency'

/**
 * NE PAS importer directement dans les composants — passer par agencyService.ts.
 * Les IDs 'lc-001' et 'lc-003' sont intentionnellement alignés avec mockRentalCompanies
 * pour que les demandes existantes soient liées aux bonnes agences.
 */
export const MOCK_RENTAL_AGENCIES: RentalAgency[] = [
  {
    id:              'lc-001',
    brandId:         'brand-001',
    cityId:          'city-paris',
    name:            'AutoLoc Paris Centre',
    address:         '12 rue de Rivoli',
    city:            'Paris',
    postalCode:      '75001',
    latitude:        48.8566,
    longitude:       2.3522,
    serviceRadiusKm: 40,
    phone:           '01 42 00 11 22',
    email:           'contact@autoloc-group.fr',
    contactName:     'Marc Lebrun',
    isAvailable:     true,
    openingHours: {
      weekdays: '08:00–19:00',
      saturday: '09:00–17:00',
      sunday:   null,
    },
  },
  {
    id:              'lc-003',
    brandId:         'brand-001',
    cityId:          'city-creteil',
    name:            'AutoLoc Val-de-Marne',
    address:         '88 avenue du Maréchal de Lattre',
    city:            'Créteil',
    postalCode:      '94000',
    latitude:        48.7848,
    longitude:       2.4554,
    serviceRadiusKm: 30,
    phone:           '01 45 17 22 00',
    email:           'creteil@autoloc-group.fr',
    contactName:     'Sophie Renaud',
    isAvailable:     true,
    openingHours: {
      weekdays: '08:30–18:30',
      saturday: '09:00–13:00',
      sunday:   null,
    },
  },
  // Agences d'autres marques (visibles par les assisteurs)
  {
    id:              'lc-005',
    brandId:         'brand-002',
    cityId:          'city-lyon',
    name:            'Mobility Express Lyon',
    address:         '27 quai Saint-Antoine',
    city:            'Lyon',
    postalCode:      '69002',
    latitude:        45.7640,
    longitude:       4.8357,
    serviceRadiusKm: 50,
    phone:           '04 72 41 00 55',
    email:           'lyon@mobility-express.fr',
    contactName:     'Pierre Duval',
    isAvailable:     true,
    openingHours: {
      weekdays: '07:30–20:00',
      saturday: '08:00–18:00',
      sunday:   '09:00–13:00',
    },
  },
]

/** IDs des agences appartenant au loueur connecté */
export const CURRENT_LOUEUR_AGENCY_IDS = ['lc-001', 'lc-003']
