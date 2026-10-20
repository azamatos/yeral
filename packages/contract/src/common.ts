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
/**
 * Minutes from the midnight that starts the business day, business-local (870 = 14:30). A day may run past midnight
 * (book Q-105), so an end may reach 2880 (1500 = 01:00 the next morning, still the same business day).
 */
export const minuteSchema = z.number().int().min(0).max(2880).meta({ example: 870 })
/** A start: before the business day's last minute (a start after 24:00 belongs to a day open past midnight). */
export const startMinuteSchema = z.number().int().min(0).max(2879).meta({ example: 870 })
export const epochSchema = z.number().int().meta({ description: 'Epoch milliseconds' })
/** Whole units of the market's currency (Turkmenistan: manats). */
export const moneySchema = z.number().int().min(0)
export const priceSchema = z.object({ type: z.enum(PRICE_TYPES), amount: moneySchema }).meta({ id: 'Price' })
/** Any language the code has translations for: what `?lang=` may ask and what responses carry. */
export const localeSchema = z.enum(LOCALES)
/** A language a person can choose or sign in with: only the ones the market offers (`MARKET.languages`). */
export const marketLocaleSchema = z.enum(MARKET.languages)

/**
 * Text written per language (`Localized`): any language the market offers, at least one written (book Q-102).
 * `max` is the length of each language's text.
 */
export function localizedSchema(max: number) {
  return z
    .partialRecord(marketLocaleSchema, z.string().trim().max(max))
    .refine((t) => Object.values(t).some(Boolean), 'Write the text in at least one language')
}
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
/**
 * The city of an address (book Q-107): the client shows it beside the address only when it differs from the city the
 * person chose.
 */
export const cityRefSchema = z.object({ id: slugSchema, name: z.string() }).meta({ id: 'CityRef' })

/** `?lang=` on every endpoint that returns text; the market's main language by default (English for the first launch). */
export const langQuerySchema = z.object({ lang: localeSchema.default(MARKET.defaultLanguage) })

/** A yes or no in a query string: `1`/`0` or `true`/`false`. */
export const boolQuery = z.enum(['1', '0', 'true', 'false']).transform((v) => v === '1' || v === 'true')

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

/** A list's pages: `cursor` is where the next one starts (as the last page gave it). */
export const cursorQuerySchema = z.object({
  cursor: z
    .string()
    .regex(/^\d{1,7}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

/** A free time someone can pick: the slot taken banner, decline and expiry alternatives. */
export const timeSlotSchema = z.object({ date: ymdSchema, start: startMinuteSchema, end: minuteSchema }).meta({ id: 'TimeSlot' })

/** "Indiki boş wagt: ertir 10:00" (appointments); null when nothing is free in the booking window. */
export const nextFreeSchema = z.object({ date: ymdSchema, start: startMinuteSchema }).nullable()
