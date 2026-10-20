/**
 * SMS links to a booking (book Q-168, F-068): `yeral.app/l/{token}`, a long random token stored hashed, one per SMS,
 * valid for `LINK_DAYS`. The link page reads the booking with it signed out, and signs in only with the booking's own
 * phone.
 */
import { epochOf } from '@yeral/domain/time'
import type { SiteConfig } from '@yeral/lib/site'
import { and, eq, gt, lt, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingLinks, bookings, users } from '../../db/schema'
import { ApiError } from '../../http/errors'
import { randomToken, sha256Hex } from '../../lib/crypto'
import type { BookingRow } from './repo'

/** How long an SMS link works after the visit (or after it's sent, if later): a finished booking still opens (book Q-170). */
export const LINK_DAYS = 90

/**
 * A new link to this booking for one SMS: `yeral.app/l/…`, without the protocol, as SMS texts show it. 16 random bytes
 * (22 characters) keep the SMS short and can't be guessed. The raw token is never stored: only the SMS carries it.
 */
export async function newBookingLink(
  db: Queryable,
  site: SiteConfig,
  booking: Pick<BookingRow, 'id' | 'date' | 'end'>,
  sentTo: string,
  now: number,
): Promise<{ url: string; tokenHash: string }> {
  const token = randomToken(16)
  const tokenHash = await sha256Hex(token)
  const from = Math.max(now, epochOf(booking.date, booking.end))
  await db.insert(bookingLinks).values({ tokenHash, bookingId: booking.id, sentTo, expiresAt: new Date(from + LINK_DAYS * 86_400_000) })
  return { url: `${site.urls.client.replace(/^https?:\/\//, '')}/l/${token}`, tokenHash }
}

/**
 * The phone a booking's SMS go to: its account's phone now, else the phone it was booked with; none once the person
 * deleted their account or the business removed the client. Links are checked against it when opened.
 */
export async function bookingRecipient(
  db: Queryable,
  b: Pick<BookingRow, 'userId' | 'clientPhone' | 'accountDeletedAt'>,
): Promise<string | null> {
  if (!b.clientPhone || b.accountDeletedAt) return null
  const [user] = b.userId ? await db.select({ phone: users.phone }).from(users).where(eq(users.id, b.userId)) : []
  return user?.phone ?? b.clientPhone
}

/** A booking moved: its links work until 90 days after the new visit too. */
export async function extendBookingLinks(db: Queryable, booking: Pick<BookingRow, 'id' | 'date' | 'end'>): Promise<void> {
  const until = new Date(epochOf(booking.date, booking.end) + LINK_DAYS * 86_400_000)
  await db
    .update(bookingLinks)
    .set({ expiresAt: sql`greatest(${bookingLinks.expiresAt}, ${until.toISOString()}::timestamptz)` })
    .where(eq(bookingLinks.bookingId, booking.id))
}

/** Links past their time are gone (the jobs, every minute). */
export async function pruneBookingLinks(db: Queryable, now: number): Promise<void> {
  await db.delete(bookingLinks).where(lt(bookingLinks.expiresAt, new Date(now)))
}

/** The booking a link opens; an unknown or expired link is `not_found` ("Bu salgy işlemeýär"). */
export async function bookingOfLink(db: Queryable, token: string, now: number): Promise<BookingRow & { phone: string }> {
  const [row] = await db
    .select({ booking: bookings, sentTo: bookingLinks.sentTo })
    .from(bookingLinks)
    .innerJoin(bookings, eq(bookings.id, bookingLinks.bookingId))
    .where(and(eq(bookingLinks.tokenHash, await sha256Hex(token)), gt(bookingLinks.expiresAt, new Date(now))))
  // a link works only while it went to the booking's phone now: not after a phone change, an account deletion or the
  // client's removal, whatever a late job sent
  const phone = row ? await bookingRecipient(db, row.booking) : null
  if (!row || !phone || phone !== row.sentTo) throw new ApiError('not_found')
  return { ...row.booking, phone }
}
