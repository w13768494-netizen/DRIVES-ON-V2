import type { AccountType } from './session'

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected'
export type AccessRequestRole   = 'loueur' | 'assisteur'

export interface AccessRequest {
  id:           string
  email:        string
  full_name:    string
  company_name: string | null
  role:         AccessRequestRole
  phone:        string | null
  message:      string | null
  status:       AccessRequestStatus
  created_at:   string
  reviewed_by:  string | null
  reviewed_at:  string | null
  // champs pro (null pour les demandes loueur et anciennes demandes)
  account_type:              AccountType | null
  contact_function:          string | null
  siret:                     string | null
  address:                   string | null
  city:                      string | null
  postal_code:               string | null
  intervention_zone:         string | null
  monthly_requests_estimate: number | null
  extra_fields:              Record<string, unknown> | null
}
