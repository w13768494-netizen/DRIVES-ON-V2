import type { LoueurAccount } from '@/types/loueurAccount'

export const MOCK_LOUEUR_ACCOUNTS: LoueurAccount[] = [
  {
    id:          'la-001',
    agencyId:    'loueur-001',
    agencyName:  'AutoLoc Group',
    userName:    'Marc Lebrun',
    email:       'marc.lebrun@autoloc.fr',
    accessCode:  'LOUEUR2026',
    active:      true,
    lastLoginAt: new Date().toISOString(),
    createdAt:   '2024-01-15T09:00:00.000Z',
  },
]
