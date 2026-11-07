/** "Something changed" (book F-245, C7-Booking D1): what a client back at a business hasn't seen since their last visit. */
import type { BusinessDetail } from '@yeral/contract/catalog'
import { addressAsShown, effectiveStatus } from '@yeral/domain/lifecycle'
import { isOnlineSource } from '@yeral/domain/model'
import { epochOf } from '@yeral/domain/time'
import { and, eq, or } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings } from '../../db/schema'
import type { BusinessRow } from '../availability/context'

type Changed = NonNullable<BusinessDetail['changedSinceLastVisit']>

/**
 * What changed at the business since the signed-in client's last completed visit there: the address (with the one it
 * moved from, as the page would show it), the week's hours, the phone number. The client's own booking made since a
 * change means they saw it then (the confirmation asked), so each change is told once. Null for a guest, a client
 * with no completed visit here (they never knew the old one), or nothing new.
 */
export async function changedSinceLastVisit(
  db: Queryable,
  b: Pick<BusinessRow, 'id' | 'hideExactAddress' | 'movedAt' | 'movedFrom' | 'hoursChangedAt' | 'phoneChangedAt'>,
  viewer: { id: string; phone: string } | null,
  now: number,
): Promise<Changed | null> {
  // most businesses never changed anything: no read at all
  if (!viewer || !(b.movedAt || b.hoursChangedAt || b.phoneChangedAt)) return null
  const rows = await db
    .select({
      date: bookings.date,
      start: bookings.start,
      end: bookings.end,
      status: bookings.status,
      cancelledBy: bookings.cancelledBy,
      holdUntil: bookings.holdUntil,
      complaintType: bookings.complaintType,
      source: bookings.source,
      userId: bookings.userId,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    // a visit the team entered for this number counts as theirs too
    .where(and(eq(bookings.businessId, b.id), or(eq(bookings.userId, viewer.id), eq(bookings.clientPhone, viewer.phone))))
  let visit: number | null = null
  let booked = 0
  for (const r of rows) {
    const state = { ...r, holdUntil: r.holdUntil?.getTime() ?? null }
    if (effectiveStatus(state, now).status === 'completed') visit = Math.max(visit ?? 0, epochOf(r.date, r.start))
    if (r.userId === viewer.id && isOnlineSource(r.source)) booked = Math.max(booked, r.createdAt.getTime())
  }
  if (visit === null) return null
  const since = Math.max(visit, booked)
  const after = (at: Date | null) => !!at && at.getTime() > since && at.getTime() <= now
  const was = b.movedFrom ? addressAsShown(b.movedFrom, b.hideExactAddress, 'pending') : null
  const changed: Changed = {
    address: after(b.movedAt) ? { was } : null,
    hours: after(b.hoursChangedAt),
    phone: after(b.phoneChangedAt),
  }
  return changed.address || changed.hours || changed.phone ? changed : null
}
