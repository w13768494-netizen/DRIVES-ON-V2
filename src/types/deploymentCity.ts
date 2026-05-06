export type DeploymentStatus = 'active' | 'deploying' | 'planned' | 'inactive'

interface DeploymentCityRow {
  id:              string
  name:            string
  slug:            string
  department:      string
  department_code: string
  region:          string
  status:          DeploymentStatus
  latitude:        number
  longitude:       number
  cover_radius_km: number
  vehicle_types:   string[]
  loueur_count:    number
  activated_at:    string | null
  notes:           string | null
  created_at:      string
  updated_at:      string
}

export interface DeploymentCity {
  id:             string
  name:           string
  slug:           string
  department:     string
  departmentCode: string
  region:         string
  status:         DeploymentStatus
  latitude:       number
  longitude:      number
  coverRadiusKm:  number
  vehicleTypes:   string[]
  loueurCount:    number
  activatedAt:    Date | null
  notes:          string | null
  createdAt:      Date
  updatedAt:      Date
}

export function rowToDeploymentCity(row: DeploymentCityRow): DeploymentCity {
  return {
    id:             row.id,
    name:           row.name,
    slug:           row.slug,
    department:     row.department,
    departmentCode: row.department_code,
    region:         row.region,
    status:         row.status,
    latitude:       row.latitude,
    longitude:      row.longitude,
    coverRadiusKm:  row.cover_radius_km,
    vehicleTypes:   row.vehicle_types,
    loueurCount:    row.loueur_count,
    activatedAt:    row.activated_at ? new Date(row.activated_at) : null,
    notes:          row.notes,
    createdAt:      new Date(row.created_at),
    updatedAt:      new Date(row.updated_at),
  }
}
