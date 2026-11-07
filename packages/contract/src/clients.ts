/**
 * A business's clients as the team keeps them (book B-32, B-34; `/w/{slug}/clients…`): the list with its chips, the
 * new-booking drawer's lookup by phone or name, the client card. A specialist sees only clients with a booking with
 * them, and of each only those bookings; sums ("Total", "Average check") only with "See revenue" (the owner).
 */
import { TEAM_NOTE_MAX, CLIENT_SEGMENTS, CLIENT_TAG_MAX, CLIENT_TAGS_MAX } from '@yeral/domain/clients'
import { NAME_MAX } from '@yeral/domain/names'
import { BOOKING_STATUSES, CLIENT_SOURCES, COMPLAINT_TYPES } from '@yeral/domain/model'
import { nationalDigits } from '@yeral/domain/phone'
import { z } from 'zod'
import {
  bookingCodeSchema,
  cursorQuerySchema,
  epochSchema,
  idSchema,
  langQuerySchema,
  listOf,
  minuteSchema,
  moneySchema,
  phoneInputSchema,
  phoneSchema,
  priceSchema,
  slugSchema,
  startMinuteSchema,
  ymdSchema,
} from './common'
import { complaintBySchema } from './calendar'
import { teamItemSchema } from './requests'

export const clientParamSchema = z.object({ slug: slugSchema, id: idSchema })

/** The client's next booking or waiting request ("Indiki ýazylyş"), with a request's answer time. */
export const clientNextSchema = z.object({
  code: bookingCodeSchema,
  date: ymdSchema,
  start: startMinuteSchema,
  status: z.enum(['pending', 'confirmed']),
  holdUntil: epochSchema.nullable(),
})

export const clientRowSchema = z
  .object({
    id: idSchema,
    /** null: saved without a name ("Unnamed client", the number below). */
    name: z.string().nullable(),
    /** null once the number passed to someone else (book Q-270): the record keeps the person's history. */
    phone: phoneSchema.nullable(),
    /** The team's own tags. */
    tags: z.array(z.string()),
    /** New · Regular · Lapsed · Reported, worked out from the bookings; none before a first visit. */
    segments: z.array(z.enum(CLIENT_SEGMENTS)),
    /**
     * "Trusted on Ýeral" (design v0.7 · D): the account has 5 or more completed visits on Ýeral and no no-show or
     * report in the last 12 months. The mark only: the business never sees the visits elsewhere.
     */
    trusted: z.boolean(),
    /** "Phone only": online booking is closed for them (by hand or after the no-show limit, B-35). */
    phoneOnly: z.boolean(),
    /** Completed visits. */
    visits: z.number().int(),
    /** The last completed visit (a no-show doesn't count). */
    lastVisit: ymdSchema.nullable(),
    /** "Total": what the completed visits cost; null without "See revenue". */
    total: moneySchema.nullable(),
    /** "Average check" of the completed visits with a price; null without "See revenue" or before one. */
    avgCheck: moneySchema.nullable(),
    next: clientNextSchema.nullable(),
  })
  .meta({ id: 'ClientRow' })

/**
 * What the list sorts by: `recent` (the most recently seen first: the latest booking's day, ahead or past, else the day
 * the business added them), the name, the completed visits, the last visit, "Total" or the next booking. Ties keep the
 * same order on every page; a client without the thing (no last visit, no booking ahead, no name) comes last either
 * way, while `visits` and `total` count a client without a visit as 0 (first ascending).
 */
export const CLIENT_SORTS = ['recent', 'name', 'visits', 'lastVisit', 'total', 'nextBooking'] as const
export type ClientSort = (typeof CLIENT_SORTS)[number]
export const SORT_DIRS = ['asc', 'desc'] as const
export type SortDir = (typeof SORT_DIRS)[number]
/** Each sort's own direction without `dir`: the biggest, latest or soonest first; names A to Z. */
export const CLIENT_SORT_DIR: Record<ClientSort, SortDir> = {
  recent: 'desc',
  name: 'asc',
  visits: 'desc',
  lastVisit: 'desc',
  total: 'desc',
  nextBooking: 'asc',
}

/** The Tag filter takes up to this many of the team's tags at once. */
export const CLIENT_TAG_FILTER_MAX = 20
/** "Upcoming booking": `yes`, a waiting request or a visit ahead; `no`, neither. */
export const CLIENT_UPCOMING = ['yes', 'no'] as const
export type ClientUpcoming = (typeof CLIENT_UPCOMING)[number]

const tagFilterSchema = z.string().trim().min(1).max(CLIENT_TAG_MAX)

/** The tags Ýeral sets, which the Tag filter lists under "Automatic": Trusted (design v0.7 · D). */
export const CLIENT_AUTO_TAGS = ['trusted'] as const
export type ClientAutoTag = (typeof CLIENT_AUTO_TAGS)[number]

/**
 * "Müşderiler": the most recently seen first unless `sort` says otherwise. `q` finds a name, or digits anywhere in the
 * number; `tag` (repeated for several) keeps the clients with any of these tags, whatever their case, and `auto` the
 * clients with that automatic tag — one Tag filter, so a client with any of them stays; `upcoming` those with or
 * without a booking ahead. The filters combine. `total` sorts as `recent` for a reader without "See revenue" (they get
 * no totals).
 */
export const clientListQuerySchema = cursorQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  /** A chip; "Ählisi" (all) without one. */
  segment: z.enum(CLIENT_SEGMENTS).optional(),
  tag: z
    .union([tagFilterSchema, z.array(tagFilterSchema).max(CLIENT_TAG_FILTER_MAX)])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  /** The Tag filter's "Automatic" group: the clients with the Trusted mark. */
  auto: z.enum(CLIENT_AUTO_TAGS).optional(),
  upcoming: z.enum(CLIENT_UPCOMING).optional(),
  sort: z.enum(CLIENT_SORTS).optional(),
  /** The sort's own direction without it (`CLIENT_SORT_DIR`). */
  dir: z.enum(SORT_DIRS).optional(),
})
/** How many clients each chip would show under the other filters (`q`, `tag`, `upcoming`): "Ählisi" and the four segments. */
export const clientSegmentCountsSchema = z
  .object({
    all: z.number().int(),
    regular: z.number().int(),
    new: z.number().int(),
    lapsed: z.number().int(),
    flagged: z.number().int(),
  })
  .meta({ id: 'ClientSegmentCounts' })
export type ClientSegmentCounts = z.infer<typeof clientSegmentCountsSchema>
/** The Upcoming booking menu: how many of the clients the other filters (`q`, `segment`, `tag`) leave have one, and don't. */
export const clientUpcomingCountsSchema = z.object({ yes: z.number().int(), no: z.number().int() }).meta({ id: 'ClientUpcomingCounts' })
/** One of the team's tags in the Tag menu: its most used spelling and how many clients hold it under the other filters. */
export const clientTagCountSchema = z.object({ name: z.string(), count: z.number().int() }).meta({ id: 'ClientTagCount' })
export type ClientTagCount = z.infer<typeof clientTagCountSchema>
export const clientListSchema = listOf(clientRowSchema)
  .extend({
    counts: clientSegmentCountsSchema,
    upcoming: clientUpcomingCountsSchema,
    /** Every tag on the clients the reader sees, the most held first; a count can be 0 under the other filters. */
    tags: z.array(clientTagCountSchema),
    /** The Tag menu's "Automatic" group: how many clients hold each of Ýeral's tags under the other filters. */
    auto: z.object({ trusted: z.number().int() }),
    /** The clients the reader sees with no filter at all: "24 of 100 clients". */
    everyone: z.number().int(),
  })
  .meta({ id: 'ClientList' })

/** The new-booking drawer looks a number up from this many of its digits, a name from this many letters. */
export const LOOKUP_MIN_DIGITS = 3
export const LOOKUP_MIN_LETTERS = 2

/** Whether the drawer has typed enough to look up. */
export const lookupReady = (q: { phone?: string; name?: string }): boolean =>
  q.phone ? nationalDigits(q.phone).length >= LOOKUP_MIN_DIGITS : (q.name?.trim().length ?? 0) >= LOOKUP_MIN_LETTERS

/**
 * The new-booking drawer (B-23): up to 3 clients whose number starts with the digits typed, or with a word of their
 * name starting with the letters typed ("Ady boýunça gözle"). A specialist finds their own clients so, and any of the
 * business's by the whole number (its alert notes and phone-only mark matter whoever books it).
 */
export const clientLookupQuerySchema = z
  .object({
    phone: z.string().trim().max(32).optional(),
    name: z.string().trim().min(LOOKUP_MIN_LETTERS).max(80).optional(),
  })
  .refine((q) => !!q.phone !== !!q.name, 'A phone or a name')

export const clientMatchSchema = z
  .object({
    id: idSchema,
    name: z.string().nullable(),
    phone: phoneSchema.nullable(),
    visits: z.number().int(),
    /** null without "See revenue". */
    avgCheck: moneySchema.nullable(),
    phoneOnly: z.boolean(),
    /** The notes "shown when they book" ("Ýazylanda görkez"), newest first. */
    alerts: z.array(z.string()),
    /** The services of their completed visits, the most often first (at most 3): the drawer may pick them. */
    usualServices: z.array(idSchema),
  })
  .meta({ id: 'ClientMatch' })
export type ClientMatch = z.infer<typeof clientMatchSchema>
export const clientLookupSchema = z.object({ items: z.array(clientMatchSchema) }).meta({ id: 'ClientLookup' })

/** One booking on the card: upcoming (requests with their answer time) or in the history. */
export const clientBookingSchema = z.object({
  code: bookingCodeSchema,
  date: ymdSchema,
  start: startMinuteSchema,
  end: minuteSchema,
  /** As people see it now. */
  status: z.enum(BOOKING_STATUSES),
  holdUntil: epochSchema.nullable(),
  items: z.array(teamItemSchema),
  price: priceSchema.nullable(),
})

export const clientNoteSchema = z.object({
  id: idSchema,
  text: z.string(),
  /** "Ýazylanda görkez": shown on the calendar block and the drawers. */
  alert: z.boolean(),
  /** Who wrote it; null once they're gone from the team's rows. */
  by: z.string().nullable(),
  at: epochSchema,
})

/**
 * A report ("Arz et", B-28): one per booking; taken back from the booking within 7 days of `at`, by the owner and
 * administrators any, by a specialist their own (`by.staffId`; the same shape as the calendar booking's `complaint.by`).
 */
export const clientReportSchema = z.object({
  code: bookingCodeSchema,
  date: ymdSchema,
  type: z.enum(COMPLAINT_TYPES),
  text: z.string().nullable(),
  by: complaintBySchema,
  at: epochSchema,
})

/** The card's history: the newest `history` past bookings ("Ýene görkez" asks for more). */
export const clientCardQuerySchema = langQuerySchema.extend({
  history: z.coerce.number().int().min(1).max(200).default(10),
})

export const clientCardSchema = z
  .object({
    id: idSchema,
    name: z.string().nullable(),
    phone: phoneSchema.nullable(),
    /** Linked to a Ýeral account: the number follows the account, read-only here. */
    account: z.boolean(),
    birthday: ymdSchema.nullable(),
    /** "Nireden geldi". */
    source: z.enum(CLIENT_SOURCES).nullable(),
    tags: z.array(z.string()),
    segments: z.array(z.enum(CLIENT_SEGMENTS)),
    /** "Trusted on Ýeral" (design v0.7 · D): the mark only, as on the row. */
    trusted: z.boolean(),
    /** "mart 2024-den bäri": when the business first had them. */
    since: ymdSchema,
    stats: z.object({
      visits: z.number().int(),
      /** "Total": what the completed visits cost; null without "See revenue". */
      total: moneySchema.nullable(),
      /** null without "See revenue", or before a completed visit. */
      avgCheck: moneySchema.nullable(),
      lastVisit: ymdSchema.nullable(),
      noShows: z.number().int(),
    }),
    notes: z.array(clientNoteSchema),
    /** Waiting requests and confirmed visits ahead, the soonest first. */
    upcoming: z.array(clientBookingSchema),
    /** Everything else, the newest first: the newest `history` of `historyCount`. */
    history: z.array(clientBookingSchema),
    historyCount: z.number().int(),
    moreHistory: z.boolean(),
    reports: z.array(clientReportSchema),
    settings: z.object({
      /** "Diňe jaň arkaly ýazylyp biler" as it stands (B-35). */
      phoneOnly: z.boolean(),
      /** The no-show limit switched it on: switching it off starts the count from zero. */
      phoneOnlyByCount: z.boolean(),
      /** "Ýatlatma SMS-lerini iberme". */
      noReminders: z.boolean(),
    }),
  })
  .meta({ id: 'ClientCard' })

// ── Writes (B-33–B-36): the owner and administrators; a note, anyone who sees the client ──

/** "VIP · Child · + Tag": up to 10, 1–20 characters each; the same one twice (in any case) counts once. */
export const clientTagsSchema = z
  .array(z.string().trim().min(1).max(CLIENT_TAG_MAX))
  .transform((tags) => tags.filter((t, i) => tags.findIndex((u) => u.toLowerCase() === t.toLowerCase()) === i))
  .refine((tags) => tags.length <= CLIENT_TAGS_MAX, { message: `Up to ${CLIENT_TAGS_MAX} tags` })

/** "Täze müşderi" (B-33): only the number is needed. A birthday can't be ahead. */
export const clientInputSchema = z
  .object({
    phone: phoneInputSchema,
    name: z.string().trim().min(1).max(NAME_MAX).optional(),
    birthday: ymdSchema.optional(),
    source: z.enum(CLIENT_SOURCES).optional(),
    tags: clientTagsSchema.default([]),
    /** "Note for the team": its first note. */
    note: z.string().trim().min(1).max(TEAM_NOTE_MAX).optional(),
  })
  .strict()
  .meta({ id: 'ClientInput' })

/**
 * The card's edit and switches (B-34, B-35): what's given changes; `null` clears. The number can't change once a Ýeral
 * account holds it (`client_phone_locked`).
 */
export const clientUpdateSchema = z
  .object({
    phone: phoneInputSchema.optional(),
    name: z.string().trim().min(1).max(NAME_MAX).nullable().optional(),
    birthday: ymdSchema.nullable().optional(),
    source: z.enum(CLIENT_SOURCES).nullable().optional(),
    tags: clientTagsSchema.optional(),
    /** "Diňe jaň arkaly ýazylyp biler" (B-35). */
    phoneOnly: z.boolean().optional(),
    /** "Ýatlatma SMS-lerini iberme". */
    noReminders: z.boolean().optional(),
  })
  .strict()
  .meta({ id: 'ClientUpdate' })

/** "Bellik goş": `alert` shows it on the calendar block and the drawers ("Ýazylanda görkez"). */
export const clientNoteInputSchema = z
  .object({ text: z.string().trim().min(1).max(TEAM_NOTE_MAX), alert: z.boolean().default(false) })
  .strict()
  .meta({ id: 'ClientNoteInput' })

export const clientCreatedSchema = z.object({ id: idSchema }).meta({ id: 'ClientCreated' })

export type ClientRow = z.infer<typeof clientRowSchema>
export type ClientCard = z.infer<typeof clientCardSchema>
