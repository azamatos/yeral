/** Booking rows: lookups, the lifecycle view, status changes that keep `active` in step, codes. */
import { bookingCode } from '@yeral/domain/id'
import type { BookingState } from '@yeral/domain/lifecycle'
import type { BookingStatus, CancelledBy } from '@yeral/domain/model'
import { and, eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings } from '../../db/schema'
import { ApiError } from '../../http/errors'

export type BookingRow = typeof bookings.$inferSelect
export type ItemRow = typeof bookingItems.$inferSelect

export const isActiveStatus = (s: BookingStatus) => s === 'pending' || s === 'confirmed'

export function stateOf(b: BookingRow): BookingState {
  return {
    date: b.date,
    start: b.start,
    end: b.end,
    status: b.status,
    cancelledBy: b.cancelledBy,
    holdUntil: b.holdUntil?.getTime() ?? null,
    hasComplaint: !!b.complaintType,
  }
}

/** The signed-in client's booking by code (reschedule requests are reached through the booking they move). */
export async function myBooking(db: Queryable, userId: string, code: string): Promise<BookingRow> {
  const [row] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.code, code), eq(bookings.userId, userId)))
  if (!row) throw new ApiError('not_found')
  return row
}

export async function itemsOf(db: Queryable, bookingId: string): Promise<ItemRow[]> {
  return db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId)).orderBy(bookingItems.sort)
}

/** A fresh code; grows to 6 digits if 5-digit codes keep colliding. */
export async function freshCode(db: Queryable): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = bookingCode(i < 5 ? 5 : 6)
    const [taken] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.code, code))
    if (!taken) return code
  }
  throw new Error('could not find a free booking code')
}

export interface StatusChange {
  status: BookingStatus
  cancelledBy?: CancelledBy | null
  cancelReason?: string | null
  at: Date
}

/** Change a booking's status; items follow (`active` = pending or confirmed). */
export async function setStatus(db: Queryable, b: BookingRow, change: StatusChange): Promise<BookingRow> {
  const active = isActiveStatus(change.status)
  const [row] = await db
    .update(bookings)
    .set({
      status: change.status,
      active,
      cancelledBy: change.status === 'cancelled' ? (change.cancelledBy ?? null) : null,
      cancelReason: change.status === 'cancelled' ? (change.cancelReason ?? null) : b.cancelReason,
      cancelledAt: change.status === 'cancelled' ? change.at : null,
      confirmedAt: change.status === 'confirmed' && !b.confirmedAt ? change.at : b.confirmedAt,
      completedAt: change.status === 'completed' || change.status === 'noshow' ? change.at : b.completedAt,
      // kept after a cancel so "Yzyna al" can bring a request back with its remaining hold
      holdUntil: change.status === 'confirmed' || change.status === 'completed' ? null : b.holdUntil,
      updatedAt: change.at,
    })
    .where(eq(bookings.id, b.id))
    .returning()
  await db.update(bookingItems).set({ active }).where(eq(bookingItems.bookingId, b.id))
  if (!row) throw new ApiError('not_found')
  return row
}

/** Postgres refused an overlap (exclusion constraint) or a duplicate: the slot went meanwhile. */
export function isSlotConflict(e: unknown): boolean {
  const code = (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code
  return code === '23P01'
}
