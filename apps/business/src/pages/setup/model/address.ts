/**
 * The address step's form (B-Onboarding step 3, book B-04, design §28.5 text limits): the city, the address picked
 * from the search (or typed, when the search has nothing, and pinned by hand), the pin, «I work from home», the floor
 * and the entrance note; what it sends to the profile (`PATCH /w/{slug}/settings/profile`).
 */

/** The address line's longest (design §28.5; the contract's street line). */
export const ADDRESS_MAX = 120
/** «Where is the entrance?» (design §28.5). */
export const ENTRANCE_MAX = 200
/** «Floor, room» (the contract). */
export const FLOOR_MAX = 40

export type LatLng = { lat: number; lng: number }

export type AddressForm = {
  cityId: string
  /** What's in the address field. */
  query: string
  /** The address chosen from the list; typing again drops it until one is chosen again. */
  picked: { line: string; street: string } | null
  pin: LatLng
  home: boolean
  floor: string
  entrance: string
}

/** What the step reads of the profile (`GET /w/{slug}/settings/profile`). */
type Profile = {
  location: LatLng & { cityId: string; address: string; street: string }
  floor: string | null
  entranceNote: string | null
  hideExactAddress: boolean
}

/** The form as the profile has it: a draft starts with no address, its pin at the main city's centre. */
export function formFrom(profile: Profile): AddressForm {
  const { location } = profile
  const has = location.street.length > 0
  return {
    cityId: location.cityId,
    query: has ? location.address : '',
    picked: has ? { line: location.address, street: location.street } : null,
    pin: { lat: location.lat, lng: location.lng },
    home: profile.hideExactAddress,
    floor: profile.floor ?? '',
    entrance: profile.entranceNote ?? '',
  }
}

/** Why Continue waits, or null when the step can be saved; the counters count what's kept, without the spaces around it. */
export function addressProblem(form: AddressForm): 'long' | 'entrance' | 'floor' | 'pick' | null {
  if (form.query.trim().length > ADDRESS_MAX) return 'long'
  if (form.entrance.trim().length > ENTRANCE_MAX) return 'entrance'
  if (form.floor.trim().length > FLOOR_MAX) return 'floor'
  if (!form.picked) return 'pick'
  return null
}

/** What the profile takes from a valid form. */
export function addressUpdate(form: AddressForm & { picked: NonNullable<AddressForm['picked']> }): Profile {
  return {
    location: { cityId: form.cityId, address: form.picked.line, street: form.picked.street, lat: form.pin.lat, lng: form.pin.lng },
    floor: form.floor.trim() || null,
    entranceNote: form.entrance.trim() || null,
    hideExactAddress: form.home,
  }
}

/** Whether the form differs from what's saved (what leaving the step would lose). */
export function addressEdited(form: AddressForm, saved: AddressForm): boolean {
  return (
    form.cityId !== saved.cityId ||
    form.picked?.line !== saved.picked?.line ||
    form.picked?.street !== saved.picked?.street ||
    form.pin.lat !== saved.pin.lat ||
    form.pin.lng !== saved.pin.lng ||
    form.home !== saved.home ||
    form.floor.trim() !== saved.floor.trim() ||
    form.entrance.trim() !== saved.entrance.trim()
  )
}
