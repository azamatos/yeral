/**
 * SMS links to a booking (book Q-168, F-068): `yeral.app/l/{token}`, a long random token stored hashed, one per SMS,
 * valid for `LINK_DAYS`. The link page reads the booking with it signed out, and signs in only with the booking's own
 * phone.
 */
import type { SiteConfig } from '@yeral/lib/site'
import { and, eq, gt } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingLinks, bookings } from '../../db/schema'
import { ApiError } from '../../http/errors'
import { randomToken, sha256Hex } from '../../lib/crypto'
import type { BookingRow } from './repo'

/** How long an SMS link works: past the visit, so a finished booking still opens (book Q-170). */
export const LINK_DAYS = 90

/** A new link to this booking for one SMS: `yeral.app/l/…`, without the protocol, as SMS texts show it. */
export async function newBookingLink(db: Queryable, site: SiteConfig, bookingId: string, now: number): Promise<string> {
  const token = randomToken()
  await db.insert(bookingLinks).values({ tokenHash: await sha256Hex(token), bookingId, expiresAt: new Date(now + LINK_DAYS * 86_400_000) })
  return `${site.urls.client.replace(/^https?:\/\//, '')}/l/${token}`
}

/** The booking a link opens; an unknown or expired link is `not_found` ("Bu salgy işlemeýär"). */
export async function bookingOfLink(db: Queryable, token: string, now: number): Promise<BookingRow> {
  const [row] = await db
    .select({ booking: bookings })
    .from(bookingLinks)
    .innerJoin(bookings, eq(bookings.id, bookingLinks.bookingId))
    .where(and(eq(bookingLinks.tokenHash, await sha256Hex(token)), gt(bookingLinks.expiresAt, new Date(now))))
  if (!row?.booking.clientPhone) throw new ApiError('not_found')
  return row.booking
}
