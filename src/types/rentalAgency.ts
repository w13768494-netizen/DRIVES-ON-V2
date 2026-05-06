export interface OpeningHours {
  weekdays: string        // "08:00–19:00"
  saturday: string | null // null = fermé
  sunday:   string | null
}

export interface RentalAgency {
  id:              string
  brandId:         string
  cityId?:         string
  name:            string
  address:         string
  city:            string
  postalCode:      string
  latitude:        number
  longitude:       number
  serviceRadiusKm: number
  phone:           string
  email:           string
  contactName:     string
  isAvailable:     boolean
  openingHours:    OpeningHours
  /** Injecté par le service — absent dans les mocks bruts */
  distanceKm?:     number
}
