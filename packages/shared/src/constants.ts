export const SKILL_TYPES = [
  'Mason / Bricklayer',
  'Painter',
  'Electrician',
  'Plumber',
  'Carpenter / Woodworker',
  'Welder / Fabricator',
  'Tile Setter / Flooring',
  'Roofer',
  'Civil Helper / General Labour',
  'Other',
] as const

export type SkillType = typeof SKILL_TYPES[number]

export const PROJECT_CATEGORIES = [
  'Turnkey Villa',
  'Renovation',
  'Interior',
  'Commercial Build',
] as const

export const PROPERTY_TYPES    = ['Apartment', 'Villa', 'Plot', 'Commercial']    as const
export const LISTING_TYPES     = ['Sale', 'Resale', 'Under Construction']         as const
export const PROPERTY_STATUSES = ['Ready', 'Under Construction']                  as const
export const FURNISHING_TYPES  = ['Unfurnished', 'Semi-Furnished', 'Furnished']  as const
export const PACKAGE_TIERS     = ['Basic', 'Premium', 'Luxury']                  as const
export const GENDERS           = ['Male', 'Female', 'Other']                     as const
export const REVIEW_STATUSES   = ['pending', 'reviewed', 'deleted']              as const

// BHK options for the chip selector
export const BHK_OPTIONS = [1, 2, 3, 4, 5] as const

// Price label formatter — converts raw INR to display label
export function formatPriceLabel(priceInr: number): string {
  if (priceInr >= 10_000_000) {
    return `₹${(priceInr / 10_000_000).toFixed(2)} Cr`
  }
  if (priceInr >= 100_000) {
    return `₹${(priceInr / 100_000).toFixed(2)} L`
  }
  return `₹${priceInr.toLocaleString('en-IN')}`
}

// Shop type suggestions (agent can type any free-text value)
export const SHOP_TYPES = [
  'Cement',
  'Bricks',
  'Sand / Aggregate',
  'Steel / TMT Bars',
  'Hardware & Tools',
  'Tiles & Flooring',
  'Plumbing Supplies',
  'Electrical Supplies',
  'Paint & Chemicals',
  'Glass & Aluminum',
  'Wood & Timber',
  'General Construction',
  'Other',
] as const

export type ShopType = typeof SHOP_TYPES[number]
