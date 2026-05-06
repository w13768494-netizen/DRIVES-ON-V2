export type CandidatureRole   = 'assisteur' | 'loueur'
export type CandidatureStatus = 'en_attente' | 'acceptee' | 'refusee'

export const CANDIDATURE_ROLE_LABELS: Record<CandidatureRole, string> = {
  assisteur: 'Assisteur',
  loueur:    'Loueur',
}

export const CANDIDATURE_STATUS_LABELS: Record<CandidatureStatus, string> = {
  en_attente: 'En attente',
  acceptee:   'Acceptée',
  refusee:    'Refusée',
}

export const CANDIDATURE_STATUS_STYLES: Record<CandidatureStatus, string> = {
  en_attente: 'bg-amber-50  text-amber-700  border-amber-200',
  acceptee:   'bg-green-50  text-green-700  border-green-200',
  refusee:    'bg-red-50    text-red-600    border-red-200',
}

export const MONTHLY_VOLUME_OPTIONS = [
  { value: 10,  label: 'Moins de 10 dossiers / mois' },
  { value: 50,  label: '10 à 50 dossiers / mois'     },
  { value: 200, label: '50 à 200 dossiers / mois'    },
  { value: 500, label: 'Plus de 200 dossiers / mois' },
]

export const VEHICLE_TYPE_OPTIONS = [
  { value: 'citadine',         label: 'Citadine'                      },
  { value: 'compacte',         label: 'Compacte'                      },
  { value: 'berline',          label: 'Berline'                       },
  { value: 'suv',              label: 'SUV / 4×4'                     },
  { value: '7_places',         label: '7 places'                      },
  { value: 'electrique',       label: 'Électrique / Hybride'          },
  { value: 'premium',          label: 'Premium / Cabriolet'           },
  { value: 'petit_utilitaire', label: 'Citadine commerciale 2 places' },
  { value: 'fourgon',          label: 'Fourgon'                       },
]

export interface Candidature {
  id:          string
  role:        CandidatureRole
  status:      CandidatureStatus
  submittedAt: Date
  reviewedAt?: Date
  reviewNote?: string

  // Entreprise
  companyName: string
  siret:       string
  address:     string
  city:        string
  postalCode:  string
  website?:    string

  // Contact
  contactFirstName: string
  contactLastName:  string
  contactTitle:     string
  email:            string
  phone:            string

  // Assisteur
  monthlyVolume?: number

  // Loueur
  agencyCount?:  number
  fleetSize?:    number
  vehicleTypes?: string[]

  message?: string
}
