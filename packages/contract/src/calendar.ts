/**
 * The business's own bookings (book B-23–B-27; `/w/{slug}/…`): free times as the team books them, a booking entered
 * for a client who calls or walks in, confirmed at once, and moving or cancelling one. A specialist books, moves and
 * cancels only their own (chapter 3).
 */
import { BOOKING_SOURCES, BOOKING_STATUSES, CANCELLED_BY, TEAM_CANCEL_REASONS } from '@yeral/domain/model'
import { LEVELS } from '@yeral/domain/permissions'
import { z } from 'zod'
import { dayStateSchema } from './availability'
import {
  boolQuery,
  bookingCodeSchema,
  bookingTypeSchema,
  epochSchema,
  idListQuery,
  idSchema,
  langQuerySchema,
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
    note: z.string().trim().min(1).max(500).optional(),
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

// ── Blocked time (B-18, Q-204) ──

/** Blocked time's from–to go in 5-minute steps, as breaks do. */
const blockMinute = minuteSchema.refine((m) => m % 5 === 0, 'Every 5 minutes')

/**
 * "Wagty ýap": part of a day closed for one person, with a reason ("Okuw"), optionally every week on that weekday up to
 * `repeatUntil` (a year at most). The same people who add bookings block time; a specialist only their own. It can't
 * cover a booking (409 `block_over_bookings`).
 */
export const blockInputSchema = z
  .object({
    staffId: idSchema,
    date: ymdSchema,
    start: blockMinute,
    end: blockMinute,
    reason: z.string().trim().max(40).optional(),
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
    reason: z.string().nullable(),
    /** The weekly repeat it belongs to; null for a one-off. */
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
/** `series`: this one and the later ones of its weekly repeat. */
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

/** A booking block: its status as people see it now, who and what, the team's markers; a waiting move as its ghost. */
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
    client: z.object({ name: z.string().nullable(), phone: phoneSchema.nullable() }),
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
    /** The client's move waiting for an answer (B-21): drawn at the asked time. */
    move: z
      .object({
        code: bookingCodeSchema,
        date: ymdSchema,
        start: startMinuteSchema,
        end: minuteSchema,
        items: z.array(calendarItemSchema),
        holdUntil: epochSchema.nullable(),
      })
      .nullable(),
  })
  .meta({ id: 'CalendarBooking' })

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
