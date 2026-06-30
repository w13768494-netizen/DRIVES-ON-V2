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

export interface TeamMember {
  id:        string
  fullName:  string
  email:     string
  teamRole:  AssistanceUserRole
  isActive:  boolean
}

export interface UserStats {
  created:         number
  confirmee:       number
  refusee:         number
  transferee:      number
  avgResponseMs:   number | null
}
