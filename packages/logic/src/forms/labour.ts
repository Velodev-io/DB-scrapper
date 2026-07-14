import type { Gender, SkillLevel } from '@carry/shared'

export { GENDERS, SKILL_TYPES } from '@carry/shared'

export interface LabourFormState {
  fullName:       string
  age:            string
  gender:         Gender
  skillLevel:     SkillLevel
  skillType:      string
  phone:          string
  minimumWage:    string
  houseNo:        string
  street:         string
  locality:       string
  city:           string
  pincode:        string
  profilePhotoUrl: string | undefined
}

export const initialLabourForm: LabourFormState = {
  fullName:    '',
  age:         '',
  gender:      'Male',
  skillLevel:  'Skilled',
  skillType:   '',
  phone:       '',
  minimumWage: '',
  houseNo:     '',
  street:      '',
  locality:    '',
  city:        '',
  pincode:     '',
  profilePhotoUrl: undefined,
}

export function validateLabourForm(form: LabourFormState): string | null {
  if (!form.fullName.trim()) return 'Full name is required.'
  if (!form.age.trim())      return 'Age is required.'
  if (!form.phone.trim())    return 'Phone number is required.'
  const age = parseInt(form.age)
  if (isNaN(age) || age < 16 || age > 80) return 'Enter a valid age (16–80).'
  if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) return 'Enter a valid 10-digit phone number.'
  return null
}
