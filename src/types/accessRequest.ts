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
}
