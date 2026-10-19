/** Booking rows: lookups, the lifecycle view, status changes, codes. */
import { bookingCode } from '@yeral/domain/id'
import type { BookingState } from '@yeral/domain/lifecycle'
import type { BookingStatus, CancelledBy } from '@yeral/domain/model'
import { and, eq, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings } from '../../db/schema'
import { ApiError } from '../../http/errors'

export type BookingRow = typeof bookings.$inferSelect

/**
 * When a no-show was marked: its status change (`setStatus` sets `completedAt`), else the complaint. The booking's
 * timeline and the phone-only count (book Q-127) both read it.
 */
export const noShowMarkedAt = sql<Date>`coalesce(${bookings.completedAt}, ${bookings.complaintAt})`
export const noShowMarkedAtOf = (b: Pick<BookingRow, 'completedAt' | 'complaintAt'>): Date | null => b.completedAt ?? b.complaintAt
export type ItemRow = typeof bookingItems.$inferSelect

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

/** The booking changed since it was read (another request or the jobs got there first). */
export class StaleBooking extends ApiError {
  constructor() {
    super('invalid_status')
  }
}

/**
 * Change a booking's status; Postgres keeps `active` (pending or confirmed) and its items' copy in step. Only from the
 * status `b` was read with:
 * a change made in between wins, and this one throws `StaleBooking`.
 */
export async function setStatus(db: Queryable, b: BookingRow, change: StatusChange): Promise<BookingRow> {
  const [row] = await db
    .update(bookings)
    .set({
      status: change.status,
      cancelledBy: change.status === 'cancelled' ? (change.cancelledBy ?? null) : null,
      cancelReason: change.status === 'cancelled' ? (change.cancelReason ?? null) : b.cancelReason,
      cancelledAt: change.status === 'cancelled' ? change.at : null,
      confirmedAt: change.status === 'confirmed' && !b.confirmedAt ? change.at : b.confirmedAt,
      completedAt: change.status === 'completed' || change.status === 'noshow' ? change.at : b.completedAt,
      // kept after a cancel so "Yzyna al" can bring a request back with its remaining hold
      holdUntil: change.status === 'confirmed' || change.status === 'completed' ? null : b.holdUntil,
      updatedAt: change.at,
    })
    .where(and(eq(bookings.id, b.id), eq(bookings.status, b.status)))
    .returning()
  if (!row) throw new StaleBooking()
  return row
}

/**
 * The booking, locked for the rest of the transaction and read again: a move, a cancel and a move being confirmed lock
 * the booking first (then its move request), so they run one after another and each sees what the one before did. A row
 * gone meanwhile (a confirmed move removes its request) has changed: `StaleBooking`.
 */
export async function lockBooking(db: Queryable, id: string): Promise<BookingRow> {
  const [row] = await db.select().from(bookings).where(eq(bookings.id, id)).for('update')
  if (!row) throw new StaleBooking()
  return row
}

/** Postgres refused an overlap (exclusion constraint) or a duplicate: the slot went meanwhile. */
export function isSlotConflict(e: unknown): boolean {
  return pgCode(e) === '23P01'
}

/** The SQLSTATE of a failed statement, whether Drizzle passes the driver's error on or wraps it. */
export function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } }
  return err.code ?? err.cause?.code
}
