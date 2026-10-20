/**
 * What happens around a change (systemPatterns.md "Data flow", api-endpoint skill "Mirror"): an `events` row so open
 * screens refresh, and SMS to the client through the jobs queue, in the client's language (client spec §6 templates).
 */
import type { EventType } from '@yeral/contract/events'
import { MARKET } from '@yeral/domain/market'
import { localized, type Locale } from '@yeral/domain/model'
import { epochOf, localOf } from '@yeral/domain/time'
import { createFmt, createT } from '@yeral/i18n/fmt'
import { eq } from 'drizzle-orm'
import type { Queryable } from './db/client'
import { cities, events, jobs } from './db/schema'

export async function emit(
  db: Queryable,
  e: { type: EventType; businessId: string | null; bookingId?: string | null; bookingCode?: string | null; userId?: string | null },
): Promise<void> {
  await db.insert(events).values({
    type: e.type,
    businessId: e.businessId,
    bookingId: e.bookingId ?? null,
    bookingCode: e.bookingCode ?? null,
    userId: e.userId ?? null,
  })
}

/** Queue an SMS for `runAt` (the app clock, never the wall clock); `dedupeKey` makes it idempotent. */
export async function queueSms(db: Queryable, sms: { to: string; text: string; runAt: Date; dedupeKey?: string }): Promise<void> {
  await db
    .insert(jobs)
    .values({ kind: 'sms', runAt: sms.runAt, payload: { to: sms.to, text: sms.text }, dedupeKey: sms.dedupeKey ?? null })
    .onConflictDoNothing({ target: jobs.dedupeKey })
}

export interface SmsBooking {
  /** The booking's SMS link (`newBookingLink`): the texts that carry one refuse to go without it. */
  link?: string
  date: string
  start: number
  businessName: string
  address: string
  /** Named after the address (`smsCityOf`). */
  city?: string | null
}

/**
 * The city an SMS names after the address: none in the market's main city, else its name, since a phone has no chosen
 * city to compare with (book Q-107).
 */
export async function smsCityOf(db: Queryable, cityId: string, lang: Locale): Promise<string | null> {
  if (cityId === MARKET.mainCity) return null
  const [row] = await db.select().from(cities).where(eq(cities.id, cityId))
  return row ? localized(row.name, lang) : null
}

/** `reminderEvening`: a reminder moved out of the night to 21:30 the evening before, worded like the day one ("tomorrow"). */
export type BookingSmsKind = 'confirmed' | 'reminderDay' | 'reminder2h' | 'reminderEvening' | 'reviewAsk'

/** The calendar day and clock minute of a business-day time: 01:00 after midnight is the next day's (book Q-105). */
const wallOf = (date: string, start: number) => localOf(epochOf(date, start))
const dayOf = (date: string, start: number) => wallOf(date, start).date

/** The brand name for SMS texts: the `common.brand` message, where the brand lives (systemPatterns, "Configuration, domains and brand"). */
const brandOf = (t: ReturnType<typeof createT>) => t('common.brand')

export function bookingSmsText(lang: Locale, kind: BookingSmsKind, b: SmsBooking): string {
  if ((kind === 'confirmed' || kind === 'reviewAsk') && !b.link) throw new Error(`the ${kind} SMS needs its link`)
  const t = createT(lang)
  const fmt = createFmt(lang)
  const common = {
    brand: brandOf(t),
    business: b.businessName,
    time: fmt.time(wallOf(b.date, b.start).min),
    link: b.link ?? '',
    address: b.city ? fmt.addressIn(b.address, b.city) : b.address,
  }
  switch (kind) {
    case 'confirmed':
      return t('sms.confirmed', { ...common, weekday: fmt.weekday(dayOf(b.date, b.start)), date: fmt.dayMonth(dayOf(b.date, b.start)) })
    case 'reminderDay':
    case 'reminderEvening':
      return t('sms.reminderDay', common)
    case 'reminder2h':
      return t('sms.reminder2h', common)
    case 'reviewAsk':
      return t('sms.reviewAsk', common)
  }
}

/** The expiry SMS with the free times; with none free it asks the client to pick another time (book Q-252). */
export function expiredSmsText(lang: Locale, b: SmsBooking & { link: string }, times: { date: string; start: number }[]): string {
  const fmt = createFmt(lang)
  const t = createT(lang)
  const common = { brand: brandOf(t), business: b.businessName, link: b.link }
  if (!times.length) return t('sms.expiredNoTimes', common)
  const asked = dayOf(b.date, b.start)
  const list = times
    .map((x) => {
      const at = wallOf(x.date, x.start)
      return at.date === asked ? fmt.time(at.min) : `${fmt.shortDate(at.date)} ${fmt.time(at.min)}`
    })
    .join(', ')
  return t('sms.expired', { ...common, times: list })
}

/** A move the business declined or let lapse: the booking keeps its time (book Q-289). `b` is the booking itself. */
export function moveRefusedSmsText(lang: Locale, b: SmsBooking & { link: string }): string {
  const fmt = createFmt(lang)
  const t = createT(lang)
  return t('sms.moveRefused', {
    brand: brandOf(t),
    business: b.businessName,
    date: fmt.dayMonth(dayOf(b.date, b.start)),
    time: fmt.time(wallOf(b.date, b.start).min),
    link: b.link,
  })
}

export function codeSmsText(lang: Locale, code: string): string {
  const t = createT(lang)
  return t('sms.code', { brand: brandOf(t), code })
}
