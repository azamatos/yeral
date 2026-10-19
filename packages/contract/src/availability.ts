/**
 * Free times for the booking flows (client spec §4.4–4.6). The api computes them with `@yeral/domain/availability`.
 */
import { z } from 'zod'
import {
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

export const appointmentAvailabilityQuerySchema = langQuerySchema.extend({
  services: idListQuery,
  /** A specialist id, or `any` for «Islendik hünärmen». */
  staff: z.union([z.literal('any'), idSchema]).default('any'),
  date: ymdSchema.optional(),
  days: z.coerce.number().int().min(1).max(31).default(14),
})

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
export const specialistsAvailabilityQuerySchema = langQuerySchema.extend({ services: idListQuery })
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
