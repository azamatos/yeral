/**
 * Building blocks shared by every schema. Conventions (systemPatterns.md): business-local dates `YYYY-MM-DD`, times of
 * day in minutes, instants in epoch ms, money in whole manats. Query strings arrive as text, so query schemas coerce.
 */
import { isBookingCode } from '@yeral/domain/id'
import { BOOKING_TYPES, LOCALES, PRICE_TYPES } from '@yeral/domain/model'
import { isPhone, toE164 } from '@yeral/domain/phone'
import { isYmd } from '@yeral/domain/time'
import { z } from 'zod'

export const ymdSchema = z.string().refine(isYmd, 'Expected a date YYYY-MM-DD').meta({ example: '2026-10-15' })
/** Minutes from midnight, business-local (870 = 14:30). */
export const minuteSchema = z.number().int().min(0).max(1440).meta({ example: 870 })
export const epochSchema = z.number().int().meta({ description: 'Epoch milliseconds' })
/** Whole manats. */
export const manatSchema = z.number().int().min(0)
export const priceSchema = z.object({ type: z.enum(PRICE_TYPES), amount: manatSchema }).meta({ id: 'Price' })
export const localeSchema = z.enum(LOCALES)
export const bookingTypeSchema = z.enum(BOOKING_TYPES)
export const idSchema = z.uuid()
export const slugSchema = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .meta({ example: 'glow-studio' })
export const bookingCodeSchema = z.string().refine(isBookingCode, 'Expected a booking code YR-12345').meta({ example: 'YR-48213' })
/** Any way people type a Turkmen number in; E.164 out (`+99365123456`). */
export const phoneInputSchema = z.string().max(32).refine(isPhone, 'Expected a Turkmen phone number').transform(toE164)
export const phoneSchema = z
  .string()
  .regex(/^\+993\d{8}$/)
  .meta({ example: '+99365901122' })
export const latLngSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
export const photoSchema = z.object({ url: z.string(), alt: z.string() }).meta({ id: 'Photo' })

/** `?lang=` on every endpoint that returns text; Turkmen by default. */
export const langQuerySchema = z.object({ lang: localeSchema.default('tk') })

/** Comma-separated ids in a query string: `services=a,b`. */
export const idListQuery = z
  .string()
  .transform((s) => s.split(',').filter(Boolean))
  .pipe(z.array(idSchema).min(1).max(10))

/** `{ items, total?, cursor? }` — `cursor` is null on the last page. */
export function listOf<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), total: z.number().int().optional(), cursor: z.string().nullable().optional() })
}

export const cursorQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

/** A free time someone can pick: the slot taken banner, decline and expiry alternatives. */
export const timeSlotSchema = z.object({ date: ymdSchema, start: minuteSchema, end: minuteSchema }).meta({ id: 'TimeSlot' })
