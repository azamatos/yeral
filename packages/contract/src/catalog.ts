/**
 * Public catalogue: categories, search, business cards and pages, reviews, places (client spec §4.1–4.3, §5).
 * Text comes resolved for `?lang=`; distances only when the request carries a position.
 */
import { MAX_ONLINE_PARTY } from '@yeral/domain/availability'
import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM } from '@yeral/domain/geo'
import { CONFIRM_MODES } from '@yeral/domain/model'
import { z } from 'zod'
import {
  bookingTypeSchema,
  boolQuery,
  cityRefSchema,
  cursorQuerySchema,
  epochSchema,
  geoSchema,
  idSchema,
  langQuerySchema,
  listOf,
  minuteSchema,
  nextFreeSchema,
  phoneSchema,
  photoSchema,
  priceSchema,
  slugSchema,
  startMinuteSchema,
  ymdSchema,
} from './common'

// ── Categories ──

export const categorySchema = z
  .object({
    id: slugSchema,
    /** Lucide icon name. */
    icon: z.string(),
    name: z.string(),
    /** Under the tile on Home: "Saç, sakgal". */
    hint: z.string(),
    bookingTypes: z.array(bookingTypeSchema).min(1),
    /** "hünärmen", "lukman", "mugallym", "tälimçi", "ussa" … */
    specialistWord: z.string(),
    /** SEO intro on the category landing `/{lang}/c/{category}`. */
    intro: z.string(),
  })
  .meta({ id: 'Category' })
export const categoryListSchema = listOf(categorySchema)

// ── Opening state ──

export const openStateSchema = z
  .discriminatedUnion('open', [
    z.object({ open: z.literal(true), until: minuteSchema }),
    z.object({ open: z.literal(false), inDays: z.number().int().min(0).nullable(), at: startMinuteSchema.nullable() }),
  ])
  .meta({ id: 'OpenState' })

// ── Cards (Home, Search, favourites, "Golaýdaky ýerler") ──

/** What a card shows for the chosen day, per booking type (client spec §4.2 "Row content per type"). */
export const cardAvailabilitySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('appointment'), date: ymdSchema, starts: z.array(startMinuteSchema).max(4), more: z.number().int().min(0) }),
  z.object({
    type: z.literal('table'),
    date: ymdSchema,
    partySize: z.number().int(),
    starts: z.array(startMinuteSchema).max(4),
    more: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('class'),
    session: z
      .object({ id: idSchema, date: ymdSchema, start: startMinuteSchema, name: z.string(), seatsLeft: z.number().int().min(0) })
      .nullable(),
  }),
])

export const businessCardSchema = z
  .object({
    slug: slugSchema,
    name: z.string(),
    category: z.object({ id: slugSchema, name: z.string() }),
    photo: photoSchema.nullable(),
    rating: z.number().min(0).max(5).nullable(),
    reviewsCount: z.number().int().min(0),
    /** Street line for rows: "Bitarap Türkmenistan şaýoly 247". */
    street: z.string(),
    city: cityRefSchema,
    geo: geoSchema,
    /** Null when the request has no position (location denied). */
    distanceM: z.number().int().min(0).nullable(),
    bookingType: bookingTypeSchema,
    onlineEnabled: z.boolean(),
    /**
     * Lowest shown service price ("40 TMT-den"); null for tables and for places whose online services are all hidden
     * ("Price at the place"). No average bill (book Q-103).
     */
    priceFrom: priceSchema.nullable(),
    open: openStateSchema,
    availability: cardAvailabilitySchema,
  })
  .meta({ id: 'BusinessCard' })
export type BusinessCard = z.infer<typeof businessCardSchema>

// ── Search ──

export const SEARCH_SORTS = ['distance', 'rating', 'price'] as const

/** A position is both coordinates or neither: one alone would silently search without a position. */
function latWithLng(v: { lat?: number; lng?: number }, ctx: z.RefinementCtx) {
  if ((v.lat === undefined) !== (v.lng === undefined))
    ctx.addIssue({ code: 'custom', path: [v.lat === undefined ? 'lat' : 'lng'], message: 'lat and lng come together' })
}

/** A price in a query, up to the largest amount the database stores (a 32-bit integer). */
const priceQuery = z.coerce.number().int().min(0).max(2_147_483_647)

const latQuery = z.coerce.number().min(-90).max(90)
const lngQuery = z.coerce.number().min(-180).max(180)

const searchFields = langQuerySchema.extend(cursorQuerySchema.shape).extend({
  /** "Näme?": a service, a business name or a category word. */
  q: z.string().trim().max(80).optional(),
  cat: slugSchema.optional(),
  /**
   * "Nirede?" set to a city (book Q-107): the list keeps to it. Without a city the market's main one; an unknown city
   * counts as the main one. Ignored with a position (near me, or around a picked place) and with `bbox`: both cross
   * city lines.
   */
  city: slugSchema.optional(),
  lat: latQuery.optional(),
  lng: lngQuery.optional(),
  r: z.coerce
    .number()
    .refine((n) => (RADIUS_OPTIONS_KM as readonly number[]).includes(n))
    .default(DEFAULT_RADIUS_KM),
  /** The day whose free times the cards show (today by default); `week` widens "has free time" to 7 days. */
  date: ymdSchema.optional(),
  week: boolQuery.optional(),
  sort: z.enum(SEARCH_SORTS).default('distance'),
  minRating: z.coerce.number().min(0).max(5).optional(),
  /** The price range (book C-03): places with a paid online service inside it; one whose services are all free from 0. */
  minPrice: priceQuery.optional(),
  maxPrice: priceQuery.optional(),
  openNow: boolQuery.optional(),
  type: bookingTypeSchema.optional(),
  womenOnly: boolQuery.optional(),
  /** "Bu ýerde gözle": the visible map area, `minLat,minLng,maxLat,maxLng`. */
  bbox: z
    .string()
    .transform((s) => s.split(',').map(Number))
    .pipe(
      z
        .tuple([z.number().min(-90).max(90), z.number().min(-180).max(180), z.number().min(-90).max(90), z.number().min(-180).max(180)])
        .refine(([minLat, minLng, maxLat, maxLng]) => minLat <= maxLat && minLng <= maxLng, 'Expected min ≤ max'),
    )
    .optional(),
  /** Table cards: times for this party size (default 2); larger parties book by phone. */
  party: z.coerce.number().int().min(1).max(MAX_ONLINE_PARTY).default(2),
})

/** A price range runs upwards: a reversed one would find nothing and read as "no places". */
function priceRange(v: { minPrice?: number; maxPrice?: number }, ctx: z.RefinementCtx) {
  if (v.minPrice !== undefined && v.maxPrice !== undefined && v.minPrice > v.maxPrice)
    ctx.addIssue({ code: 'custom', path: ['minPrice'], message: 'minPrice is above maxPrice' })
}

export const searchQuerySchema = searchFields.superRefine(latWithLng).superRefine(priceRange)
export type SearchQuery = z.infer<typeof searchQuerySchema>

export const searchResponseSchema = listOf(businessCardSchema)
  .extend({
    /** False when there was no position: distances are hidden and the list is sorted by rating × reviews. */
    located: z.boolean(),
    /** The city the list keeps to (the chosen one, else the market's main one); null near a position and in a map area. */
    city: slugSchema.nullable(),
  })
  .meta({ id: 'SearchResponse' })

export const suggestQuerySchema = langQuerySchema.extend({
  q: z.string().trim().min(1).max(80),
  /** Services and businesses in this city only, as search keeps to it (an unknown city counts as the main one). */
  city: slugSchema.optional(),
})
export const suggestResponseSchema = z.object({
  categories: z.array(z.object({ id: slugSchema, name: z.string() })).max(4),
  services: z.array(z.string()).max(6),
  businesses: z.array(z.object({ slug: slugSchema, name: z.string(), category: z.string() })).max(6),
})

// ── Cities and places ("Nirede?") ──

export const citySchema = z
  .object({
    id: slugSchema,
    name: z.string(),
    /** The centre, where the map opens. */
    lat: z.number(),
    lng: z.number(),
  })
  .meta({ id: 'City' })
export const citiesQuerySchema = langQuerySchema
  .extend({
    /** The person's position, to preselect the city they're in. */
    lat: latQuery.optional(),
    lng: lngQuery.optional(),
  })
  .superRefine(latWithLng)
export const cityListSchema = z
  .object({
    /** The market's cities in menu order. */
    items: z.array(citySchema),
    /** Where a visitor starts with no city chosen and no position. */
    main: slugSchema,
    /** The city the position is in (its centre within `CITY_REACH_KM`); null without a position or far from every city. */
    nearest: slugSchema.nullable(),
  })
  .meta({ id: 'CityList' })

export const placeSchema = z.object({ label: z.string(), lat: z.number(), lng: z.number() }).meta({ id: 'Place' })
export const placeSuggestQuerySchema = langQuerySchema.extend({
  q: z.string().trim().min(2).max(80),
  /** Places in this city only (an unknown city counts as the main one). */
  city: slugSchema.optional(),
})
export const placeListSchema = z.object({ items: z.array(placeSchema).max(6) })

// ── Business page ──

export const serviceSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    description: z.string().nullable(),
    durationMin: z.number().int().min(5),
    price: priceSchema,
    staffIds: z.array(idSchema),
  })
  .meta({ id: 'Service' })

export const serviceGroupSchema = z
  .object({ id: idSchema, name: z.string(), services: z.array(serviceSchema) })
  .meta({ id: 'ServiceGroup' })

export const specialistSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    /** Specialization: "Stilist", "Dyrnak ussasy". */
    role: z.string().nullable(),
    photo: photoSchema.nullable(),
    rating: z.number().min(0).max(5).nullable(),
    serviceIds: z.array(idSchema),
  })
  .meta({ id: 'Specialist' })

export const dayHoursSchema = z.object({
  open: minuteSchema,
  close: minuteSchema,
  break: z.object({ start: minuteSchema, end: minuteSchema }).nullable(),
})

export const specialDaySchema = z.object({
  date: ymdSchema,
  name: z.string(),
  hours: z.object({ open: minuteSchema, close: minuteSchema }).nullable(),
})

export const tableAreaSchema = z.object({
  id: idSchema,
  name: z.string(),
  note: z.string().nullable(),
  minParty: z.number().int().min(1),
  maxParty: z.number().int().min(1),
})

export const ratingBreakdownSchema = z.object({
  1: z.number().int(),
  2: z.number().int(),
  3: z.number().int(),
  4: z.number().int(),
  5: z.number().int(),
})

export const businessDetailSchema = z
  .object({
    slug: slugSchema,
    name: z.string(),
    category: z.object({ id: slugSchema, name: z.string() }),
    bookingTypes: z.array(bookingTypeSchema).min(1),
    specialistWord: z.string(),
    rating: z.number().min(0).max(5).nullable(),
    reviewsCount: z.number().int().min(0),
    ratingBreakdown: ratingBreakdownSchema,
    /** The street address; the city is `city`. */
    address: z.string(),
    city: cityRefSchema,
    entranceNote: z.string().nullable(),
    /** Home-based: the exact address shows only on a confirmed booking; `geo` is then approximate. */
    hideExactAddress: z.boolean(),
    /** When the business moved here, for 30 days after: the page says "New address" (book Q-215). */
    movedAt: epochSchema.nullable(),
    geo: geoSchema,
    distanceM: z.number().int().min(0).nullable(),
    phone: phoneSchema,
    photos: z.array(photoSchema),
    about: z.string(),
    /** Amenity keys (`wifi`, `air_conditioning`, `parking`, `card_payment` …); the app translates them. */
    amenities: z.array(z.string()),
    /** Seven entries, Monday first; null = closed. */
    hours: z.array(dayHoursSchema.nullable()).length(7),
    /** Special days in the next 14 days ("Şu gün ýapyk · Baýramçylyk"). */
    specialDays: z.array(specialDaySchema),
    open: openStateSchema,
    rules: z.object({
      cancelWindowMinutes: z.number().int().nullable(),
      lateToleranceMinutes: z.number().int(),
      note: z.string().nullable(),
    }),
    onlineEnabled: z.boolean(),
    /**
     * Whether whoever is looking may book online here: false while the business has paused online booking, and for a
     * signed-in client who may book it only by phone, who sees the "Jaň et" card instead (book A7, Q-154). Signed out,
     * it follows `onlineEnabled`: the card shows once the client logs in. On a `preview` it's false too, and means
     * booking is off (the buttons shown disabled, Q-153), not the card: read `preview` first.
     */
    bookOnline: z.boolean(),
    /**
     * The owner's and team's own page while Ýeral still checks it (book F-032): "Sahypaňyz barlagda — häzir ony diňe siz
     * we toparyňyz görýärsiňiz." Nobody else sees it, and nothing can be booked (`bookOnline` false, Q-153). `rejected`
     * carries the Ýeral team's reason (Q-274). Null on a verified page.
     */
    preview: z.object({ status: z.enum(['pending', 'rejected']), reason: z.string().nullable() }).nullable(),
    confirmMode: z.enum(CONFIRM_MODES),
    holdMinutes: z.number().int(),
    leadMinutes: z.number().int(),
    windowDays: z.number().int(),
    /**
     * "Adatça 15 minudyň dowamynda tassyklaýar" (book Q-113): the median answer time of the last 30 days, rounded up
     * (15 min, 1 h …); null until the business has answered 5 requests in them.
     */
    typicalConfirmMinutes: z.number().int().nullable(),
    priceFrom: priceSchema.nullable(),
    /** Next free time for the sticky card (appointment), null when nothing is free in the window. */
    nextFree: nextFreeSchema,
    serviceGroups: z.array(serviceGroupSchema),
    specialists: z.array(specialistSchema),
    tables: z.object({ areas: z.array(tableAreaSchema), maxParty: z.number().int(), requests: z.array(z.string()) }).nullable(),
    similar: z.array(businessCardSchema).max(4),
  })
  .meta({ id: 'BusinessDetail' })
export type BusinessDetail = z.infer<typeof businessDetailSchema>

export const businessQuerySchema = langQuerySchema
  .extend({
    lat: latQuery.optional(),
    lng: lngQuery.optional(),
  })
  .superRefine(latWithLng)

// ── Reviews ──

export const reviewSchema = z
  .object({
    id: idSchema,
    /** "Aýjemal G." */
    author: z.string(),
    rating: z.number().int().min(1).max(5),
    tags: z.array(z.string()),
    text: z.string().nullable(),
    createdAt: epochSchema,
    /** "Aýal saç kesimi · Aýna" */
    what: z.string(),
    reply: z.object({ text: z.string(), createdAt: epochSchema }).nullable(),
    /** "Ýeral barlaýar · ortaça baha hasaplanmaýar": the business reported it and Ýeral is checking (book B-54). */
    underReview: z.boolean(),
  })
  .meta({ id: 'Review' })
export const reviewListSchema = listOf(reviewSchema)
export const reviewsQuerySchema = langQuerySchema.extend(cursorQuerySchema.shape)
