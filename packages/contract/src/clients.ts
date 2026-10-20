/**
 * A business's clients as the team keeps them (book B-32, B-34; `/w/{slug}/clients…`): the list with its chips, the
 * new-booking drawer's lookup by phone or name, the client card. A specialist sees only clients with a booking with
 * them, and of each only those bookings; sums ("Total", "Average check") only with "See revenue" (the owner).
 */
import { CLIENT_SEGMENTS } from '@yeral/domain/clients'
import { BOOKING_STATUSES, CLIENT_SOURCES, COMPLAINT_TYPES } from '@yeral/domain/model'
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

/**
 * The new-booking drawer (B-23): up to 3 clients whose number starts with the digits typed (from 3), or whose name has
 * the letters typed ("Ady boýunça gözle", from 2).
 */
export const clientLookupQuerySchema = z
  .object({
    phone: z.string().trim().max(32).optional(),
    name: z.string().trim().min(2).max(80).optional(),
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

export type ClientRow = z.infer<typeof clientRowSchema>
export type ClientCard = z.infer<typeof clientCardSchema>
