/**
 * The business's own bookings (book B-23–B-27; `/w/{slug}/…`): free times as the team books them, a booking entered
 * for a client who calls or walks in, confirmed at once, and moving or cancelling one. A specialist books, moves and
 * cancels only their own (chapter 3).
 */
import { TEAM_CANCEL_REASONS } from '@yeral/domain/model'
import { z } from 'zod'
import { dayStateSchema } from './availability'
import {
  bookingCodeSchema,
  epochSchema,
  idListQuery,
  idSchema,
  minuteSchema,
  phoneInputSchema,
  slugSchema,
  startMinuteSchema,
  uniqueIdsSchema,
  ymdSchema,
} from './common'

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
