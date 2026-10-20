/** The hours' queries (book B-39, B-40): the bookings ahead a change may touch, their items, the saved week. */
import type { BusinessHours } from '@yeral/domain/hours'
import { addDays, today } from '@yeral/domain/time'
import { and, asc, eq, gte, inArray, isNull, ne } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, businesses } from '../../db/schema'
import type { BookingRow } from '../bookings/repo'

/** The business's active appointments and tables from yesterday's business day on (it may run past midnight, book Q-105). */
export async function bookingsAhead(db: Queryable, businessId: string, now: number): Promise<BookingRow[]> {
  return db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.businessId, businessId),
        eq(bookings.active, true),
        ne(bookings.type, 'class'),
        // a waiting move is answered on its own
        isNull(bookings.rescheduleOf),
        gte(bookings.date, addDays(today(now), -1)),
      ),
    )
}

/** These bookings' items with who does them, in each booking's order. */
export async function staffOnBookings(db: Queryable, bookingIds: readonly string[]) {
  if (!bookingIds.length) return []
  return db
    .select({ bookingId: bookingItems.bookingId, staffId: bookingItems.staffId, staffName: bookingItems.staffName })
    .from(bookingItems)
    .where(inArray(bookingItems.bookingId, [...bookingIds]))
    .orderBy(asc(bookingItems.sort))
}

export async function saveHours(db: Queryable, businessId: string, next: BusinessHours): Promise<void> {
  await db
    .update(businesses)
    .set({ hours: next.hours, exceptions: [...next.exceptions] })
    .where(eq(businesses.id, businessId))
}
