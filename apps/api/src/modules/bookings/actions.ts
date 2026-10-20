/** What a client can do with their booking (client spec §4.8 "Client actions by status"; ADR 0017). */
import {
  canClientCancel,
  canClientReschedule,
  canEditNote,
  canWriteReview,
  effectiveStatus,
  initialStatus,
  offerPast,
  REVIEW_EDIT_DAYS,
} from '@yeral/domain/lifecycle'
import { MARKET } from '@yeral/domain/market'
import { reviewName, splitName } from '@yeral/domain/names'
import { epochOf } from '@yeral/domain/time'
import { and, eq, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, classSessions, reviews, users } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import type { User } from '../../http/env'
import { emit } from '../../notify'
import { loadBusinesses, type LoadedBusiness } from '../availability/context'
import { visitWhat } from '../catalog/map'
import { shiftRating } from '../reviews/rating'
import { assertOnlineBooking, bookedServices, rebook } from './create'
import { offerTarget } from './offers'
import { isSlotConflict, lockBooking, pgCode, recordMoveRefused, setStatus, StaleBooking, stateOf, type BookingRow } from './repo'
import { RESTORE_MINUTES } from './view'
import { nameOf } from '../me/me'

async function businessOf(deps: Deps, b: BookingRow): Promise<LoadedBusiness> {
  const lb = (await loadBusinesses(deps.db, [b.businessId])).get(b.businessId)
  if (!lb) throw new ApiError('not_found')
  return lb
}

const rulesOf = async (deps: Deps, b: BookingRow) => (await businessOf(deps, b)).rules

/** Seats still free in a class session, counted under a lock on the session row. */
async function seatsLeft(tx: Queryable, sessionId: string): Promise<number> {
  const [session] = await tx.select().from(classSessions).where(eq(classSessions.id, sessionId)).for('update')
  if (!session) return 0
  const [taken] = await tx
    .select({ seats: sql<number>`coalesce(sum(${bookings.seats}), 0)::int` })
    .from(bookings)
    .where(and(eq(bookings.sessionId, sessionId), eq(bookings.active, true)))
  return session.capacity - (taken?.seats ?? 0)
}

const guard = (problem: ReturnType<typeof canClientCancel>) => {
  if (problem) throw new ApiError(problem)
}

/** The client moved on from a refused move: the booking stops saying it. */
async function clearMoveRefused(db: Queryable, b: BookingRow): Promise<BookingRow> {
  const [row] = await db.update(bookings).set({ moveRefused: null }).where(eq(bookings.id, b.id)).returning()
  return row ?? b
}

/** The move waiting for this booking, if any. */
async function waitingMove(db: Queryable, b: BookingRow): Promise<BookingRow | undefined> {
  const [m] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.rescheduleOf, b.id), eq(bookings.status, 'pending')))
  return m
}

/**
 * Withdraw a pending move of this booking, if there is one, and tell the business's open screens. One whose hold has
 * run out lapsed unanswered: it's recorded as the jobs would, not as the client's. One the jobs just settled is gone.
 */
async function dropPendingMove(db: Queryable, b: BookingRow, at: Date) {
  const m = await waitingMove(db, b)
  if (!m) return
  const lapsed = effectiveStatus(stateOf(m), at.getTime()).status !== 'pending'
  try {
    const row = await setStatus(db, m, { status: 'cancelled', cancelledBy: lapsed ? 'system' : 'client', at })
    // as the jobs would: the booking says the move wasn't accepted (a cancel and "Yzyna al" keep that)
    if (lapsed) await recordMoveRefused(db, b, row, { by: 'system', reason: null, text: null }, m.holdUntil?.getTime() ?? at.getTime())
    await emit(db, {
      type: lapsed ? 'booking.expired' : 'booking.cancelled',
      businessId: row.businessId,
      bookingId: row.id,
      bookingCode: row.code,
      userId: row.userId,
    })
  } catch (e) {
    if (!(e instanceof StaleBooking)) throw e
  }
}

export async function cancelBooking(deps: Deps, b: BookingRow, reason?: string): Promise<BookingRow> {
  const rules = await rulesOf(deps, b)
  guard(canClientCancel(stateOf(b), rules, deps.now()))
  return deps.db.transaction(async (tx) => {
    const at = new Date(deps.now())
    // a move request cancelled by its own code: its booking first, as everywhere
    if (b.rescheduleOf) await lockBooking(tx, b.rescheduleOf)
    const locked = await lockBooking(tx, b.id)
    guard(canClientCancel(stateOf(locked), rules, deps.now()))
    await dropPendingMove(tx, locked, at)
    const row = await setStatus(tx, locked, { status: 'cancelled', cancelledBy: 'client', cancelReason: reason ?? null, at })
    await emit(tx, { type: 'booking.cancelled', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
    return row
  })
}

/** "Yzyna al": undo the client's own cancel for a few minutes, if the time is still free. */
export async function restoreBooking(deps: Deps, b: BookingRow): Promise<BookingRow> {
  const now = deps.now()
  const ok =
    b.status === 'cancelled' && b.cancelledBy === 'client' && !!b.cancelledAt && now - b.cancelledAt.getTime() < RESTORE_MINUTES * 60_000
  if (!ok || now >= epochOf(b.date, b.start)) throw new ApiError('restore_expired')
  // a withdrawn or replaced move stays withdrawn: the client asks again
  if (b.rescheduleOf) throw new ApiError('invalid_status')
  const status = b.confirmedAt ? 'confirmed' : 'pending'
  try {
    return await deps.db.transaction(async (tx) => {
      // the seats may have gone meanwhile; tables and specialists are guarded by the database
      if (b.type === 'class' && b.sessionId && (await seatsLeft(tx, b.sessionId)) < (b.seats ?? 1)) throw new ApiError('session_full')
      const row = await setStatus(
        tx,
        { ...b, holdUntil: b.holdUntil && b.holdUntil.getTime() > now ? b.holdUntil : null },
        { status, at: new Date(now) },
      )
      // a request whose hold ran out meanwhile can't come back
      if (status === 'pending' && !row.holdUntil) throw new ApiError('restore_expired')
      await emit(tx, { type: 'booking.updated', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
      return row
    })
  } catch (e) {
    if (isSlotConflict(e)) throw new ApiError('slot_taken', { alternatives: [] })
    throw e
  }
}

export async function editNote(deps: Deps, b: BookingRow, note: string): Promise<BookingRow> {
  guard(canEditNote(stateOf(b), deps.now()))
  const [row] = await deps.db
    .update(bookings)
    .set({ clientNote: note || null, updatedAt: new Date(deps.now()) })
    .where(eq(bookings.id, b.id))
    .returning()
  if (!row) throw new ApiError('not_found')
  await emit(deps.db, { type: 'booking.updated', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
  return row
}

/**
 * Move to another time: a new request; the original stays confirmed until the business answers (instant businesses move
 * at once). The new time may overlap the old one with the same specialist (book Q-165). An earlier pending move is
 * withdrawn in the same transaction, so it stays if the new time can't be had. The booking is locked first: two moves
 * asked at once (a double tap) run one after the other, and the second replaces the first.
 */
export async function rescheduleBooking(
  deps: Deps,
  user: User,
  b: BookingRow,
  to: { date: string; start: number; staffId?: string | null },
): Promise<BookingRow> {
  const lb = await businessOf(deps, b)
  guard(canClientReschedule(stateOf(b), lb.rules, deps.now()))
  if (b.type !== 'appointment') throw new ApiError('not_bookable')
  return deps.db.transaction(async (tx) => {
    // read again under the lock: a cancel or a confirmed move may have landed meanwhile
    let locked = await lockBooking(tx, b.id)
    guard(canClientReschedule(stateOf(locked), lb.rules, deps.now()))
    const booked = await bookedServices(tx, locked.id)
    await dropPendingMove(tx, locked, new Date(deps.now()))
    // the client acts again: an earlier refusal is old news
    locked = await clearMoveRefused(tx, locked)
    // its own time with no other specialist named: the booking stays as it is, whatever the rules say now, and the
    // waiting move is withdrawn (to move to another specialist at the same time, the client names them)
    if (to.date === locked.date && to.start === locked.start && (to.staffId == null || to.staffId === booked.staffId)) return locked
    await assertOnlineBooking(tx, lb, user)
    await rebook(deps, user, locked, to, {
      status: initialStatus('web', lb.rules.confirmMode),
      rescheduleOf: locked.id,
      db: tx,
      booked,
    })
    const [fresh] = await tx.select().from(bookings).where(eq(bookings.id, b.id))
    if (!fresh) throw new ApiError('not_found')
    return fresh
  })
}

/**
 * "Haýyşy yzyna al" (ROUND6 A3): withdraw the move waiting for this booking; the booking stays at its time. Not an
 * online booking, so it works for a paused business and a phone-only client too. Nothing waiting: nothing to do.
 */
export async function withdrawMove(deps: Deps, b: BookingRow): Promise<BookingRow> {
  return deps.db.transaction(async (tx) => {
    const locked = await lockBooking(tx, b.id)
    await dropPendingMove(tx, locked, new Date(deps.now()))
    return clearMoveRefused(tx, locked)
  })
}

/**
 * Pick one of the offered times: after a decline the business already agreed (confirmed at once); after an expired
 * request it's a new request like any other. Each offer makes one booking (`alternativeOf` is unique).
 */
export async function acceptAlternative(
  deps: Deps,
  user: User,
  b: BookingRow,
  source: 'decline' | 'expired',
  index: number,
): Promise<BookingRow> {
  const { status, cancelledBy } = effectiveStatus(stateOf(b), deps.now())
  const list = source === 'decline' ? b.declineAlternatives : b.expiredAlternatives
  const wanted = source === 'decline' ? cancelledBy === 'business' : cancelledBy === 'system'
  const slot = list[index]
  if (status !== 'cancelled' || !wanted || !slot) throw new ApiError('invalid_status')
  const [taken] = await deps.db.select({ id: bookings.id }).from(bookings).where(eq(bookings.alternativeOf, b.id))
  if (taken) throw new ApiError('invalid_status')
  const lb = await businessOf(deps, b)
  // past once it starts earlier than now plus the lead time (book Q-264)
  if (offerPast(slot, lb.rules.leadMinutes, deps.now())) throw new ApiError('offer_past')
  if (source === 'expired') await assertOnlineBooking(deps.db, lb, user)
  try {
    const row = await rebook(
      deps,
      user,
      b,
      // with its named specialist only (book Q-159): busy now, it's taken (409 slot_taken)
      offerTarget(slot),
      { status: source === 'decline' ? 'confirmed' : initialStatus('web', lb.rules.confirmMode), alternativeOf: b.id },
    )
    return row
  } catch (e) {
    // another request took an offered time from this booking first
    if (pgCode(e) === '23505') throw new ApiError('invalid_status')
    throw e
  }
}

export async function writeReview(deps: Deps, user: User, b: BookingRow, input: { rating: number; tags: string[]; text?: string }) {
  const now = deps.now()
  // one per booking first: a retry after the window says it's written, not that it's too late
  const [existing] = await deps.db.select().from(reviews).where(eq(reviews.bookingId, b.id))
  if (existing) throw new ApiError('review_exists')
  guard(canWriteReview(stateOf(b), now))
  const items = await deps.db.select().from(bookingItems).where(eq(bookingItems.bookingId, b.id)).orderBy(bookingItems.sort)
  // stored in the market's main language for reviews without items; readers get it in their language (catalog reviews)
  const what = visitWhat(items, MARKET.defaultLanguage)
  await deps.db.transaction(async (tx) => {
    // the author's account, shared: a deletion in flight finishes first, and then there's no one to review as
    const [author] = await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for('share')
    if (!author) throw new ApiError('unauthorized')
    await tx
      .insert(reviews)
      .values({
        bookingId: b.id,
        businessId: b.businessId,
        userId: user.id,
        // without a name of its own, the account signs with the one on the booking
        authorName: reviewName(user.name ? nameOf(user) : splitName(b.clientName)),
        rating: input.rating,
        tags: input.tags,
        text: input.text ?? null,
        what,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .catch((e: unknown) => {
        // sent twice at once: the second finds the first
        if (pgCode(e) === '23505') throw new ApiError('review_exists')
        throw e
      })
    await shiftRating(tx, b.businessId, { [input.rating]: 1 })
    await emit(tx, { type: 'review.created', businessId: b.businessId, bookingId: b.id, bookingCode: b.code, userId: user.id })
  })
}

export async function editReview(deps: Deps, b: BookingRow, input: { rating: number; tags: string[]; text?: string }) {
  const now = deps.now()
  await deps.db.transaction(async (tx) => {
    // read and changed under its lock: two edits at once, or an edit and the account's deletion, count once each
    const [existing] = await tx.select().from(reviews).where(eq(reviews.bookingId, b.id)).for('update')
    if (!existing) throw new ApiError('not_found')
    if (now - existing.createdAt.getTime() >= REVIEW_EDIT_DAYS * 86_400_000) throw new ApiError('review_locked')
    await tx
      .update(reviews)
      .set({ rating: input.rating, tags: input.tags, text: input.text ?? null, updatedAt: new Date(now) })
      .where(eq(reviews.id, existing.id))
    if (existing.rating !== input.rating) await shiftRating(tx, b.businessId, { [existing.rating]: -1, [input.rating]: 1 })
  })
}
