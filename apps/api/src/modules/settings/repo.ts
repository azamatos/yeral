/** The hours' queries (book B-39, B-40): the bookings ahead a change may touch, the saved week. */
import type { BusinessHours } from '@yeral/domain/hours'
import { addDays, today } from '@yeral/domain/time'
import { and, eq, gte, isNull, ne } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, businesses } from '../../db/schema'
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

export async function saveHours(db: Queryable, businessId: string, next: BusinessHours): Promise<void> {
  await db
    .update(businesses)
    .set({ hours: next.hours, exceptions: [...next.exceptions] })
    .where(eq(businesses.id, businessId))
}
