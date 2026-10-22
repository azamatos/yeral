/**
 * The address search behind the map pin (book B-04's address step, B-37's "Salgyny üýtget"; ADR 0027): the words
 * typed, near the city picked, in the market's country, through the geocoder port. Only searches that reach the
 * geocoder count: 120 an hour per account and 240 per internet address.
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
/** Two accounts' worth: a shared office's owners, a script, accounts made up while the code shows on the screen. */
export const ADDRESS_SEARCHES_PER_ADDRESS_HOUR = 240
const RESULTS = 6

export async function searchAddress(
  deps: Deps,
  user: User,
  ip: string,
  q: string,
  cityId: string,
  lang: Locale,
): Promise<z.infer<typeof addressSearchSchema>> {
  if (!deps.geocoder.on) throw new ApiError('address_search_unavailable')
  const [city] = await deps.db.select({ lat: cities.lat, lng: cities.lng }).from(cities).where(eq(cities.id, cityId))
  if (!city) throw invalid({ path: ['cityId'], code: 'not_found' })
  const opts = { near: city, country: MARKET.code, lang, limit: RESULTS }
  // an answer kept from an earlier search costs the geocoder nothing, so it isn't counted
  const kept = deps.geocoder.cached(q, opts)
  if (kept) return { items: kept }
  // every visitor of the demo workspace is its one demo owner: they're told apart by their address only
  const limits: [string, number][] = [[`geo:ip:${ip}`, ADDRESS_SEARCHES_PER_ADDRESS_HOUR]]
  if (!user.demo) limits.push([`geo:user:${user.id}`, ADDRESS_SEARCHES_PER_HOUR])
  for (const [key, limit] of limits) {
    const r = await hit(deps.db, key, limit, 3600, deps.now())
    if (!r.ok) throw rateLimited(r.retryAfterSec)
  }
  try {
    return { items: await deps.geocoder.search(q, opts) }
  } catch (e) {
    // the geocoder is someone else's: down, slow or throttling us, the pin is placed by hand
    deps.log.warn('address search failed', { error: e instanceof Error ? e.message : String(e) })
    throw new ApiError('address_search_unavailable')
  }
}
