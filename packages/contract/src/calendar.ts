/**
 * The business's own bookings (book B-23–B-27; `/w/{slug}/…`): free times as the team books them, a booking entered
 * for a client who calls or walks in, confirmed at once, and moving or cancelling one. A specialist books, moves and
 * cancels only their own (chapter 3).
 */
import { BOOKING_SOURCES, BOOKING_STATUSES, CANCELLED_BY, COMPLAINT_TYPES, TEAM_CANCEL_REASONS } from '@yeral/domain/model'
import { TEAM_NOTE_MAX } from '@yeral/domain/clients'
import { BLOCK_KINDS, BLOCK_REPEATS } from '@yeral/domain/hours'
import { LEVELS } from '@yeral/domain/permissions'
import { z } from 'zod'
import { dayStateSchema } from './availability'
import {
  boolQuery,
  bookingCodeSchema,
  cursorQuerySchema,
  bookingTypeSchema,
  epochSchema,
  idListQuery,
  idSchema,
  langQuerySchema,
  listOf,
  minuteSchema,
  moneySchema,
  phoneInputSchema,
  phoneSchema,
  photoSchema,
  priceSchema,
  slugSchema,
  startMinuteSchema,
  uniqueIdsSchema,
  ymdSchema,
} from './common'
import { teamItemSchema } from './requests'
import { internalStatusSchema } from './settings'

export const freeTimesQuerySchema = z.object({
  /** In the order they run. */
  services: idListQuery,
  /** The specialist; without one, everyone who does all the services ("Islendik" isn't offered: staff choose). */
  staff: idSchema.optional(),
  /** The day whose starts to list ("Başga sene we wagt"); today by default. */
  date: ymdSchema.optional(),
  /**
   * The request (its code) a decline offers times for (B-20): the times are searched as the decline checks its offers,
   * with the request's services (`services` is then theirs) and its specialist first, its own hold counted as free, and
   * none inside the lead time, past the booking window or on a service not booked online; the strip's days past the
   * window are closed. A move or a request no longer open is refused as the decline refuses it.
   */
  offer: bookingCodeSchema.optional(),
})

export const freeTimesSchema = z
  .object({
    /**
     * "Iň ýakyn boş wagtlar": the first 4 free starts in 14 days, never before the step that holds now; each names the
     * specialist a chip books (the first free one in the team's order).
     */
    nearest: z.array(z.object({ date: ymdSchema, start: startMinuteSchema, end: minuteSchema, staffId: idSchema })),
    date: ymdSchema,
    /** The day's free starts, each with the specialists free at it in the team's order. */
    slots: z.array(z.object({ start: startMinuteSchema, end: minuteSchema, staffIds: z.array(idSchema).min(1) })),
    /** 14 days from today: closed days, full ones, and ones with a free start. */
    days: z.array(dayStateSchema),
  })
  .meta({ id: 'FreeTimes' })

/** Where a booking the team enters comes from: a phone call ("Telefon jaňy") or a walk-in ("Gelip ýazyldy"). */
export const TEAM_SOURCES = ['phone', 'walkin'] as const

/**
 * "Ýazyp goý" (B-23, B-25): confirmed at once. The phone finds the business's client or adds a new one with the name
 * (optional); a walk-in is today, from the step that holds now.
 */
export const newBookingSchema = z
  .object({
    source: z.enum(TEAM_SOURCES),
    phone: phoneInputSchema,
    /** A new client's name ("Ady · hökman däl"); a known client keeps theirs. */
    name: z.string().trim().min(1).max(80).optional(),
    /** In the order they run; one specialist does them all. */
    serviceIds: uniqueIdsSchema.min(1).max(10),
    staffId: idSchema,
    date: ymdSchema,
    start: startMinuteSchema,
    /** The team's note; the client never sees it. */
    note: z.string().trim().min(1).max(TEAM_NOTE_MAX).optional(),
    /** "Müşderä SMS bilen habar ber": on for a phone call, off for a walk-in, unless said. */
    notifyClient: z.boolean().optional(),
  })
  .strict()
  .meta({ id: 'NewBooking' })

export const newBookingResultSchema = z
  .object({
    code: bookingCodeSchema,
    /** "Yzyna al" works until then (B-24); the client's SMS goes after it. */
    undoUntil: epochSchema,
  })
  .meta({ id: 'NewBookingResult' })

export const teamBookingParamSchema = z.object({ slug: slugSchema, code: bookingCodeSchema })

/**
 * "Move to another time" or a dragged block (B-26): the new date and start, and another specialist when the block went
 * to their column. A refused move is 409 `cannot_move` with the reason the toast names.
 */
export const moveBookingSchema = z
  .object({
    date: ymdSchema,
    start: startMinuteSchema,
    /** Another specialist, who does every service; omitted, each keeps theirs. */
    staffId: idSchema.optional(),
    /** "Notify the client": on unless said. */
    notifyClient: z.boolean().optional(),
  })
  .strict()
  .meta({ id: 'MoveBooking' })

/** "Cancel booking" (B-27): the reason, "Other reason" in words; the client sees it (or "You cancelled"). */
export const businessCancelSchema = z
  .object({
    reason: z.enum(TEAM_CANCEL_REASONS),
    text: z.string().trim().min(1).max(300).optional(),
  })
  .strict()
  .refine((d) => d.reason !== 'other' || !!d.text, { path: ['text'], message: 'Say the reason in words' })
  .meta({ id: 'BusinessCancel' })

// ── The team's note on a booking (B-16 step 5, slice 4's gap 1) ──

/**
 * The internal note of a saved booking, autosaved from the drawer: the whole text, or null (an empty one) to clear it.
 * Whoever sees the booking in the calendar writes it; the client never sees it.
 */
export const setTeamNoteSchema = z
  .object({ note: z.string().trim().max(TEAM_NOTE_MAX).nullable() })
  .strict()
  .meta({ id: 'SetTeamNote' })

// ── Blocked time (B-18, Q-204) ──

/** Blocked time's from–to go in 5-minute steps, as breaks do. */
const blockMinute = minuteSchema.refine((m) => m % 5 === 0, 'Every 5 minutes')

/**
 * "Wagty ýap": part of a day closed for one person, with why (`kind`: the form's chips Training · Break · Personal, or
 * Other said in words, `reason`), optionally every day or every week (`repeat`, weekly unless said) up to `repeatUntil`
 * (a year at most). The same people who add bookings block time; a specialist only their own. It can't cover a booking
 * (409 `block_over_bookings`).
 */
export const blockInputSchema = z
  .object({
    staffId: idSchema,
    date: ymdSchema,
    start: blockMinute,
    end: blockMinute,
    kind: z.enum(BLOCK_KINDS).optional(),
    reason: z.string().trim().max(40).optional(),
    repeat: z.enum(BLOCK_REPEATS).optional(),
    repeatUntil: ymdSchema.optional(),
  })
  .strict()
  .refine((b) => b.end > b.start, { path: ['end'], message: 'After the start' })
  .meta({ id: 'BlockInput' })

export const blockSchema = z
  .object({
    id: idSchema,
    staffId: idSchema,
    date: ymdSchema,
    start: minuteSchema,
    end: minuteSchema,
    /** Why, as a key the calendar translates; null on blocks made before the chips. */
    kind: z.enum(BLOCK_KINDS).nullable(),
    reason: z.string().nullable(),
    /** The repeat (daily or weekly) it belongs to; null for a one-off. */
    seriesId: idSchema.nullable(),
  })
  .meta({ id: 'Block' })
export type Block = z.infer<typeof blockSchema>

export const blockListSchema = z.object({ items: z.array(blockSchema) })
/** The blocks from–to (inclusive, at most 62 days) the reader may see in the calendar: a specialist their own. */
export const blocksQuerySchema = z
  .object({ from: ymdSchema, to: ymdSchema })
  .refine((q) => q.to >= q.from, { path: ['to'], message: 'Not before from' })
export const blockParamSchema = z.object({ slug: slugSchema, id: idSchema })
/** `series`: this one and the later ones of its repeat. */
export const blockDeleteQuerySchema = z.object({ scope: z.enum(['one', 'series']).default('one') })

// ── An internal status on a booking (B-29, F-133) ──

/** "Içerki ýagdaý" in the drawer of a confirmed booking: one of the enabled statuses, or none. */
export const setInternalStatusSchema = z.object({ statusId: idSchema.nullable() }).strict().meta({ id: 'SetInternalStatus' })

// ── The calendar (B-16, B-17) ──

/** "Senenama": a day or a week from `date`, everyone the reader sees or one person, cancelled bookings on request. */
export const calendarQuerySchema = langQuerySchema.extend({
  date: ymdSchema,
  /** 1 = "Gün" (a day), 7 = "Hepde" (a week). */
  days: z.coerce
    .number()
    .int()
    .refine((d) => d === 1 || d === 7, 'A day or a week')
    .default(1),
  /** "Bir işgär": one person's column. */
  staff: idSchema.optional(),
  /** "Ýatyrylanlary görkez". */
  cancelled: boolQuery.default(false),
})

const stretchSchema = z.object({ start: minuteSchema, end: minuteSchema })

/** One person's day: when they work (their shift inside the business day), their breaks, or why they're off. */
export const calendarDaySchema = z.object({
  date: ymdSchema,
  working: z.object({ open: minuteSchema, close: minuteSchema }).nullable(),
  breaks: z.array(stretchSchema),
  /** "Dynç güni", a personal day off by its name, or the business closed (a special day by its name). */
  off: z.object({ kind: z.enum(['business-closed', 'dayoff', 'exception']), name: z.string().nullable() }).nullable(),
})

/** A column: one bookable person; someone removed with bookings kept stays while those last. */
export const calendarColumnSchema = z.object({
  staffId: idSchema,
  name: z.string(),
  photo: photoSchema.nullable(),
  level: z.enum(LEVELS),
  /** "programmasyz": works without the app. */
  hasApp: z.boolean(),
  removed: z.boolean(),
  days: z.array(calendarDaySchema),
})

const calendarItemSchema = teamItemSchema.extend({
  /** "Hyzmatdan soňky arakesme": not bookable after the item. */
  bufferAfter: z.number().int().min(0),
})

/** Who filed a complaint (B-28): the team member by id (a specialist removes only their own) and name; null once gone. */
export const complaintBySchema = z.object({ staffId: idSchema, name: z.string() }).nullable()

/**
 * A booking block: its status as people see it now, who and what, the team's markers; a waiting move as its ghost.
 * Also one booking on its own (`GET …/bookings/{code}`), for the list's drawer and a notification's "Open".
 */
export const calendarBookingSchema = z
  .object({
    code: bookingCodeSchema,
    type: bookingTypeSchema,
    date: ymdSchema,
    start: startMinuteSchema,
    end: minuteSchema,
    status: z.enum(BOOKING_STATUSES),
    cancelledBy: z.enum(CANCELLED_BY).nullable(),
    source: z.enum(BOOKING_SOURCES),
    /** `id` opens the client card (null once the record is gone). */
    client: z.object({ id: idSchema.nullable(), name: z.string().nullable(), phone: phoneSchema.nullable() }),
    items: z.array(calendarItemSchema),
    price: priceSchema.nullable(),
    /** One of `internalStatuses` (switched on). */
    internalStatusId: idSchema.nullable(),
    /** The client has a note "shown when they book" (a warning icon). */
    alert: z.boolean(),
    clientNote: z.string().nullable(),
    internalNote: z.string().nullable(),
    /** A request's answer time ("18 min"). */
    holdUntil: epochSchema.nullable(),
    /** "Arz et" filed (B-28): what happened, in words for "other", by whom and when (taken back within 7 days). */
    complaint: z.object({ type: z.enum(COMPLAINT_TYPES), text: z.string().nullable(), by: complaintBySchema, at: epochSchema }).nullable(),
    /** The client's move waiting for an answer (B-21): the asked time for the line under the block; its ghost is in `moves`. */
    move: z
      .object({ code: bookingCodeSchema, date: ymdSchema, start: startMinuteSchema, end: minuteSchema, holdUntil: epochSchema.nullable() })
      .nullable(),
  })
  .meta({ id: 'CalendarBooking' })
export type CalendarBooking = z.infer<typeof calendarBookingSchema>

/**
 * A client's move waiting for its answer, as a ghost at the asked time (B-21): in the column and on the day it asks
 * for, whether or not its booking is in view, with the booking's time now ("from Fri, 16 Oct · 10:00").
 */
export const calendarMoveSchema = z
  .object({
    code: bookingCodeSchema,
    of: z.object({ code: bookingCodeSchema, date: ymdSchema, start: startMinuteSchema, end: minuteSchema }),
    date: ymdSchema,
    start: startMinuteSchema,
    end: minuteSchema,
    items: z.array(calendarItemSchema),
    holdUntil: epochSchema.nullable(),
    client: z.object({ name: z.string().nullable(), phone: phoneSchema.nullable() }),
  })
  .meta({ id: 'CalendarMove' })

export const calendarViewSchema = z
  .object({
    from: ymdSchema,
    to: ymdSchema,
    columns: z.array(calendarColumnSchema),
    bookings: z.array(calendarBookingSchema),
    moves: z.array(calendarMoveSchema),
    blocks: z.array(blockSchema),
    /** "Başga ýerde" (book Q-272): the person's time taken in another workspace, with no details. */
    elsewhere: z.array(z.object({ staffId: idSchema, date: ymdSchema, start: minuteSchema, end: minuteSchema })),
    /**
     * Each day's line: "16 ýazylyş · 3 haýyş · Girdeji (meýilleşdirilen): 1 410 TMT". `revenue` only with the right
     * to see it; a specialist's is their own earnings.
     */
    summary: z.array(z.object({ date: ymdSchema, count: z.number().int(), requests: z.number().int(), revenue: moneySchema.nullable() })),
    /** The ones switched on, for the chips and the legend. */
    internalStatuses: z.array(internalStatusSchema),
  })
  .meta({ id: 'CalendarView' })
export type CalendarView = z.infer<typeof calendarViewSchema>

// ── "Arz et" (B-28) ──

/**
 * "Näme boldy?": "Gelmedi" (a no-show: the booking becomes one, which the client sees), "Gijä galdy" (late), "Gödek
 * gylyk" (rude), "Başga" (other, in words). Only the team sees the rest, on the client card.
 */
export const complaintInputSchema = z
  .object({
    type: z.enum(COMPLAINT_TYPES),
    text: z.string().trim().min(1).max(300).optional(),
  })
  .strict()
  .refine((c) => c.type !== 'other' || !!c.text, { path: ['text'], message: 'Say what happened' })
  .meta({ id: 'ComplaintInput' })

// ── "Ýazylyşlar": the bookings list and its export (B-30, B-31) ──

/**
 * The list's tabs besides "Haýyşlar" (the requests, `/requests`): today's, those ahead and before (cancelled ones
 * aside), and the cancelled with who cancelled, a request that ran out unanswered included.
 */
export const BOOKING_TABS = ['today', 'upcoming', 'past', 'cancelled'] as const

/** The filters: search (client, number or booking code), specialist, service, dates. */
export const bookingFiltersSchema = langQuerySchema.extend({
  tab: z.enum(BOOKING_TABS),
  q: z.string().trim().max(80).optional(),
  staff: idSchema.optional(),
  service: idSchema.optional(),
  from: ymdSchema.optional(),
  to: ymdSchema.optional(),
})
export const bookingListQuerySchema = bookingFiltersSchema.extend(cursorQuerySchema.shape)

/** The export: the filters' rows, or the ones ticked (`codes=YR-1,YR-2`, the bulk bar's "Eksport (CSV)"). */
export const bookingExportQuerySchema = bookingFiltersSchema.extend({
  codes: z
    .string()
    .max(6000)
    .transform((s) => [
      ...new Set(
        s
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
      ),
    ])
    .pipe(z.array(bookingCodeSchema).min(1).max(500))
    .optional(),
})

export const bookingRowSchema = z
  .object({
    code: bookingCodeSchema,
    type: bookingTypeSchema,
    date: ymdSchema,
    start: startMinuteSchema,
    end: minuteSchema,
    /** As people see it now. */
    status: z.enum(BOOKING_STATUSES),
    cancelledBy: z.enum(CANCELLED_BY).nullable(),
    source: z.enum(BOOKING_SOURCES),
    /** `isNew`: a first visit in the last 30 days ("New"); `id` opens the client card. */
    client: z.object({ id: idSchema.nullable(), name: z.string().nullable(), phone: phoneSchema.nullable(), isNew: z.boolean() }),
    items: z.array(teamItemSchema),
    price: priceSchema.nullable(),
    /** A request's answer time. */
    holdUntil: epochSchema.nullable(),
    /** "Arz et" filed (B-28). */
    complaint: z.object({ type: z.enum(COMPLAINT_TYPES), at: epochSchema }).nullable(),
  })
  .meta({ id: 'BookingRow' })

/** Today's and those ahead the soonest first; the past and the cancelled the newest first. */
export const bookingListSchema = listOf(bookingRowSchema).meta({ id: 'BookingList' })
