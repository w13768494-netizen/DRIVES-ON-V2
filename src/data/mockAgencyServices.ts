import type { AgencyService } from '@/types/agencyService'

export const MOCK_AGENCY_SERVICES: AgencyService[] = [
  // ── AutoLoc Paris Centre (lc-001) ────────────────────────────────────
  { id: 'svc-001', agencyId: 'lc-001', type: 'livraison_vehicule',            available: true,  priceType: 'inclus' },
  { id: 'svc-002', agencyId: 'lc-001', type: 'recuperation_vehicule',         available: true,  priceType: 'inclus' },
  { id: 'svc-003', agencyId: 'lc-001', type: 'prise_en_charge_gare_aeroport', available: true,  priceType: 'fixe',  price: 25, comment: 'Paris intramuros uniquement' },
  { id: 'svc-004', agencyId: 'lc-001', type: 'vehicule_relais_immediat',      available: true,  priceType: 'inclus', comment: 'Sous réserve de disponibilité' },
  { id: 'svc-005', agencyId: 'lc-001', type: 'prolongation_possible',         available: true,  priceType: 'inclus' },
  { id: 'svc-006', agencyId: 'lc-001', type: 'livraison_hors_horaires',       available: true,  priceType: 'fixe',  price: 40, comment: 'Maj. 40€ entre 19h et 22h' },
  { id: 'svc-007', agencyId: 'lc-001', type: 'service_week_end',              available: true,  priceType: 'inclus' },

  // ── AutoLoc Val-de-Marne (lc-003) ────────────────────────────────────
  { id: 'svc-010', agencyId: 'lc-003', type: 'livraison_vehicule',            available: true,  priceType: 'fixe',  price: 20 },
  { id: 'svc-011', agencyId: 'lc-003', type: 'recuperation_vehicule',         available: true,  priceType: 'fixe',  price: 20 },
  { id: 'svc-012', agencyId: 'lc-003', type: 'prise_en_charge_gare_aeroport', available: false, priceType: 'sur_devis' },
  { id: 'svc-013', agencyId: 'lc-003', type: 'vehicule_relais_immediat',      available: true,  priceType: 'inclus' },
  { id: 'svc-014', agencyId: 'lc-003', type: 'prolongation_possible',         available: true,  priceType: 'inclus' },
  { id: 'svc-015', agencyId: 'lc-003', type: 'livraison_hors_horaires',       available: false, priceType: 'sur_devis' },
  { id: 'svc-016', agencyId: 'lc-003', type: 'service_week_end',              available: false, priceType: 'sur_devis', comment: 'Agence fermée le week-end sauf urgence' },
]
