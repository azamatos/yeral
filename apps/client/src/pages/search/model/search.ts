import type { SearchParams } from '@yeral/sdk'
import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM } from '@yeral/domain/geo'
import { addDays, isYmd } from '@yeral/domain/time'
import type { Locale } from '@yeral/i18n'
import { z } from 'zod'
import { TIMES_OF_DAY } from '@/widgets/search-bar'

export const DAYS = ['today', 'tomorrow', 'week'] as const
export type Day = (typeof DAYS)[number]
export const SORTS = ['distance', 'rating', 'price'] as const
export type Sort = (typeof SORTS)[number]

/** The Rating menu (C7-Home results toolbar): 4.5+ · 4.0+. */
export const RATINGS = [4.5, 4] as const

export type PriceBand = 'to100' | '100to200' | 'from200'
/** The Price menu (C7-Home results toolbar): up to 100 · 100–200 · 200 and up, in the market's currency. */
export const PRICE_BANDS: readonly { id: PriceBand; from?: number; to?: number }[] = [
  { id: 'to100', to: 100 },
  { id: '100to200', from: 100, to: 200 },
  { id: 'from200', from: 200 },
]

/** Which band the address's range is; `custom` for a range the menu doesn't offer (an older link), shown as it is. */
export function priceBandOf(a: Pick<SearchAddress, 'from' | 'to'>): PriceBand | 'custom' | undefined {
  if (a.from === undefined && a.to === undefined) return undefined
  return PRICE_BANDS.find((b) => b.from === a.from && b.to === a.to)?.id ?? 'custom'
}

/** The address of a band; none clears the range. */
export function priceBandAddress(id: string | null): Pick<SearchAddress, 'from' | 'to'> {
  const band = PRICE_BANDS.find((b) => b.id === id)
  return { from: band?.from, to: band?.to }
}

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
  /** A day picked in the calendar (C7-Home «When»), a real `YYYY-MM-DD` (the api refuses any other); `day` wins when both are there. */
  date: z.string().refine(isYmd).optional().catch(undefined),
  /** The part of the day picked with it; the api doesn't filter by it yet, the bar only shows it. */
  tod: z.enum(TIMES_OF_DAY).optional().catch(undefined),
  sort: z.enum(SORTS).optional().catch(undefined),
  rating: z.coerce.number().min(0).max(5).optional().catch(undefined),
  from: whole.optional().catch(undefined),
  to: whole.optional().catch(undefined),
  /** Open now and Women only (book C-03): on or absent, as the api takes them. */
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

/** The widest radius the api takes: «Search further away» (C7-Home nothing found) goes straight to it. */
export const WIDEST_RADIUS_KM = Math.max(...RADIUS_OPTIONS_KM)

/** Whether a search around a position can go further: short of the widest radius. */
export const canWiden = (r: number = DEFAULT_RADIUS_KM) => r < WIDEST_RADIUS_KM

/**
 * The day the page shows: the toggle's day, else a calendar day from Home's When — today or tomorrow by their names,
 * any other as `date` (the count copy names it).
 */
export function dayOf(a: Pick<SearchAddress, 'day' | 'date'>, todayDate: string): Day | 'date' {
  if (a.day) return a.day
  if (!a.date || a.date === todayDate) return 'today'
  return a.date === addDays(todayDate, 1) ? 'tomorrow' : 'date'
}

/** What the api is asked. A range the wrong way round is read the right way, as the api refuses one. */
export function apiSearch(a: SearchAddress, lang: Locale, todayDate: string): SearchParams {
  const [minPrice, maxPrice] = a.from !== undefined && a.to !== undefined && a.from > a.to ? [a.to, a.from] : [a.from, a.to]
  return {
    lang,
    q: a.what || undefined,
    cat: a.cat,
    city: a.city,
    ...(a.day === 'tomorrow' ? { date: addDays(todayDate, 1) } : !a.day && a.date ? { date: a.date } : {}),
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

/** Any filter on (the toolbar's chips and the map area, not the day or the sort): the empty state offers to clear them. */
export const filtered = (a: SearchAddress) =>
  a.rating !== undefined ||
  a.from !== undefined ||
  a.to !== undefined ||
  !!a.open ||
  !!a.women ||
  (a.r !== undefined && a.r !== DEFAULT_RADIUS_KM) ||
  !!a.area

/** What Clear all and «Clear filters» reset, in one navigation. */
export const CLEARED: Pick<SearchAddress, 'rating' | 'from' | 'to' | 'open' | 'women' | 'r' | 'area'> = {
  rating: undefined,
  from: undefined,
  to: undefined,
  open: undefined,
  women: undefined,
  r: undefined,
  area: undefined,
}
