/**
 * What happens around a change (systemPatterns.md "Data flow", api-endpoint skill "Mirror"): an `events` row so open
 * screens refresh, and SMS to the client through the jobs queue, in the client's language (client spec §6 templates).
 */
import type { EventType } from '@yeral/contract/events'
import type { Locale } from '@yeral/domain/model'
import { createFmt, createT } from '@yeral/i18n/fmt'
import type { SiteConfig } from '@yeral/lib/site'
import type { Queryable } from './db/client'
import { events, jobs } from './db/schema'

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

/** `yeral.app/b/YR-48213`: the design's SMS link; the client site sends booking codes to the booking detail (ADR 0015). */
export function bookingLink(site: SiteConfig, code: string): string {
  return `${site.urls.client.replace(/^https?:\/\//, '')}/b/${code}`
}

export interface SmsBooking {
  code: string
  date: string
  start: number
  businessName: string
  address: string
}

/** `reminderEvening`: a reminder moved out of the night to 21:30 the evening before, worded like the day one ("tomorrow"). */
export type BookingSmsKind = 'confirmed' | 'reminderDay' | 'reminder2h' | 'reminderEvening' | 'reviewAsk'

/** The brand name for SMS texts: the `common.brand` message, where the brand lives (systemPatterns, "Configuration, domains and brand"). */
const brandOf = (t: ReturnType<typeof createT>) => t('common.brand')

export function bookingSmsText(site: SiteConfig, lang: Locale, kind: BookingSmsKind, b: SmsBooking): string {
  const t = createT(lang)
  const fmt = createFmt(lang)
  const common = {
    brand: brandOf(t),
    business: b.businessName,
    time: fmt.time(b.start),
    link: bookingLink(site, b.code),
    address: b.address,
  }
  switch (kind) {
    case 'confirmed':
      return t('sms.confirmed', { ...common, weekday: fmt.weekday(b.date), date: fmt.dayMonth(b.date) })
    case 'reminderDay':
    case 'reminderEvening':
      return t('sms.reminderDay', common)
    case 'reminder2h':
      return t('sms.reminder2h', common)
    case 'reviewAsk':
      return t('sms.reviewAsk', common)
  }
}

export function expiredSmsText(site: SiteConfig, lang: Locale, b: SmsBooking, times: { date: string; start: number }[]): string {
  const fmt = createFmt(lang)
  const list = times.map((x) => (x.date === b.date ? fmt.time(x.start) : `${fmt.shortDate(x.date)} ${fmt.time(x.start)}`)).join(', ')
  const t = createT(lang)
  return t('sms.expired', { brand: brandOf(t), business: b.businessName, times: list, link: bookingLink(site, b.code) })
}

export function codeSmsText(lang: Locale, code: string): string {
  const t = createT(lang)
  return t('sms.code', { brand: brandOf(t), code })
}
