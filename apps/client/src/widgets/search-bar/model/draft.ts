import { placeAddress, type Place } from '@/features/pick-place'
import { whenAddress, type When } from './when'

/** What a search sends to the results page: the words, the place and the When, as the address reads them. */
export type SearchDraft = { what?: string } & ReturnType<typeof placeAddress> & ReturnType<typeof whenAddress>

export const draftOf = (what: string, place: Place | null, when: When, today: string): SearchDraft => ({
  what: what.trim() || undefined,
  ...placeAddress(place),
  ...whenAddress(when, today),
})
