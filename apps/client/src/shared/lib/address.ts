import type { Fmt } from '@yeral/i18n'

/**
 * «Bitarap Türkmenistan avenue 247, Ashgabat, 2nd floor»: a place's address with its city and floor (a business page's
 * header and About, a booking's drawer).
 */
export function addressLine(place: { address: string; city: { name: string }; floor: string | null }, fmt: Fmt): string {
  return [fmt.addressIn(place.address, place.city.name), place.floor].filter(Boolean).join(', ')
}
