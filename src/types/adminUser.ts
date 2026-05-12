export type AdminUserRole = 'assisteur' | 'loueur' | 'admin'

export interface AdminUser {
  id:              string
  email:           string
  role:            AdminUserRole
  full_name:       string
  company_name:    string | null
  phone:           string | null
  is_active:       boolean
  agency_count:    number
  created_at:      string
  last_sign_in_at: string | null
}
