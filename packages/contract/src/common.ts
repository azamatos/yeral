/**
 * Building blocks shared by every schema. Conventions (systemPatterns.md): business-local dates `YYYY-MM-DD`, times of
 * day in minutes, instants in epoch ms, money in whole units of the market's currency, phones by the market's rules
 * (`MARKET`, ADR 0023). Query strings arrive as text, so query schemas coerce.
 */
import { isBookingCode } from '@yeral/domain/id'
import { MARKET } from '@yeral/domain/market'
import { BOOKING_TYPES, LOCALES, PRICE_TYPES } from '@yeral/domain/model'
import { E164, isMobile, isPhone, toE164 } from '@yeral/domain/phone'
import { isYmd } from '@yeral/domain/time'
import { z } from 'zod'

export const ymdSchema = z.string().refine(isYmd, 'Expected a date YYYY-MM-DD').meta({ example: '2026-10-15' })
/** Minutes from midnight, business-local (870 = 14:30); 1440 = midnight at the end of the day (a closing time, an end). */
export const minuteSchema = z.number().int().min(0).max(1440).meta({ example: 870 })
/** A start: a time of day, so 23:59 at the latest (a business day ends by midnight, ADR 0017). */
export const startMinuteSchema = z.number().int().min(0).max(1439).meta({ example: 870 })
export const epochSchema = z.number().int().meta({ description: 'Epoch milliseconds' })
/** Whole units of the market's currency (Turkmenistan: manats). */
export const moneySchema = z.number().int().min(0)
export const priceSchema = z.object({ type: z.enum(PRICE_TYPES), amount: moneySchema }).meta({ id: 'Price' })
/** Any language the code has translations for; the sites offer their market's (`MARKET.languages`). */
export const localeSchema = z.enum(LOCALES)
export type { Locale } from '@yeral/domain/model'
export const bookingTypeSchema = z.enum(BOOKING_TYPES)
export const idSchema = z.uuid()
export const slugSchema = z
  .string()
  .max(64)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .meta({ example: 'glow-studio' })
export const bookingCodeSchema = z.string().refine(isBookingCode, 'Expected a booking code YR-12345').meta({ example: 'YR-48213' })
/** Any way people type a number of the market in; E.164 out (`+99365123456`). */
export const phoneInputSchema = z.string().max(32).refine(isPhone, 'Expected a phone number').transform(toE164)
/** A number that can receive an SMS (login codes): mobile only (Turkmenistan: 61–65, 71). */
export const mobileInputSchema = z
  .string()
  .max(32)
  .refine(isPhone, 'Expected a phone number')
  .refine(isMobile, 'Expected a mobile number')
  .transform(toE164)
export const phoneSchema = z.string().regex(E164).meta({ example: '+99365901122' })
export const latLngSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
/** A place on the map; `approximate` for home-based businesses until the booking is confirmed (≈ 1 km circle). */
export const geoSchema = latLngSchema.extend({ approximate: z.boolean() })
export const photoSchema = z.object({ url: z.string(), alt: z.string() }).meta({ id: 'Photo' })

/** `?lang=` on every endpoint that returns text; the market's main language by default (English for the first launch). */
export const langQuerySchema = z.object({ lang: localeSchema.default(MARKET.defaultLanguage) })

/** Comma-separated ids in a query string: `services=a,b`; an id listed twice counts once. */
export const idListQuery = z
  .string()
  .transform((s) => [...new Set(s.split(',').filter(Boolean))])
  .pipe(z.array(idSchema).min(1).max(10))

/** Ids in a request body, each at most once (a service is booked once per booking). */
export const uniqueIdsSchema = z.array(idSchema).refine((ids) => new Set(ids).size === ids.length, 'Each id at most once')

/** `{ items, total?, cursor? }` — `cursor` is null on the last page. */
export function listOf<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), total: z.number().int().optional(), cursor: z.string().nullable().optional() })
}

export const cursorQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

/** A free time someone can pick: the slot taken banner, decline and expiry alternatives. */
export const timeSlotSchema = z.object({ date: ymdSchema, start: startMinuteSchema, end: minuteSchema }).meta({ id: 'TimeSlot' })

/** "Indiki boş wagt: ertir 10:00" (appointments); null when nothing is free in the booking window. */
export const nextFreeSchema = z.object({ date: ymdSchema, start: startMinuteSchema }).nullable()
