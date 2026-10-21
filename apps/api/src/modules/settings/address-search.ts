/**
 * The address search behind the map pin (book B-04's address step, B-37's "Salgyny üýtget"; ADR 0027): the words
 * typed, near the city picked, in the market's country, through the geocoder port. 120 an hour per account.
 */
import type { addressSearchSchema } from '@yeral/contract/settings'
import { MARKET } from '@yeral/domain/market'
import type { Locale } from '@yeral/domain/model'
import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import { cities } from '../../db/schema'
import type { Deps } from '../../deps'
import type { User } from '../../http/env'
import { ApiError, invalid } from '../../http/errors'
import { hit, rateLimited } from '../../lib/rate-limit'

export const ADDRESS_SEARCHES_PER_HOUR = 120
const RESULTS = 6

export async function searchAddress(
  deps: Deps,
  user: User,
  q: string,
  cityId: string,
  lang: Locale,
): Promise<z.infer<typeof addressSearchSchema>> {
  if (!deps.geocoder.on) throw new ApiError('address_search_unavailable')
  const [city] = await deps.db.select({ lat: cities.lat, lng: cities.lng }).from(cities).where(eq(cities.id, cityId))
  if (!city) throw invalid({ path: ['cityId'], code: 'not_found' })
  const r = await hit(deps.db, `geo:user:${user.id}`, ADDRESS_SEARCHES_PER_HOUR, 3600, deps.now())
  if (!r.ok) throw rateLimited(r.retryAfterSec)
  try {
    return { items: await deps.geocoder.search(q, { near: city, country: MARKET.code, lang, limit: RESULTS }) }
  } catch (e) {
    // the geocoder is someone else's: down or slow, the pin is placed by hand
    deps.log.warn('address search failed', { error: e instanceof Error ? e.message : String(e) })
    throw new ApiError('address_search_unavailable')
  }
}
