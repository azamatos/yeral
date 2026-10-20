/**
 * What happens around a change (systemPatterns.md "Data flow", api-endpoint skill "Mirror"): an `events` row so open
 * screens refresh, and SMS to the client through the jobs queue, in the client's language (client spec §6 templates).
 */
import type { EventType } from '@yeral/contract/events'
import { MARKET } from '@yeral/domain/market'
import { localized, type BusinessCancelReason, type DeclineReason, type Locale } from '@yeral/domain/model'
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
  /** A business's cancel: the reason as the client reads it (`businessCancelText`). */
  reason?: string
  /** Who does it now (`bookedWith`, `movedWith`, `staffChanged`). */
  staff?: string
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

/**
 * `booked`: a booking the team entered for a client who called (book B-23, Q-288), with the address; `bookedWith`
 * names who does it, when that changed after the call. `moved`: the
 * business moved it (B-26), `movedWith` to another specialist too; `staffChanged`: it gave it to another specialist at the
 * same time. `cancelled`: the business cancelled it, with the reason; `cancelledAsAsked`: the team
 * entered the client's own cancel ("The client called to cancel", B-27). `reminderEvening`: a reminder moved out of
 * the night to 21:30 the evening before, worded like the day one ("tomorrow").
 */
export type BookingSmsKind =
  | 'confirmed'
  | 'booked'
  | 'bookedWith'
  | 'moved'
  | 'movedWith'
  | 'staffChanged'
  | 'cancelled'
  | 'cancelledAsAsked'
  | 'reminderDay'
  | 'reminder2h'
  | 'reminderEvening'

/** The booking SMS that carry the booking's link (book Q-168); reminders don't. */
export const LINKED_SMS: ReadonlySet<BookingSmsKind> = new Set([
  'confirmed',
  'booked',
  'bookedWith',
  'moved',
  'movedWith',
  'staffChanged',
  'cancelled',
  'cancelledAsAsked',
])

/** The calendar day and clock minute of a business-day time: 01:00 after midnight is the next day's (book Q-105). */
const wallOf = (date: string, start: number) => localOf(epochOf(date, start))
const dayOf = (date: string, start: number) => wallOf(date, start).date

/** The brand name for SMS texts: the `common.brand` message, where the brand lives (systemPatterns, "Configuration, domains and brand"). */
const brandOf = (t: ReturnType<typeof createT>) => t('common.brand')

export function bookingSmsText(lang: Locale, kind: BookingSmsKind, b: SmsBooking): string {
  if (LINKED_SMS.has(kind) && !b.link) throw new Error(`the ${kind} SMS needs its link`)
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
    case 'booked':
    case 'bookedWith':
    case 'moved':
      return t(`sms.${kind}`, {
        ...common,
        weekday: fmt.weekday(dayOf(b.date, b.start)),
        date: fmt.dayMonth(dayOf(b.date, b.start)),
        staff: b.staff ?? '',
      })
    case 'cancelled':
      return t('sms.cancelled', { ...common, date: fmt.dayMonth(dayOf(b.date, b.start)), reason: b.reason ?? '' })
    case 'cancelledAsAsked':
      return t('sms.cancelledAsAsked', { ...common, date: fmt.dayMonth(dayOf(b.date, b.start)) })
    case 'movedWith':
    case 'staffChanged':
      return t(`sms.${kind}`, {
        ...common,
        weekday: fmt.weekday(dayOf(b.date, b.start)),
        date: fmt.dayMonth(dayOf(b.date, b.start)),
        staff: b.staff ?? '',
      })
    case 'reminderDay':
    case 'reminderEvening':
      return t('sms.reminderDay', common)
    case 'reminder2h':
      return t('sms.reminder2h', common)
  }
}

/**
 * The expiry SMS with the free times; with none free it asks the client to pick another time (book Q-252); for a
 * client who can't book this business online now, to call (Q-154).
 */
export function expiredSmsText(
  lang: Locale,
  b: SmsBooking & { link: string },
  times: { date: string; start: number }[],
  opts: { byPhone?: boolean } = {},
): string {
  const fmt = createFmt(lang)
  const t = createT(lang)
  const common = { brand: brandOf(t), business: b.businessName, link: b.link }
  if (opts.byPhone) return t('sms.expiredCall', common)
  if (!times.length) return t('sms.expiredNoTimes', common)
  return t('sms.expired', { ...common, times: timesText(fmt, b, times) })
}

/** Offered times as an SMS lists them: the booking's own day by time, another day with a short date (`16 okt. 10:00`). */
function timesText(fmt: ReturnType<typeof createFmt>, b: Pick<SmsBooking, 'date' | 'start'>, times: { date: string; start: number }[]) {
  const asked = dayOf(b.date, b.start)
  return times
    .map((x) => {
      const at = wallOf(x.date, x.start)
      return at.date === asked ? fmt.time(at.min) : `${fmt.shortDate(at.date)} ${fmt.time(at.min)}`
    })
    .join(', ')
}

/**
 * A business's cancel reason as the client reads it: its label, or the business's words ("Other reason", B-27), or the
 * special day's name it closed for (B-40).
 */
export function businessCancelText(lang: Locale, reason: BusinessCancelReason, text: string | null): string {
  return (reason === 'other' || reason === 'closed') && text ? text : createT(lang)(`businessCancelReasons.${reason}`)
}

/**
 * The business closed over the booking (a special day, new hours; B-39, B-40): the reason and up to 3 free times, as an
 * expiry lists them; none free, pick another time; a client who can't book it online now, call (Q-154).
 */
export function cancelledOffersSmsText(
  lang: Locale,
  b: SmsBooking & { link: string },
  reason: string,
  times: { date: string; start: number }[],
  opts: { byPhone?: boolean } = {},
): string {
  const fmt = createFmt(lang)
  const t = createT(lang)
  const common = {
    brand: brandOf(t),
    business: b.businessName,
    date: fmt.dayMonth(dayOf(b.date, b.start)),
    time: fmt.time(wallOf(b.date, b.start).min),
    reason,
    link: b.link,
  }
  if (opts.byPhone) return t('sms.cancelledOffersCall', common)
  if (!times.length) return t('sms.cancelledOffersNoTimes', common)
  return t('sms.cancelledOffers', { ...common, times: timesText(fmt, b, times) })
}

/** The reason the business gave, as the client reads it: its label, or "other" in the business's words. */
const reasonOf = (t: ReturnType<typeof createT>, reason: DeclineReason, text: string | null) =>
  reason === 'other' && text ? text : t(`declineReasons.${reason}`)

/**
 * A request the business declined, with the reason it gave and the link to the offered times (B-20); a client who can't
 * book it online now, with no times offered, is asked to call (Q-154).
 */
export function declinedSmsText(
  lang: Locale,
  b: SmsBooking & { link: string },
  reason: DeclineReason,
  text: string | null,
  opts: { byPhone?: boolean } = {},
): string {
  const fmt = createFmt(lang)
  const t = createT(lang)
  return t(opts.byPhone ? 'sms.declinedCall' : 'sms.declined', {
    brand: brandOf(t),
    business: b.businessName,
    date: fmt.dayMonth(dayOf(b.date, b.start)),
    time: fmt.time(wallOf(b.date, b.start).min),
    reason: reasonOf(t, reason, text),
    link: b.link,
  })
}

/**
 * A move the business declined, with its reason (B-21), or let lapse: the booking keeps its time (book Q-289). `b` is
 * the booking itself.
 */
export function moveRefusedSmsText(
  lang: Locale,
  b: SmsBooking & { link: string },
  declined?: { reason: DeclineReason; text: string | null },
): string {
  const fmt = createFmt(lang)
  const t = createT(lang)
  return t(declined ? 'sms.moveDeclined' : 'sms.moveRefused', {
    brand: brandOf(t),
    business: b.businessName,
    date: fmt.dayMonth(dayOf(b.date, b.start)),
    time: fmt.time(wallOf(b.date, b.start).min),
    reason: declined ? reasonOf(t, declined.reason, declined.text) : '',
    link: b.link,
  })
}

/**
 * The SMS about an outcome the client didn't choose; they always go (book Q-286, Q-289). `cancelledOffers`: the
 * business closed over the booking and offers 3 times (B-39, B-40), which carry the times as a decline does.
 */
export type OutcomeSmsKind = 'expired' | 'moveRefused' | 'declined' | 'cancelledOffers'
/** The business's cancel (B-27): queued like an outcome, but the client's confirmations switch decides (Q-286). */
export type CancelSmsKind = 'cancelled' | 'cancelledAsAsked'

/**
 * Queue an SMS about what happened to `booking` (an outcome, a business's cancel) for the jobs to send. The text and its
 * link are made when it's sent, so no stored row holds a working link; `causeId` (the request that ran out or was
 * declined, the booking cancelled) sends it once.
 */
export async function queueOutcomeSms(
  db: Queryable,
  kind: OutcomeSmsKind | CancelSmsKind,
  booking: { id: string; date: string; start: number },
  causeId: string,
  at: Date,
): Promise<void> {
  await db
    .insert(jobs)
    .values({
      kind: 'booking.sms',
      runAt: at,
      payload: { bookingId: booking.id, kind, date: booking.date, start: booking.start },
      dedupeKey: `${kind}:${causeId}`,
    })
    .onConflictDoNothing({ target: jobs.dedupeKey })
}

export function codeSmsText(lang: Locale, code: string): string {
  const t = createT(lang)
  return t('sms.code', { brand: brandOf(t), code })
}
