export interface LoueurAccount {
  id:          string
  agencyId:    string
  agencyName:  string
  userName:    string
  email:       string
  phone?:      string
  accessCode:  string
  active:      boolean
  lastLoginAt?: string
  createdAt:   string
}
