import type { PropertyType, ListingType, PropertyStatus, FurnishingType } from '@carry/shared'

export {
  PROPERTY_TYPES,
  LISTING_TYPES,
  PROPERTY_STATUSES,
  FURNISHING_TYPES,
  BHK_OPTIONS
} from '@carry/shared'

export interface PropertyFormState {
  title:              string
  propertyType:       PropertyType
  listingType:        ListingType
  bhk:                number
  priceInr:           string
  areaSqft:           string
  locality:           string
  city:               string
  address:            string
  reraNumber:         string
  status:             PropertyStatus
  furnishing:         FurnishingType
  description:        string
  lat:                number | undefined
  lng:                number | undefined
  // Rent-specific
  securityDeposit:    string
  availableFrom:      string
  preferredTenant:    string
  petFriendly:        boolean
  maintenanceCharges: string
  leaseDuration:      string
  lockInPeriod:       string
  camCharges:         string
  plotAllowedUse:     string
  images:             string[]
  floorPlanUrl:       string | undefined
}

export const initialPropertyForm: PropertyFormState = {
  title:              '',
  propertyType:       'Apartment',
  listingType:        'Sale',
  bhk:                2,
  priceInr:           '',
  areaSqft:           '',
  locality:           '',
  city:               '',
  address:            '',
  reraNumber:         '',
  status:             'Ready',
  furnishing:         'Unfurnished',
  description:        '',
  lat:                undefined,
  lng:                undefined,
  securityDeposit:    '',
  availableFrom:      '',
  preferredTenant:    'Any',
  petFriendly:        false,
  maintenanceCharges: '',
  leaseDuration:      '',
  lockInPeriod:       '',
  camCharges:         '',
  plotAllowedUse:     'Any',
  images:             [],
  floorPlanUrl:       undefined,
}

export function validatePropertyForm(form: PropertyFormState): string | null {
  if (!form.title.trim())    return 'Property title is required.'
  if (!form.priceInr.trim()) return 'Price is required.'
  if (!form.locality.trim()) return 'Locality is required.'
  if (!form.city.trim())     return 'City is required.'
  if (!form.areaSqft.trim()) return 'Area is required.'
  const price = parseInt(form.priceInr)
  if (isNaN(price) || price <= 0) return 'Enter a valid price.'
  const area = parseInt(form.areaSqft)
  if (isNaN(area) || area <= 0)   return 'Enter a valid area.'
  return null
}
