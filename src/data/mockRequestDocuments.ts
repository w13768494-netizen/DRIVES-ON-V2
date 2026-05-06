import type { RequestDocument } from '@/types/requestDocument'

function daysAgo(n: number, h = 10, m = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return d
}

export const MOCK_REQUEST_DOCUMENTS: RequestDocument[] = [

  // ── req-017 — LAMBERT, berline, Versailles (confirmee) ──────────────────────
  {
    id: 'doc-001', requestId: 'req-017', type: 'prise_en_charge', owner: 'assisteur',
    fileName: 'PriseEnCharge_LAMBERT_DOS-2025-04820.pdf',
    addedAt: daysAgo(1, 14, 35), comment: 'Document assurance société', sizeKb: 180,
  },
  {
    id: 'doc-002', requestId: 'req-017', type: 'contrat', owner: 'loueur',
    fileName: 'Contrat_LAMBERT_DOS-2025-04820.pdf',
    addedAt: daysAgo(1, 15, 10), comment: 'Signé en agence à la remise des clés', sizeKb: 245,
  },
  {
    id: 'doc-003', requestId: 'req-017', type: 'etat_depart', owner: 'loueur',
    fileName: 'EtatDepart_LAMBERT_DOS-2025-04820.pdf',
    addedAt: daysAgo(1, 15, 25), sizeKb: 1240,
  },

  // ── req-001 — MARTIN Sophie, SUV, Paris (confirmee) ─────────────────────────
  {
    id: 'doc-004', requestId: 'req-001', type: 'prise_en_charge', owner: 'assisteur',
    fileName: 'PriseEnCharge_MARTIN_DOS-2025-04821.pdf',
    addedAt: daysAgo(0, 9, 35), sizeKb: 156,
  },

  // ── req-009 — ROUX Isabelle, berline, Vitry (honoree — Jean Martin) ─────────
  // Tous les documents requis sont présents → bouton "Valider le paiement" actif
  {
    id: 'doc-010', requestId: 'req-009', type: 'prise_en_charge', owner: 'assisteur',
    fileName: 'PriseEnCharge_ROUX_DOS-2025-04812.pdf',
    addedAt: daysAgo(2, 8, 45), comment: 'Prise en charge partielle — location uniquement', sizeKb: 162,
  },
  {
    id: 'doc-011', requestId: 'req-009', type: 'contrat', owner: 'loueur',
    fileName: 'Contrat_ROUX_DOS-2025-04812.pdf',
    addedAt: daysAgo(1, 9, 30), comment: 'Contrat signé en agence le jour de la remise', sizeKb: 288,
  },
  {
    id: 'doc-012', requestId: 'req-009', type: 'etat_depart', owner: 'loueur',
    fileName: 'EtatLieux_Depart_ROUX_DOS-2025-04812.pdf',
    addedAt: daysAgo(1, 9, 45), comment: 'Aucune rayure constatée au départ', sizeKb: 1540,
  },
  {
    id: 'doc-013', requestId: 'req-009', type: 'etat_retour', owner: 'loueur',
    fileName: 'EtatLieux_Retour_ROUX_DOS-2025-04812.pdf',
    addedAt: daysAgo(0, 14, 35), comment: 'Véhicule rendu en bon état, plein fait', sizeKb: 1380,
  },
  {
    id: 'doc-014', requestId: 'req-009', type: 'facture', owner: 'loueur',
    fileName: 'Facture_ROUX_DOS-2025-04812.pdf',
    addedAt: daysAgo(0, 15, 0), comment: '63 €/j × 5 jours = 315 € TTC', sizeKb: 95,
  },

  // ── req-008 — GARCIA Marco, citadine, Paris 20e (honoree — Pierre Dubois) ───
  // Seulement 2 docs sur 4 → bouton non encore actif
  {
    id: 'doc-020', requestId: 'req-008', type: 'prise_en_charge', owner: 'assisteur',
    fileName: 'PriseEnCharge_GARCIA_DOS-2025-04811.pdf',
    addedAt: daysAgo(1, 10, 10), sizeKb: 144,
  },
  {
    id: 'doc-021', requestId: 'req-008', type: 'contrat', owner: 'loueur',
    fileName: 'Contrat_GARCIA_DOS-2025-04811.pdf',
    addedAt: daysAgo(1, 10, 45), comment: 'Signé au comptoir', sizeKb: 256,
  },
  {
    id: 'doc-022', requestId: 'req-008', type: 'etat_depart', owner: 'loueur',
    fileName: 'EtatLieux_Depart_GARCIA_DOS-2025-04811.pdf',
    addedAt: daysAgo(1, 11, 0), sizeKb: 980,
  },
  // etat_retour et facture manquants — en attente du loueur

  // ── req-011 — MERCIER Nathalie, SUV, Paris 16e (honoree — Pierre Dubois) ────
  // Tous les documents présents → bouton "Valider le paiement" actif
  {
    id: 'doc-030', requestId: 'req-011', type: 'prise_en_charge', owner: 'assisteur',
    fileName: 'PriseEnCharge_MERCIER_DOS-2025-04795.pdf',
    addedAt: daysAgo(6, 9, 10), comment: 'Prise en charge totale', sizeKb: 175,
  },
  {
    id: 'doc-031', requestId: 'req-011', type: 'contrat', owner: 'loueur',
    fileName: 'Contrat_MERCIER_DOS-2025-04795.pdf',
    addedAt: daysAgo(5, 11, 30), comment: 'Contrat longue durée — 3 jours', sizeKb: 312,
  },
  {
    id: 'doc-032', requestId: 'req-011', type: 'etat_depart', owner: 'loueur',
    fileName: 'EtatLieux_Depart_MERCIER_DOS-2025-04795.pdf',
    addedAt: daysAgo(5, 11, 50), sizeKb: 2100,
  },
  {
    id: 'doc-033', requestId: 'req-011', type: 'etat_retour', owner: 'loueur',
    fileName: 'EtatLieux_Retour_MERCIER_DOS-2025-04795.pdf',
    addedAt: daysAgo(2, 18, 5), comment: 'Petite éraflure pare-choc arrière signalée', sizeKb: 1870,
  },
  {
    id: 'doc-034', requestId: 'req-011', type: 'facture', owner: 'loueur',
    fileName: 'Facture_MERCIER_DOS-2025-04795.pdf',
    addedAt: daysAgo(2, 18, 20), comment: '88 €/j × 3 jours = 264 € TTC', sizeKb: 88,
  },
]
