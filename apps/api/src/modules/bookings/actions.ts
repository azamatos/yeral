/** What a client can do with their booking (client spec §4.8 "Client actions by status"; ADR 0017). */
import {
  canClientCancel,
  canClientReschedule,
  canEditNote,
  effectiveStatus,
  initialStatus,
  REVIEW_EDIT_DAYS,
} from '@yeral/domain/lifecycle'
import { MARKET } from '@yeral/domain/market'
import { epochOf } from '@yeral/domain/time'
import { and, eq, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, businesses, classSessions, reviews } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import type { User } from '../../http/env'
import { emit } from '../../notify'
import { loadBusinesses, type LoadedBusiness } from '../availability/context'
import { visitWhat } from '../catalog/map'
import { assertOnlineBooking, rebook } from './create'
import { isSlotConflict, setStatus, stateOf, type BookingRow } from './repo'
import { RESTORE_MINUTES } from './view'

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

/** Withdraw a pending move of this booking, if there is one. */
async function dropPendingMove(db: Queryable, b: BookingRow, at: Date) {
  const moves = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.rescheduleOf, b.id), eq(bookings.status, 'pending')))
  for (const m of moves) await setStatus(db, m, { status: 'cancelled', cancelledBy: 'client', at })
}

export async function cancelBooking(deps: Deps, b: BookingRow, reason?: string): Promise<BookingRow> {
  guard(canClientCancel(stateOf(b), await rulesOf(deps, b), deps.now()))
  return deps.db.transaction(async (tx) => {
    const at = new Date(deps.now())
    await dropPendingMove(tx, b, at)
    const row = await setStatus(tx, b, { status: 'cancelled', cancelledBy: 'client', cancelReason: reason ?? null, at })
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
 * at once). The new time can't overlap the old one with the same specialist while both are held. An earlier pending move
 * is withdrawn in the same transaction, so it stays if the new time can't be had.
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
  await assertOnlineBooking(deps.db, lb, user)
  return deps.db.transaction(async (tx) => {
    await dropPendingMove(tx, b, new Date(deps.now()))
    await rebook(deps, user, b, to, { status: initialStatus('web', lb.rules.confirmMode), rescheduleOf: b.id, db: tx })
    const [fresh] = await tx.select().from(bookings).where(eq(bookings.id, b.id))
    if (!fresh) throw new ApiError('not_found')
    return fresh
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
  if (source === 'expired') await assertOnlineBooking(deps.db, lb, user)
  try {
    return await rebook(
      deps,
      user,
      b,
      // with its named specialist only (book Q-159): busy now, it's taken (409 slot_taken)
      { date: slot.date, start: slot.start, ...(slot.staffId ? { staffId: slot.staffId } : {}) },
      { status: source === 'decline' ? 'confirmed' : initialStatus('web', lb.rules.confirmMode), alternativeOf: b.id },
    )
  } catch (e) {
    // another request took an offered time from this booking first
    if ((e as { cause?: { code?: string } }).cause?.code === '23505' || (e as { code?: string }).code === '23505')
      throw new ApiError('invalid_status')
    throw e
  }
}

/** "Aýjemal G.": first name and the initial of the last. */
export function authorName(name: string | null): string {
  const [first = '', last = ''] = (name ?? '').trim().split(/\s+/)
  return last ? `${first} ${last.charAt(0)}.` : first
}

async function refreshRating(db: Queryable, businessId: string, change: { add?: number; remove?: number }) {
  const [b] = await db.select().from(businesses).where(eq(businesses.id, businessId))
  if (!b) return
  const breakdown = { ...b.ratingBreakdown }
  if (change.remove)
    breakdown[String(change.remove) as keyof typeof breakdown] = Math.max(0, breakdown[String(change.remove) as keyof typeof breakdown] - 1)
  if (change.add) breakdown[String(change.add) as keyof typeof breakdown] += 1
  const count = Object.values(breakdown).reduce((s, n) => s + n, 0)
  const sum = Object.entries(breakdown).reduce((s, [stars, n]) => s + Number(stars) * n, 0)
  await db
    .update(businesses)
    .set({
      ratingBreakdown: breakdown,
      reviewsCount: b.reviewsCount + (change.add && !change.remove ? 1 : 0),
      rating: count ? Math.round((sum / count) * 10) / 10 : null,
    })
    .where(eq(businesses.id, businessId))
}

export async function writeReview(deps: Deps, user: User, b: BookingRow, input: { rating: number; tags: string[]; text?: string }) {
  const now = deps.now()
  if (effectiveStatus(stateOf(b), now).status !== 'completed') throw new ApiError('review_not_allowed')
  const [existing] = await deps.db.select().from(reviews).where(eq(reviews.bookingId, b.id))
  if (existing) throw new ApiError('review_exists')
  const items = await deps.db.select().from(bookingItems).where(eq(bookingItems.bookingId, b.id)).orderBy(bookingItems.sort)
  // stored in the market's main language for reviews without items; readers get it in their language (catalog reviews)
  const what = visitWhat(items, MARKET.defaultLanguage)
  await deps.db.transaction(async (tx) => {
    await tx.insert(reviews).values({
      bookingId: b.id,
      businessId: b.businessId,
      userId: user.id,
      authorName: authorName(user.name),
      rating: input.rating,
      tags: input.tags,
      text: input.text ?? null,
      what,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    })
    await refreshRating(tx, b.businessId, { add: input.rating })
    await emit(tx, { type: 'review.created', businessId: b.businessId, bookingId: b.id, bookingCode: b.code, userId: user.id })
  })
}

export async function editReview(deps: Deps, b: BookingRow, input: { rating: number; tags: string[]; text?: string }) {
  const now = deps.now()
  const [existing] = await deps.db.select().from(reviews).where(eq(reviews.bookingId, b.id))
  if (!existing) throw new ApiError('not_found')
  if (now - existing.createdAt.getTime() >= REVIEW_EDIT_DAYS * 86_400_000) throw new ApiError('review_locked')
  await deps.db.transaction(async (tx) => {
    await tx
      .update(reviews)
      .set({ rating: input.rating, tags: input.tags, text: input.text ?? null, updatedAt: new Date(now) })
      .where(eq(reviews.id, existing.id))
    if (existing.rating !== input.rating) await refreshRating(tx, b.businessId, { add: input.rating, remove: existing.rating })
  })
}
