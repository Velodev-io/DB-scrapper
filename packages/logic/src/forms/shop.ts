export { SHOP_TYPES } from '@carry/shared'

export interface ShopFormState {
  shopName:    string
  shopType:    string
  keeperName:  string
  keeperPhone: string
  address:     string
  lat:         number | undefined
  lng:         number | undefined
  images:      string[]
}

export const initialShopForm: ShopFormState = {
  shopName:    '',
  shopType:    '',
  keeperName:  '',
  keeperPhone: '',
  address:     '',
  lat:         undefined,
  lng:         undefined,
  images:      [],
}

export function validateShopForm(form: ShopFormState): string | null {
  if (!form.shopName.trim())    return 'Shop name is required.'
  if (!form.shopType.trim())    return 'Shop type is required.'
  if (!form.keeperName.trim())  return 'Keeper name is required.'
  if (!form.keeperPhone.trim()) return 'Keeper phone is required.'
  if (!/^\d{10}$/.test(form.keeperPhone.replace(/\s/g, ''))) {
    return 'Enter a valid 10-digit phone number.'
  }
  return null
}
