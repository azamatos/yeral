/**
 * Bookings from the client side: send, list, detail, cancel, move, note, alternatives, review
 * (client spec §4.4–4.8, §6; ADR 0017).
 */
import { MAX_ONLINE_PARTY, MAX_SEATS_PER_BOOKING } from '@yeral/domain/availability'
import { MAX_ALTERNATIVES } from '@yeral/domain/lifecycle'
import { BOOKING_SOURCES, BOOKING_STATUSES, CANCELLED_BY, DECLINE_REASONS } from '@yeral/domain/model'
import { z } from 'zod'
import {
  bookingCodeSchema,
  bookingTypeSchema,
  cursorQuerySchema,
  epochSchema,
  idSchema,
  langQuerySchema,
  latLngSchema,
  listOf,
  minuteSchema,
  phoneSchema,
  photoSchema,
  priceSchema,
  slugSchema,
  timeSlotSchema,
  ymdSchema,
} from './common'

const noteSchema = z.string().trim().max(500)

// ── Send ──

export const createBookingSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('appointment'),
      business: slugSchema,
      serviceIds: z.array(idSchema).min(1).max(10),
      /** null = «Islendik hünärmen». */
      staffId: idSchema.nullable(),
      date: ymdSchema,
      start: minuteSchema,
      note: noteSchema.optional(),
    }),
    z.object({
      type: z.literal('table'),
      business: slugSchema,
      partySize: z.number().int().min(1).max(MAX_ONLINE_PARTY),
      areaId: idSchema,
      date: ymdSchema,
      start: minuteSchema,
      /** Special request chips: "Doglan gün", "Çaga oturgyjy" … */
      requests: z.array(z.string().max(40)).max(5).default([]),
      note: noteSchema.optional(),
    }),
    z.object({
      type: z.literal('class'),
      business: slugSchema,
      sessionId: idSchema,
      seats: z.number().int().min(1).max(MAX_SEATS_PER_BOOKING),
      note: noteSchema.optional(),
    }),
  ])
  .meta({ id: 'CreateBooking' })
export type CreateBooking = z.infer<typeof createBookingSchema>

// ── Read ──

export const bookingStatusSchema = z.enum(BOOKING_STATUSES)

/** What was booked, per type: "Aýal saç kesimi · Aýna", "Stol · 4 adam · Terrasa", "Irden akym · 1 ýer · Aýgözel". */
export const bookingWhatSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('appointment'),
    items: z.array(z.object({ service: z.string(), staff: z.string().nullable(), start: minuteSchema, end: minuteSchema })).min(1),
  }),
  z.object({ type: z.literal('table'), partySize: z.number().int(), area: z.string(), requests: z.array(z.string()) }),
  z.object({ type: z.literal('class'), session: z.string(), trainer: z.string().nullable(), seats: z.number().int() }),
])

export const bookingSummarySchema = z
  .object({
    code: bookingCodeSchema,
    type: bookingTypeSchema,
    business: z.object({ slug: slugSchema, name: z.string(), category: z.string(), photo: photoSchema.nullable(), phone: phoneSchema }),
    what: bookingWhatSchema,
    date: ymdSchema,
    start: minuteSchema,
    end: minuteSchema,
    /** The status people see now (expired requests and finished visits already settled). */
    status: bookingStatusSchema,
    cancelledBy: z.enum(CANCELLED_BY).nullable(),
    price: priceSchema.nullable(),
    source: z.enum(BOOKING_SOURCES),
  })
  .meta({ id: 'BookingSummary' })
export type BookingSummary = z.infer<typeof bookingSummarySchema>

export const TIMELINE_EVENTS = [
  'sent',
  'confirmed',
  'declined',
  'expired',
  'cancelled_by_client',
  'cancelled_by_business',
  'moved',
  'reschedule_requested',
  'completed',
  'noshow',
] as const

export const bookingDetailSchema = bookingSummarySchema
  .extend({
    /** Status timeline: sent → confirmed … */
    timeline: z.array(z.object({ event: z.enum(TIMELINE_EVENTS), at: epochSchema })),
    /** The exact address, unless the business hides it until confirmation. */
    address: z.string(),
    entranceNote: z.string().nullable(),
    geo: latLngSchema.extend({ approximate: z.boolean() }),
    clientNote: z.string().nullable(),
    /** When an unanswered request expires; pending only. */
    holdUntil: epochSchema.nullable(),
    /** Free cancellation and moving end here. */
    cancelDeadline: epochSchema,
    cancelReason: z.string().nullable(),
    decline: z
      .object({
        reason: z.enum(DECLINE_REASONS),
        text: z.string().nullable(),
        /** Accept one in a tap: the new booking is confirmed at once. */
        alternatives: z.array(timeSlotSchema).max(MAX_ALTERNATIVES),
      })
      .nullable(),
    /** Times offered by the system after an expired request (a new request when picked). */
    expiredAlternatives: z.array(timeSlotSchema).max(MAX_ALTERNATIVES),
    /** A pending move of this booking: the original stays confirmed until the business answers. */
    reschedule: z.object({ date: ymdSchema, start: minuteSchema, end: minuteSchema, holdUntil: epochSchema.nullable() }).nullable(),
    actions: z.object({
      cancel: z.boolean(),
      reschedule: z.boolean(),
      editNote: z.boolean(),
      callOnly: z.boolean(),
      review: z.boolean(),
      editReview: z.boolean(),
      bookAgain: z.boolean(),
      /** "Yzyna al" after the client's own cancel, for a short while and only if the time is still free. */
      restore: z.boolean(),
    }),
    review: z
      .object({ rating: z.number().int(), tags: z.array(z.string()), text: z.string().nullable(), createdAt: epochSchema })
      .nullable(),
  })
  .meta({ id: 'BookingDetail' })
export type BookingDetail = z.infer<typeof bookingDetailSchema>

export const myBookingsQuerySchema = langQuerySchema.extend(cursorQuerySchema.shape).extend({ tab: z.enum(['upcoming', 'past']) })
export const bookingListSchema = listOf(bookingSummarySchema)
export const bookingCodeParamSchema = z.object({ code: bookingCodeSchema })

// ── Act ──

export const cancelBookingSchema = z.object({ reason: z.string().trim().max(300).optional() })
export const editNoteSchema = z.object({ note: noteSchema })
export const rescheduleSchema = z.object({ date: ymdSchema, start: minuteSchema, staffId: idSchema.nullable().optional() })
export const acceptAlternativeSchema = z.object({
  index: z
    .number()
    .int()
    .min(0)
    .max(MAX_ALTERNATIVES - 1),
  source: z.enum(['decline', 'expired']),
})

export const reviewInputSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    tags: z.array(z.string().max(40)).max(6).default([]),
    text: z.string().trim().max(500).optional(),
  })
  .meta({ id: 'ReviewInput' })
