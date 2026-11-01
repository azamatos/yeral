import type { SearchParams } from '@yeral/sdk'
import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM } from '@yeral/domain/geo'
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
  /** Around a position (near me, a typed place): `lat,lng`. */
  near: z.string().max(40).optional().catch(undefined),
  /** The radius around it, km. */
  r: z.coerce
    .number()
    .refine((n) => (RADIUS_OPTIONS_KM as readonly number[]).includes(n))
    .optional()
    .catch(undefined),
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

/** The address's position; anything else is none. */
export function nearOf(near: string | undefined): { lat: number; lng: number } | undefined {
  const [lat, lng, extra] = (near ?? '').split(',').map(Number)
  if (lat === undefined || lng === undefined || extra !== undefined) return undefined
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined
}

/** The next wider radius, for the empty state; none past the last. */
export const widerRadius = (r: number = DEFAULT_RADIUS_KM) => RADIUS_OPTIONS_KM.find((km) => km > r)

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
    ...nearOf(a.near),
    ...(nearOf(a.near) && a.r ? { r: a.r } : {}),
  }
}

/** Any filter on (the drawer's and the chips', not the day or the sort): the empty state offers to clear them. */
export const filtered = (a: SearchAddress) =>
  a.rating !== undefined || a.from !== undefined || a.to !== undefined || !!a.open || !!a.women || !!a.area

/** How many of the drawer's filters are on, for its chip. */
export const filterCount = (a: SearchAddress) => [a.from !== undefined || a.to !== undefined, !!a.open, !!a.women].filter(Boolean).length
