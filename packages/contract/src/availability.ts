/**
 * Free times for the booking flows (client spec §4.4–4.6). The api computes them with `@yeral/domain/availability`.
 */
import { z } from 'zod'
import {
  bookingCodeSchema,
  epochSchema,
  idListQuery,
  idSchema,
  langQuerySchema,
  moneySchema,
  minuteSchema,
  nextFreeSchema,
  startMinuteSchema,
  ymdSchema,
} from './common'

/** The date strip: 14 days, today first; closed days disabled, full days still selectable ("Bu gün boş wagt ýok"). */
export const dayStateSchema = z
  .object({
    date: ymdSchema,
    state: z.enum(['open', 'full', 'closed']),
    /** Special day name when closed for one ("Baýramçylyk"). */
    closedReason: z.string().nullable(),
  })
  .meta({ id: 'DayState' })

// ── Appointment ──

/** `services` may be left out only in move mode (`move`): the booking's own services then. */
const servicesOrMove = { message: 'services or move', path: ['services'] }
const hasServicesOrMove = (q: { services?: string[]; move?: string }) => !!q.services || !!q.move

export const appointmentAvailabilityQuerySchema = langQuerySchema
  .extend({
    /** The services in order; in move mode left out, the booking's own services as booked, in their order. */
    services: idListQuery.optional(),
    /**
     * A specialist id, or `any` for «Islendik hünärmen» (the default). In move mode left out, the booking's own
     * specialist, as the reschedule reads a `staffId` left out (one who no longer does the services: 404 `not_found`
     * with `staffId`, never a swap; ask for `any` or name another).
     */
    staff: z.union([z.literal('any'), idSchema]).optional(),
    date: ymdSchema.optional(),
    days: z.coerce.number().int().min(1).max(31).default(14),
    /**
     * Move mode (book Q-165, C-30): the signed-in client's confirmed appointment being moved; its own time and a move
     * already waiting don't count as busy, so a new time may overlap them with the same specialist. A booking that
     * can't move online any more answers 409 `not_bookable`: a service of it gone from the business's menu (deleted,
     * archived or no longer booked online), as the reschedule would.
     */
    move: bookingCodeSchema.optional(),
  })
  .refine(hasServicesOrMove, servicesOrMove)

export const appointmentAvailabilitySchema = z
  .object({
    date: ymdSchema,
    slots: z.array(z.object({ start: startMinuteSchema, end: minuteSchema })),
    days: z.array(dayStateSchema),
    /** "Indiki boş gün: Anna, 16 oktýabr" when the chosen day is full or closed. */
    nextFree: nextFreeSchema,
  })
  .meta({ id: 'AppointmentAvailability' })

/** Step 2: "Indiki boş wagt: ertir 10:00" per specialist and for «Islendik hünärmen». */
export const specialistsAvailabilityQuerySchema = langQuerySchema
  .extend({
    /** In move mode left out, the booking's own services. */
    services: idListQuery.optional(),
    /** Move mode, as in the appointment availability (a booking that can't move online: 409 `not_bookable`). */
    move: bookingCodeSchema.optional(),
  })
  .refine(hasServicesOrMove, servicesOrMove)
export const specialistsAvailabilitySchema = z
  .object({
    any: nextFreeSchema,
    items: z.array(z.object({ staffId: idSchema, next: nextFreeSchema })),
  })
  .meta({ id: 'SpecialistsAvailability' })

// ── Table ──

export const tableAvailabilityQuerySchema = langQuerySchema.extend({
  /** Above MAX_ONLINE_PARTY the api answers `party_too_large` ("9+": book by phone). */
  party: z.coerce.number().int().min(1),
  date: ymdSchema.optional(),
  days: z.coerce.number().int().min(1).max(31).default(14),
})

export const tableAvailabilitySchema = z
  .object({
    date: ymdSchema,
    slots: z.array(z.object({ start: startMinuteSchema, areaIds: z.array(idSchema).min(1) })),
    days: z.array(dayStateSchema),
    nextFree: nextFreeSchema,
  })
  .meta({ id: 'TableAvailability' })

// ── Class ──

export const classSessionSchema = z
  .object({
    id: idSchema,
    date: ymdSchema,
    start: startMinuteSchema,
    durationMin: z.number().int(),
    name: z.string(),
    trainer: z.object({ id: idSchema, name: z.string() }).nullable(),
    /** "Başlangyç", "Orta", "Ähli derejeler". */
    level: z.string().nullable(),
    price: moneySchema,
    capacity: z.number().int(),
    seatsLeft: z.number().int().min(0),
    /** How many seats the stepper allows now; 0 = full ("Doly"). */
    maxSeats: z.number().int().min(0),
    /** Free cancellation ends here (class spec: "Mugt ýatyrmak wagty geçdi" once past). */
    cancelDeadline: epochSchema,
  })
  .meta({ id: 'ClassSession' })

export const sessionsQuerySchema = langQuerySchema.extend({
  from: ymdSchema.optional(),
  days: z.coerce.number().int().min(1).max(14).default(7),
})
export const sessionListSchema = z.object({ items: z.array(classSessionSchema) })
