/** Booking rows: lookups, the lifecycle view, status changes, codes. */
import { bookingCode } from '@yeral/domain/id'
import { effectiveStatus, type BookingState, type LifecycleError, type RestoreState } from '@yeral/domain/lifecycle'
import type { BookingStatus, BusinessCancelReason, CancelledBy, DeclineReason } from '@yeral/domain/model'
import { diffDays, epochOf, localOf } from '@yeral/domain/time'
import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, type MoveRefused, type TimeSlot } from '../../db/schema'
import { ApiError } from '../../http/errors'

export type BookingRow = typeof bookings.$inferSelect

/** A lifecycle rule's refusal (`@yeral/domain/lifecycle`) as the api's error of the same name. */
export function guard(problem: LifecycleError | null): void {
  if (problem) throw new ApiError(problem)
}

/** A request still waiting for its answer: pending and inside its answer time (as `effectiveStatus` reads it). */
export const awaitingAnswer = (now: number) => and(eq(bookings.status, 'pending'), gt(bookings.holdUntil, new Date(now)))

/** Business-local minutes since 2000-01-01: the scale of `bookings.span`. */
export const spanMinuteAt = (now: number) => {
  const { date, min } = localOf(now)
  return diffDays(date, '2000-01-01') * 1440 + min
}

/**
 * A request whose answer time ran out (one without an answer time, once its start passed), before the jobs settle it:
 * cancelled as people see it (`effectiveStatus`). Never null, so `not()` of it is safe.
 */
export const ranOutAt = (now: number) =>
  sql`(${bookings.status} = 'pending' and coalesce(${bookings.holdUntil} <= ${new Date(now)}, lower(${bookings.span}) <= ${spanMinuteAt(now)}))`

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
    complaintType: b.complaintType,
  }
}

/**
 * The bookings ahead and the waiting requests among `rows` (bookings, not their move requests), as they stand at
 * `now`: what a confirm counts (book B-15, Q-172). A request past its hold, or a visit that started, isn't ahead.
 */
export function countAhead(rows: readonly BookingRow[], now: number): { bookings: number; requests: number } {
  let ahead = 0
  let waiting = 0
  for (const r of rows) {
    if (epochOf(r.date, r.start) <= now) continue
    const { status } = effectiveStatus(stateOf(r), now)
    if (status === 'pending') waiting++
    else if (status === 'confirmed') ahead++
  }
  return { bookings: ahead, requests: waiting }
}

/** A booking as "Yzyna al" reads it (ROUND6 A6). */
export function restoreStateOf(b: BookingRow): RestoreState {
  return {
    ...stateOf(b),
    cancelledAt: b.cancelledAt?.getTime() ?? null,
    wasConfirmed: !!b.confirmedAt,
    isMove: !!b.rescheduleOf,
    byTeam: !!b.businessCancelReason,
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
  return itemsOfBookings(db, [bookingId])
}

/** These bookings' items, each booking's in its order. */
export async function itemsOfBookings(db: Queryable, bookingIds: readonly string[]): Promise<ItemRow[]> {
  if (!bookingIds.length) return []
  return db
    .select()
    .from(bookingItems)
    .where(inArray(bookingItems.bookingId, [...bookingIds]))
    .orderBy(asc(bookingItems.sort))
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
  /** The reason the business picked when it cancelled (B-27). */
  businessCancelReason?: BusinessCancelReason | null
  /** The business answered a request (book Q-113): its answer time counts toward the typical one. */
  answered?: boolean
  /** A decline's reason and the business's words (B-20). */
  decline?: { reason: DeclineReason; text: string | null }
  /** The times offered with a decline or the business's cancel (B-20, B-39, B-40), taken in one tap. */
  offers?: TimeSlot[]
  /** Other columns written in the same update (a complaint, B-28); they win over the ones the status sets. */
  fields?: Partial<typeof bookings.$inferInsert>
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
      // a booking brought back ("Yzyna al") leaves its cancel reason behind
      cancelReason: change.status === 'cancelled' ? (change.cancelReason ?? null) : null,
      businessCancelReason: change.status === 'cancelled' ? (change.businessCancelReason ?? null) : null,
      cancelledAt: change.status === 'cancelled' ? change.at : null,
      confirmedAt: change.status === 'confirmed' && !b.confirmedAt ? change.at : b.confirmedAt,
      completedAt: change.status === 'completed' || change.status === 'noshow' ? change.at : b.completedAt,
      // kept after a cancel so "Yzyna al" can bring a request back with its remaining hold
      holdUntil: change.status === 'confirmed' || change.status === 'completed' ? null : b.holdUntil,
      answeredAt: change.answered ? change.at : b.answeredAt,
      ...(change.decline ? { declineReason: change.decline.reason, declineText: change.decline.text } : {}),
      ...(change.offers ? { declineAlternatives: change.offers } : {}),
      updatedAt: change.at,
      ...change.fields,
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

/**
 * Whether a move refused at `refusedAt` counts for its booking: refused before the visit began, while the booking stood.
 * Judged by when it was refused, not when a job gets to it, so the booking detail and the record agree.
 */
export const refusalCounts = (original: Pick<BookingRow, 'date' | 'start' | 'status'>, refusedAt: number) =>
  original.status === 'confirmed' && refusedAt < epochOf(original.date, original.start)

/**
 * A move not accepted (lapsed, or declined by the business): the booking it would move keeps its time and says so
 * (ROUND6 A3). Every path that refuses a move records it here; true when it did. The caller holds the booking's lock and
 * decides about the SMS (book Q-289): the jobs send it while the visit is still ahead; a client action that finds a
 * lapsed move doesn't, the client is on the screen.
 */
export async function recordMoveRefused(
  db: Queryable,
  original: BookingRow,
  move: Pick<BookingRow, 'date' | 'start' | 'end'>,
  refused: Pick<MoveRefused, 'by' | 'reason' | 'text'>,
  refusedAt: number,
): Promise<boolean> {
  if (!refusalCounts(original, refusedAt)) return false
  await db
    .update(bookings)
    .set({ moveRefused: { date: move.date, start: move.start, end: move.end, ...refused } })
    .where(eq(bookings.id, original.id))
  return true
}

/**
 * Postgres refused an overlap (exclusion constraint) or a duplicate: the slot went meanwhile. The constraints keep one
 * specialist's bookings apart, and one person's across their workspaces (busy elsewhere, book Q-272; migration 0020).
 */
export function isSlotConflict(e: unknown): boolean {
  return pgCode(e) === '23P01'
}

/** The SQLSTATE of a failed statement, whether Drizzle passes the driver's error on or wraps it. */
export function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } }
  return err.code ?? err.cause?.code
}
