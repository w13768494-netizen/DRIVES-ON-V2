import type { AssistanceUserRole } from './assistanceUser'

export type UserRole = 'assisteur' | 'loueur' | 'admin'

export type AccountType = 'assistance' | 'insurance_agent' | 'garage'

export const ROLE_LABELS: Record<UserRole, string> = {
  assisteur: 'Assisteur',
  loueur:    'Loueur',
  admin:     'Admin',
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  assistance:      'Assisteur',
  insurance_agent: "Agent d'assurance",
  garage:          'Garage',
}

export interface AppSession {
  role:         UserRole
  accountType?: AccountType
  userId:       string
  userName:     string
  company:      string
  companyRole?: AssistanceUserRole
  createdAt:    string
}

// backward-compat alias — use AppSession in new code
export type MockSession = AppSession
