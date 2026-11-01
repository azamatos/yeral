import type { SearchParams } from '@yeral/sdk'
import { addDays } from '@yeral/domain/time'
import type { Locale } from '@yeral/i18n'
import { z } from 'zod'

export const DAYS = ['today', 'tomorrow', 'week'] as const
export type Day = (typeof DAYS)[number]
export const SORTS = ['distance', 'rating', 'price'] as const
export type Sort = (typeof SORTS)[number]

/** «Rating 4.5+» (Search). */
export const TOP_RATING = 4.5

const whole = z.coerce.number().int().min(0).max(1_000_000)

/**
 * The search's address (book C-03, client spec §3): what, the category, the city, the day, the sort and the filters. All of
 * it, so a search can be shared and the server renders it; what doesn't read is left out, not an error.
 */
export const searchAddress = z.object({
  what: z.string().trim().max(80).optional().catch(undefined),
  cat: z.string().max(64).optional().catch(undefined),
  city: z.string().max(64).optional().catch(undefined),
  day: z.enum(DAYS).optional().catch(undefined),
  sort: z.enum(SORTS).optional().catch(undefined),
  rating: z.coerce.number().min(0).max(5).optional().catch(undefined),
  from: whole.optional().catch(undefined),
  to: whole.optional().catch(undefined),
  open: z.literal(true).optional().catch(undefined),
  women: z.literal(true).optional().catch(undefined),
  /** «Search this area»: `south,west,north,east`. */
  area: z.string().max(80).optional().catch(undefined),
})
export type SearchAddress = z.infer<typeof searchAddress>

/** The address's area as the api takes it: `[minLat, minLng, maxLat, maxLng]`; anything else is no area. */
export function areaOf(area: string | undefined): [number, number, number, number] | undefined {
  const [south, west, north, east, extra] = (area ?? '').split(',').map(Number)
  if (south === undefined || west === undefined || north === undefined || east === undefined || extra !== undefined) return undefined
  if (![south, west, north, east].every(Number.isFinite)) return undefined
  if (Math.abs(south) > 90 || Math.abs(north) > 90 || Math.abs(west) > 180 || Math.abs(east) > 180) return undefined
  return south <= north && west <= east ? [south, west, north, east] : undefined
}

/** What the api is asked. A range the wrong way round is read the right way, as the api refuses one. */
export function apiSearch(a: SearchAddress, lang: Locale, todayDate: string): SearchParams {
  const [minPrice, maxPrice] = a.from !== undefined && a.to !== undefined && a.from > a.to ? [a.to, a.from] : [a.from, a.to]
  return {
    lang,
    q: a.what || undefined,
    cat: a.cat,
    city: a.city,
    ...(a.day === 'tomorrow' ? { date: addDays(todayDate, 1) } : {}),
    ...(a.day === 'week' ? { week: true } : {}),
    sort: a.sort,
    minRating: a.rating,
    minPrice,
    maxPrice,
    openNow: a.open,
    womenOnly: a.women,
    bbox: areaOf(a.area),
  }
}

/** Any filter on (the drawer's and the chips', not the day or the sort): the empty state offers to clear them. */
export const filtered = (a: SearchAddress) =>
  a.rating !== undefined || a.from !== undefined || a.to !== undefined || !!a.open || !!a.women || !!a.area

/** How many of the drawer's filters are on, for its chip. */
export const filterCount = (a: SearchAddress) => [a.from !== undefined || a.to !== undefined, !!a.open, !!a.women].filter(Boolean).length
