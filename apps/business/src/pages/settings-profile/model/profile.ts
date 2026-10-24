/**
 * Business profile's details as a form (B-Settings `isProfile`, design §8 and §28.5, book B-37): the name, the
 * category, the About in the market's main language, the phone for clients, the amenities and whether online booking
 * is paused (a booking rule, switched here). Only what changed is sent: the profile's part to `PATCH …/settings/profile`,
 * the pause to `PATCH …/settings/rules`. The address, the logo and the photos are their own pieces.
 */
import type { BusinessProfile, BusinessProfileUpdate } from '@yeral/contract/settings'
import { MARKET } from '@yeral/domain/market'
import { AMENITIES, type Amenity } from '@yeral/domain/model'
import { isPhone, nationalDigits } from '@yeral/domain/phone'
import { DEFAULT_LOCALE } from '@yeral/i18n'
import { BUSINESS_NAME_MAX } from '@/shared/config'

/** The board's limits (design §28.5 «Text limits»): «128 / 1,000»; over it «Too long» blocks the save. */
export const NAME_MAX = BUSINESS_NAME_MAX
export const ABOUT_MAX = 1000

export interface ProfileForm {
  name: string
  categoryId: string
  /** The About in the market's main language (one language at the first release, design §28.1). */
  about: string
  /** The national digits: «65 10 20 30». */
  phone: string
  amenities: readonly Amenity[]
  /** «Pause online booking»: the rules' `onlineEnabled` turned around. */
  paused: boolean
  /** Another language has an About too, so this one may be emptied (the api keeps one). */
  aboutElsewhere: boolean
}

export type ProfileProblem = 'nameEmpty' | 'nameLong' | 'aboutEmpty' | 'aboutLong' | 'phoneIncomplete' | 'phoneInvalid'

export function formFrom(profile: BusinessProfile, onlineEnabled: boolean): ProfileForm {
  return {
    name: profile.name,
    categoryId: profile.categoryId,
    about: profile.about[DEFAULT_LOCALE] ?? '',
    phone: nationalDigits(profile.phone),
    // in the list's order, so a change is told apart from an order
    amenities: AMENITIES.filter((a) => profile.amenities.includes(a)),
    paused: !onlineEnabled,
    aboutElsewhere: Object.entries(profile.about).some(([lang, text]) => lang !== DEFAULT_LOCALE && !!text?.trim()),
  }
}

/**
 * What stops the save, field by field (spaces around a text don't count: the api trims them). An About that was
 * written can't be emptied while it's the only language (the api keeps one); one never written may stay empty.
 */
export function problemsOf(form: ProfileForm, stored: ProfileForm): Partial<Record<'name' | 'about' | 'phone', ProfileProblem>> {
  const name = form.name.trim().length
  const about = form.about.trim().length
  const emptied = about === 0 && stored.about.trim().length > 0 && !form.aboutElsewhere
  return {
    ...(name === 0 ? { name: 'nameEmpty' } : name > BUSINESS_NAME_MAX ? { name: 'nameLong' } : {}),
    ...(emptied ? { about: 'aboutEmpty' } : about > ABOUT_MAX ? { about: 'aboutLong' } : {}),
    ...(form.phone.length < MARKET.phone.length ? { phone: 'phoneIncomplete' } : !isPhone(form.phone) ? { phone: 'phoneInvalid' } : {}),
  }
}

export const isValid = (form: ProfileForm, stored: ProfileForm) => Object.keys(problemsOf(form, stored)).length === 0

/** The profile's changes for `PATCH …/settings/profile`; null when there are none. */
export function profileUpdate(form: ProfileForm, stored: ProfileForm): BusinessProfileUpdate | null {
  const update: BusinessProfileUpdate = {}
  if (form.name.trim() !== stored.name.trim()) update.name = form.name.trim()
  if (form.categoryId !== stored.categoryId) update.categoryId = form.categoryId
  if (form.about.trim() !== stored.about.trim()) update.about = { [DEFAULT_LOCALE]: form.about.trim() }
  if (form.phone !== stored.phone) update.phone = form.phone
  if (!sameAmenities(form.amenities, stored.amenities)) update.amenities = [...form.amenities]
  return Object.keys(update).length ? update : null
}

/** The stored form once the profile's part was saved (the pause may still be on its way). */
export const profileSaved = (form: ProfileForm, stored: ProfileForm): ProfileForm => ({ ...form, paused: stored.paused })

/** The pause's change for `PATCH …/settings/rules`; null when it's as saved. */
export const rulesUpdate = (form: ProfileForm, stored: ProfileForm) =>
  form.paused === stored.paused ? null : { onlineEnabled: !form.paused }

const sameAmenities = (a: readonly Amenity[], b: readonly Amenity[]) => a.length === b.length && a.every((x) => b.includes(x))

/** An amenity on or off, kept in the list's order. */
export const toggleAmenity = (list: readonly Amenity[], amenity: Amenity, on: boolean): Amenity[] =>
  AMENITIES.filter((a) => (a === amenity ? on : list.includes(a)))
