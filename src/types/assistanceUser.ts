export type AssistanceUserRole = 'admin' | 'superviseur' | 'charge_assistance'

export const ASSISTANCE_USER_ROLE_LABELS: Record<AssistanceUserRole, string> = {
  admin:             'Administrateur',
  superviseur:       'Superviseur',
  charge_assistance: 'Chargé d\'assistance',
}

export const ASSISTANCE_USER_ROLE_COLORS: Record<AssistanceUserRole, string> = {
  admin:             'bg-violet-100 text-violet-700',
  superviseur:       'bg-blue-100   text-blue-700',
  charge_assistance: 'bg-slate-100  text-slate-600',
}

export interface AssistanceCompany {
  id:     string
  name:   string
  logo?:  string
  type:   string
  status: 'active' | 'inactive'
}

export interface AssistanceUser {
  id:           string
  companyId:    string
  companyName?: string
  firstName:    string
  lastName:     string
  username:     string
  email:        string
  phone?:       string
  role:         AssistanceUserRole
  active:       boolean
  accessCode:   string
  lastLoginAt?: string  // ISO
  createdAt:    string  // ISO
}

export interface UserStats {
  created:         number
  confirmee:       number
  refusee:         number
  transferee:      number
  avgResponseMs:   number | null
}
