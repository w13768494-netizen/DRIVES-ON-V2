import type { AssistanceUserRole } from './assistanceUser'

export type UserRole = 'assisteur' | 'loueur' | 'admin'

export const ROLE_LABELS: Record<UserRole, string> = {
  assisteur: 'Assisteur',
  loueur:    'Loueur',
  admin:     'Admin',
}

export interface AppSession {
  role:         UserRole
  userId:       string
  userName:     string
  company:      string
  companyRole?: AssistanceUserRole
  createdAt:    string
}

// backward-compat alias — use AppSession in new code
export type MockSession = AppSession
