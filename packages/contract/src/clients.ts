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

/** "Müşderiler": the most recently seen first. `q` finds a name, or digits anywhere in the number. */
export const clientListQuerySchema = cursorQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  /** A chip; "Ählisi" (all) without one. */
  segment: z.enum(CLIENT_SEGMENTS).optional(),
})
export const clientListSchema = listOf(clientRowSchema).meta({ id: 'ClientList' })

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

/** A report ("Arz et", B-28): one per booking; taken back from the booking within 7 days of `at`. */
export const clientReportSchema = z.object({
  code: bookingCodeSchema,
  date: ymdSchema,
  type: z.enum(COMPLAINT_TYPES),
  text: z.string().nullable(),
  by: z.string().nullable(),
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
    /** "mart 2024-den bäri": when the business first had them. */
    since: ymdSchema,
    stats: z.object({
      visits: z.number().int(),
      /** null without "See revenue", or before a completed visit. */
      avgCheck: moneySchema.nullable(),
      lastVisit: ymdSchema.nullable(),
      noShows: z.number().int(),
    }),
    notes: z.array(clientNoteSchema),
    /** Waiting requests and confirmed visits ahead, the soonest first. */
    upcoming: z.array(clientBookingSchema),
    /** Everything else, the newest first. */
    history: z.array(clientBookingSchema),
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
