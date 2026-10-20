/**
 * Confirming a booking — by the business (M5), by instant confirmation, or by a demo business answering itself — and
 * what follows: reminders are queued, the client gets the "confirmed" SMS (client spec §6).
 * A confirmed reschedule request moves the booking it points at.
 */
import { reminderPlan } from '@yeral/domain/lifecycle'
import { epochOf } from '@yeral/domain/time'
import { eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, jobs } from '../../db/schema'
import type { Deps } from '../../deps'
import { emit, type BookingSmsKind } from '../../notify'
import { extendBookingLinks } from './links'
import { lockBooking, setStatus, StaleBooking, type BookingRow } from './repo'

/**
 * Queue the booking's SMS: confirmed now and the reminders (a day and 2 h before, none at night: `reminderPlan`). No
 * review ask (book Q-259): clients review from my bookings and the link page.
 */
export async function queueBookingSms(db: Queryable, deps: Deps, b: BookingRow, opts: { confirmed: boolean }): Promise<void> {
  const now = deps.now()
  const start = epochOf(b.date, b.start)
  const due: { kind: BookingSmsKind; runAt: number; covers?: readonly string[] }[] = [
    ...(opts.confirmed ? [{ kind: 'confirmed' as const, runAt: now }] : []),
    ...reminderPlan(start, now),
  ]
  if (!due.length) return
  await db
    .insert(jobs)
    .values(
      due.map((p) => ({
        kind: 'booking.sms',
        runAt: new Date(Math.max(p.runAt, now)),
        // the time it was planned for: after a move the old reminders find another time and stay quiet; `covers`: the
        // reminders a moved one stands for, whose switches decide whether it goes
        payload: { bookingId: b.id, kind: p.kind, date: b.date, start: b.start, ...(p.covers ? { covers: p.covers } : {}) },
        // a moved booking gets new reminders: the key carries the time
        dedupeKey: `${p.kind}:${b.id}:${b.date}:${b.start}`,
      })),
    )
    .onConflictDoNothing({ target: jobs.dedupeKey })
}

/** Confirm a pending booking (or apply a confirmed move). Returns the booking that is now confirmed. */
export async function confirmBooking(db: Queryable, deps: Deps, b: BookingRow): Promise<BookingRow> {
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
        updatedAt: at,
      })
      .where(eq(bookings.id, original.id))
      .returning()
    if (!moved) throw new StaleBooking()
    await extendBookingLinks(db, moved)
    await db.delete(bookings).where(eq(bookings.id, request.id))
    await emit(db, {
      type: 'booking.moved',
      businessId: moved.businessId,
      bookingId: moved.id,
      bookingCode: moved.code,
      userId: moved.userId,
    })
    await queueBookingSms(db, deps, moved, { confirmed: true })
    return moved
  }
  const row = await setStatus(db, b, { status: 'confirmed', at })
  await emit(db, { type: 'booking.confirmed', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
  await queueBookingSms(db, deps, row, { confirmed: true })
  return row
}
