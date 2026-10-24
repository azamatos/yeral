import type { BusinessProfile } from '@yeral/contract/settings'
import { describe, expect, it } from 'vitest'
import { formFrom, isValid, problemsOf, profileSaved, profileUpdate, rulesUpdate, toggleAmenity } from './profile'

const profile: BusinessProfile = {
  slug: 'glow-studio',
  name: 'Glow Studio',
  logo: null,
  categoryId: 'beauty',
  about: { en: 'Hair, nails and brows.' },
  phone: '+99365102030',
  amenities: ['parking', 'wifi'],
  womenOnly: false,
  location: {
    lat: 37.95,
    lng: 58.38,
    cityId: 'ashgabat',
    address: '247 Bitarap Türkmenistan Avenue',
    street: 'Bitarap Türkmenistan Avenue',
  },
  floor: null,
  entranceNote: null,
  hideExactAddress: false,
  verification: 'verified',
  verificationReason: null,
  hidden: null,
}

describe('Business profile as a form (B-Settings)', () => {
  const stored = formFrom(profile, true)

  it('reads the profile: national digits, amenities in the list’s order, the pause from the rules', () => {
    expect(stored).toEqual({
      name: 'Glow Studio',
      categoryId: 'beauty',
      about: 'Hair, nails and brows.',
      phone: '65102030',
      amenities: ['wifi', 'parking'],
      paused: false,
      aboutElsewhere: false,
    })
    expect(formFrom(profile, false).paused).toBe(true)
  })

  it('sends only what changed, trimmed', () => {
    expect(profileUpdate(stored, stored)).toBeNull()
    expect(profileUpdate({ ...stored, name: '  Glow Studio  ' }, stored)).toBeNull()
    expect(profileUpdate({ ...stored, name: 'Glow Nails ', about: ' New. ' }, stored)).toEqual({
      name: 'Glow Nails',
      about: { en: 'New.' },
    })
    expect(profileUpdate({ ...stored, phone: '12345678', amenities: ['wifi'] }, stored)).toEqual({ phone: '12345678', amenities: ['wifi'] })
    expect(rulesUpdate(stored, stored)).toBeNull()
    expect(rulesUpdate({ ...stored, paused: true }, stored)).toEqual({ onlineEnabled: false })
  })

  it('blocks the save on the board’s limits', () => {
    expect(isValid(stored, stored)).toBe(true)
    expect(problemsOf({ ...stored, name: '  ' }, stored)).toEqual({ name: 'nameEmpty' })
    expect(problemsOf({ ...stored, name: 'x'.repeat(81) }, stored)).toEqual({ name: 'nameLong' })
    expect(problemsOf({ ...stored, about: 'x'.repeat(1001) }, stored)).toEqual({ about: 'aboutLong' })
    expect(problemsOf({ ...stored, phone: '6510' }, stored)).toEqual({ phone: 'phoneIncomplete' })
    // 8 digits that aren't a number of the market (it starts 1–7)
    expect(problemsOf({ ...stored, phone: '81234567' }, stored)).toEqual({ phone: 'phoneInvalid' })
  })

  it('keeps an About once written while it’s the only language (the api keeps one)', () => {
    expect(problemsOf({ ...stored, about: ' ' }, stored)).toEqual({ about: 'aboutEmpty' })
    const never = formFrom({ ...profile, about: {} }, true)
    expect(problemsOf(never, never)).toEqual({})
    const twice = formFrom({ ...profile, about: { en: 'Hair.', tk: 'Saç.' } }, true)
    expect(problemsOf({ ...twice, about: '' }, twice)).toEqual({})
  })

  it('a saved profile keeps the pause as it was until the rules are saved too', () => {
    expect(profileSaved({ ...stored, name: 'Glow Nails', paused: true }, stored)).toEqual({ ...stored, name: 'Glow Nails' })
  })

  it('keeps the amenities in the list’s order', () => {
    expect(toggleAmenity(['parking'], 'wifi', true)).toEqual(['wifi', 'parking'])
    expect(toggleAmenity(['wifi', 'parking'], 'wifi', false)).toEqual(['parking'])
  })
})
