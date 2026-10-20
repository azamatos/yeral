/**
 * Confirming a booking — by the business (M5), by instant confirmation, or by a demo business answering itself — and
 * what follows: reminders are queued, the client gets the "confirmed" SMS (client spec §6).
 * A confirmed reschedule request moves the booking it points at.
 */
import { firstSmsFrom, isConfirmationNews, NEWS_QUEUED, reminderPlan, type NewsQueued } from '@yeral/domain/lifecycle'
import { epochOf } from '@yeral/domain/time'
import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, jobs } from '../../db/schema'
import type { Deps } from '../../deps'
import { emit } from '../../notify'
import { retimeAddressSms } from './address-sms'
import { extendBookingLinks } from './links'
import { lockBooking, setStatus, StaleBooking, type BookingRow } from './repo'

/** The booking's news SMS jobs not done yet; `unclaimed`: only those no runner has picked up. */
export function newsJobs(db: Queryable, bookingId: string, opts: { unclaimed: boolean }) {
  return db
    .select({ id: jobs.id, payload: jobs.payload })
    .from(jobs)
    .where(
      and(
        eq(jobs.kind, 'booking.sms'),
        isNull(jobs.doneAt),
        sql`${jobs.payload}->>'bookingId' = ${bookingId}`,
        inArray(sql`${jobs.payload}->>'kind'`, [...NEWS_QUEUED]),
        opts.unclaimed ? isNull(jobs.lockedUntil) : undefined,
      ),
    )
}

/**
 * The news SMS about a booking, one waiting at a time (book B-24, B-26): its words are chosen when it goes, from what
 * the client knows (`told`) and the booking as it is then (`newsSms`). A confirmation outranks a change: one asked for
 * while a change waits takes its place; anything else asked for while one waits is covered by it. A job a runner has
 * picked up may already have read the booking, so it doesn't count; a claim under way is waited for (the row lock).
 */
async function queueNews(db: Queryable, b: BookingRow, kind: NewsQueued, runAt: number): Promise<void> {
  const [waiting] = await newsJobs(db, b.id, { unclaimed: true }).for('update')
  if (!waiting) {
    await db
      .insert(jobs)
      .values({ kind: 'booking.sms', runAt: new Date(runAt), payload: { bookingId: b.id, kind, date: b.date, start: b.start } })
    return
  }
  if (isConfirmationNews(kind) && !isConfirmationNews(waiting.payload.kind as NewsQueued))
    await db
      .update(jobs)
      .set({ payload: { ...waiting.payload, kind } })
      .where(eq(jobs.id, waiting.id))
}

/**
 * Queue the booking's SMS: its news (`confirmed`; `booked` for a booking the team entered; `moved` for a change the
 * business made, worded when it goes) and the reminders (a day and 2 h before, none at night: `reminderPlan`). None
 * goes before a booking the team just entered can no longer be undone (`NEW_BOOKING_SMS_AFTER_MS`, B-24), whoever
 * queues it. No review ask (book Q-259): clients review from my bookings and the link page.
 */
export async function queueBookingSms(db: Queryable, deps: Deps, b: BookingRow, opts: { news: NewsQueued | null }): Promise<void> {
  const now = deps.now()
  const from = firstSmsFrom({ source: b.source, createdAt: b.createdAt.getTime() }, now)
  if (opts.news) await queueNews(db, b, opts.news, from)
  const due = reminderPlan(epochOf(b.date, b.start), now)
  if (!due.length) return
  await db
    .insert(jobs)
    .values(
      due.map((p) => ({
        kind: 'booking.sms',
        runAt: new Date(Math.max(p.runAt, from)),
        // the time it was planned for: after a move the old reminders find another time and stay quiet; `covers`: the
        // reminders a moved one stands for, whose switches decide whether it goes
        payload: { bookingId: b.id, kind: p.kind, date: b.date, start: b.start, covers: p.covers },
        // a moved booking gets new reminders: the key carries the time
        dedupeKey: `${p.kind}:${b.id}:${b.date}:${b.start}`,
      })),
    )
    .onConflictDoNothing({ target: jobs.dedupeKey })
}

/**
 * Confirm a pending booking (or apply a confirmed move). Returns the booking that is now confirmed. Every confirmation
 * of a request is the business's answer, counted toward the typical answer time (book Q-113), except an instant
 * business's (`instant`); a move request's answer isn't counted (its row goes into the booking).
 */
export async function confirmBooking(db: Queryable, deps: Deps, b: BookingRow, opts: { instant?: boolean } = {}): Promise<BookingRow> {
  const at = new Date(deps.now())
  if (b.rescheduleOf) {
    // the booking first, then the request (the order moves and cancels lock in); either may have changed meanwhile
    const original = await lockBooking(db, b.rescheduleOf)
    const request = await lockBooking(db, b.id)
    if (request.status !== 'pending' || original.status !== 'confirmed') throw new StaleBooking()
    // the original takes the new time and items; the request row goes away
    await db.delete(bookingItems).where(eq(bookingItems.bookingId, original.id))
    await db.update(bookingItems).set({ bookingId: original.id }).where(eq(bookingItems.bookingId, request.id))
    const [moved] = await db
      .update(bookings)
      .set({
        date: request.date,
        start: request.start,
        end: request.end,
        priceType: request.priceType,
        priceAmount: request.priceAmount,
        moveRefused: null,
        // a marker such as "Arrived" was about the old time
        internalStatusId: null,
        // the client asked for the new time
        told: request.told,
        updatedAt: at,
      })
      .where(eq(bookings.id, original.id))
      .returning()
    if (!moved) throw new StaleBooking()
    await extendBookingLinks(db, moved)
    // a new address waiting to be told goes by the new time
    await retimeAddressSms(db, moved, at.getTime())
    await db.delete(bookings).where(eq(bookings.id, request.id))
    await emit(db, {
      type: 'booking.moved',
      businessId: moved.businessId,
      bookingId: moved.id,
      bookingCode: moved.code,
      userId: moved.userId,
    })
    await queueBookingSms(db, deps, moved, { news: 'confirmed' })
    return moved
  }
  const row = await setStatus(db, b, { status: 'confirmed', at, answered: !opts.instant })
  await emit(db, { type: 'booking.confirmed', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
  await queueBookingSms(db, deps, row, { news: 'confirmed' })
  return row
}
