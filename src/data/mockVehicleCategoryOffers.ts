import type { VehicleCategoryOffer } from '@/types/vehicleCategory'

export const MOCK_VEHICLE_CATEGORY_OFFERS: VehicleCategoryOffer[] = [
  // ── AutoLoc Paris Centre (lc-001) ────────────────────────────────────
  {
    id: 'vco-001', agencyId: 'lc-001', category: 'citadine', group: 'tourisme',
    available: true, stockEstimate: 6, dailyRate: 45,
    packages: [
      { label: '3 jours',  days: 3, price: 120 },
      { label: '7 jours',  days: 7, price: 260 },
      { label: 'Week-end', days: 2, price: 79  },
    ],
    deposit: 300, includedKmPerDay: 150, extraKmPrice: 0.20,
  },
  {
    id: 'vco-002', agencyId: 'lc-001', category: 'berline', group: 'tourisme',
    available: true, stockEstimate: 4, dailyRate: 68,
    packages: [
      { label: '3 jours',  days: 3, price: 185 },
      { label: '7 jours',  days: 7, price: 420 },
      { label: 'Week-end', days: 2, price: 119 },
    ],
    deposit: 500, includedKmPerDay: 200, extraKmPrice: 0.22,
  },
  {
    id: 'vco-003', agencyId: 'lc-001', category: 'suv', group: 'tourisme',
    available: true, stockEstimate: 3, dailyRate: 95,
    packages: [
      { label: '3 jours',  days: 3, price: 265 },
      { label: '7 jours',  days: 7, price: 590 },
      { label: 'Week-end', days: 2, price: 169 },
    ],
    deposit: 800, includedKmPerDay: 250, extraKmPrice: 0.28,
  },
  {
    id: 'vco-004', agencyId: 'lc-001', category: 'electrique', group: 'tourisme',
    available: true, stockEstimate: 2, dailyRate: 75,
    packages: [
      { label: '3 jours',  days: 3, price: 199 },
      { label: '7 jours',  days: 7, price: 449 },
    ],
    deposit: 600, includedKmPerDay: 300, extraKmPrice: 0,
  },

  // ── AutoLoc Val-de-Marne (lc-003) ────────────────────────────────────
  {
    id: 'vco-010', agencyId: 'lc-003', category: 'citadine', group: 'tourisme',
    available: true, stockEstimate: 4, dailyRate: 38,
    packages: [
      { label: '3 jours',  days: 3, price: 99  },
      { label: '7 jours',  days: 7, price: 220 },
      { label: 'Week-end', days: 2, price: 65  },
    ],
    deposit: 250, includedKmPerDay: 150, extraKmPrice: 0.18,
  },
  {
    id: 'vco-011', agencyId: 'lc-003', category: 'petit_utilitaire', group: 'utilitaire',
    available: true, stockEstimate: 5, dailyRate: 72,
    packages: [
      { label: '3 jours',  days: 3, price: 195 },
      { label: '7 jours',  days: 7, price: 420 },
    ],
    deposit: 600, includedKmPerDay: 200, extraKmPrice: 0.25,
  },
  {
    id: 'vco-012', agencyId: 'lc-003', category: '7_places', group: 'tourisme',
    available: false, stockEstimate: 0, dailyRate: 80,
    packages: [
      { label: '7 jours', days: 7, price: 490 },
    ],
    deposit: 700, includedKmPerDay: 200, extraKmPrice: 0.25,
  },
  {
    id: 'vco-013', agencyId: 'lc-003', category: 'hybride', group: 'tourisme',
    available: true, stockEstimate: 2, dailyRate: 65,
    packages: [
      { label: '3 jours',  days: 3, price: 175 },
      { label: '7 jours',  days: 7, price: 390 },
    ],
    deposit: 500, includedKmPerDay: 200, extraKmPrice: 0.15,
  },
]
