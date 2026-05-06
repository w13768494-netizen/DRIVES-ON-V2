import type { RentalDocument } from '@/types/rentalDocument'

function daysAgo(n: number, h = 10, m = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, m, 0, 0)
  return d
}

export const MOCK_RENTAL_DOCUMENTS: RentalDocument[] = [
  // req-017 — LAMBERT, berline, Versailles (confirmee)
  {
    id:        'doc-001',
    requestId: 'req-017',
    type:      'contrat',
    fileName:  'Contrat_LAMBERT_DOS-2025-04820.pdf',
    addedAt:   daysAgo(1, 15, 10),
    comment:   'Signé en agence à la remise des clés',
    sizeKb:    245,
  },
  {
    id:        'doc-002',
    requestId: 'req-017',
    type:      'etat_depart',
    fileName:  'EtatDepart_LAMBERT_DOS-2025-04820.pdf',
    addedAt:   daysAgo(1, 15, 25),
    sizeKb:    1240,
  },
]
