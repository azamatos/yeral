/**
 * Confirming a booking — by the business (M5), by instant confirmation, or by a demo business answering itself — and
 * what follows: reminders and the review ask are queued, the client gets the "confirmed" SMS (client spec §6).
 * A confirmed reschedule request moves the booking it points at.
 */
import { epochOf } from '@yeral/domain/time'
import { eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, jobs } from '../../db/schema'
import type { Deps } from '../../deps'
import { emit } from '../../notify'
import { setStatus, type BookingRow } from './repo'

const HOUR = 3_600_000

/** Queue the booking's SMS: confirmed now, reminders a day and 2 h before, the review ask 2 h after the end. */
export async function queueBookingSms(db: Queryable, deps: Deps, b: BookingRow, opts: { confirmed: boolean }): Promise<void> {
  const now = deps.now()
  const start = epochOf(b.date, b.start)
  const end = epochOf(b.date, b.end)
  const plan: { kind: string; runAt: number }[] = [
    { kind: 'reminderDay', runAt: start - 24 * HOUR },
    { kind: 'reminder2h', runAt: start - 2 * HOUR },
    { kind: 'reviewAsk', runAt: end + 2 * HOUR },
  ]
  if (opts.confirmed) plan.unshift({ kind: 'confirmed', runAt: now })
  const due = plan.filter((p) => p.kind === 'confirmed' || p.kind === 'reviewAsk' || p.runAt > now)
  if (!due.length) return
  await db
    .insert(jobs)
    .values(
      due.map((p) => ({
        kind: 'booking.sms',
        runAt: new Date(Math.max(p.runAt, now)),
        // the time it was planned for: after a move the old reminders find another time and stay quiet
        payload: { bookingId: b.id, kind: p.kind, date: b.date, start: b.start },
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
    const [original] = await db.select().from(bookings).where(eq(bookings.id, b.rescheduleOf))
    if (original) {
      // the original takes the new time and items; the request row goes away
      await db.delete(bookingItems).where(eq(bookingItems.bookingId, original.id))
      await db.update(bookingItems).set({ bookingId: original.id }).where(eq(bookingItems.bookingId, b.id))
      const [moved] = await db
        .update(bookings)
        .set({ date: b.date, start: b.start, end: b.end, priceType: b.priceType, priceAmount: b.priceAmount, updatedAt: at })
        .where(eq(bookings.id, original.id))
        .returning()
      await db.delete(bookings).where(eq(bookings.id, b.id))
      if (moved) {
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
    }
  }
  const row = await setStatus(db, b, { status: 'confirmed', at })
  await emit(db, { type: 'booking.confirmed', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
  await queueBookingSms(db, deps, row, { confirmed: true })
  return row
}
