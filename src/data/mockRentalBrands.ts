import type { RentalBrand } from '@/types/rentalBrand'

export const MOCK_RENTAL_BRANDS: RentalBrand[] = [
  {
    id:          'brand-001',
    name:        'AutoLoc Group',
    description: 'Réseau de location de véhicules toutes catégories en Île-de-France.',
    email:       'contact@autoloc-group.fr',
    phone:       '01 42 00 00 00',
    website:     'https://autoloc-group.fr',
    createdAt:   new Date('2019-03-15'),
  },
  {
    id:          'brand-002',
    name:        'Mobility Express',
    description: 'Spécialiste du véhicule de remplacement en assistance.',
    email:       'pro@mobility-express.fr',
    phone:       '04 72 00 00 00',
    createdAt:   new Date('2021-06-01'),
  },
]

/** ID de la marque connectée (mock session) */
export const CURRENT_BRAND_ID = 'brand-001'
