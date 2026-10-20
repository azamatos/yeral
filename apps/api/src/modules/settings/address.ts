/**
 * A business that moves tells every client with a booking ahead (book Q-215, owner 20.10.2026): one SMS per booking,
 * sent `ADDRESS_SMS_AFTER_MS` after the last save that changed the address, worded by the jobs when it goes
 * (`sendAddressSms`), and nothing when the client already knows the address as it is then.
 */
import { addressSmsAt, type AddressTold } from '@yeral/domain/lifecycle'
import { addDays, epochOf, localOf } from '@yeral/domain/time'
import { and, eq, gte, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, jobs } from '../../db/schema'

/** The job's kind of booking SMS. */
export const ADDRESS_SMS = 'addressChanged'

/** Whether a client would notice: the line, the street a home-based business shows first, or the city changed. */
export const sameAddress = (a: AddressTold, b: AddressTold) => a.address === b.address && a.street === b.street && a.cityId === b.cityId

/**
 * Queue the SMS for every booking ahead at the business: waiting requests and confirmed visits that haven't started,
 * not a waiting move (its booking hears it). Each keeps the address its client knew before (`addressTold`, unless an
 * earlier move set it), and one SMS waits per booking: another save before it goes moves its time on.
 */
export async function queueAddressSms(tx: Queryable, businessId: string, before: AddressTold, now: number): Promise<void> {
  // from yesterday's business day, which may run past midnight (book Q-105)
  const rows = await tx
    .select({ id: bookings.id, date: bookings.date, start: bookings.start })
    .from(bookings)
    .where(
      and(
        eq(bookings.businessId, businessId),
        inArray(bookings.status, ['pending', 'confirmed']),
        isNull(bookings.rescheduleOf),
        isNotNull(bookings.clientPhone),
        isNull(bookings.accountDeletedAt),
        gte(bookings.date, addDays(localOf(now).date, -1)),
      ),
    )
  const ahead = rows.filter((b) => epochOf(b.date, b.start) > now)
  if (!ahead.length) return
  const ids = ahead.map((b) => b.id)
  await tx
    .update(bookings)
    .set({ addressTold: before })
    .where(and(inArray(bookings.id, ids), isNull(bookings.addressTold)))
  // one waiting per booking: a runner's claimed one is under way, so this save gets its own
  const waiting = await tx
    .select({ id: jobs.id, bookingId: sql<string>`${jobs.payload}->>'bookingId'` })
    .from(jobs)
    .where(
      and(
        isNull(jobs.doneAt),
        eq(jobs.kind, 'booking.sms'),
        sql`${jobs.payload}->>'kind' = ${ADDRESS_SMS}`,
        inArray(sql`${jobs.payload}->>'bookingId'`, ids),
        or(isNull(jobs.lockedUntil), lt(jobs.lockedUntil, new Date(now))),
      ),
    )
    .for('update')
  const queued = new Map(waiting.map((j) => [j.bookingId, j.id]))
  const fresh = []
  for (const b of ahead) {
    const runAt = new Date(addressSmsAt(now, epochOf(b.date, b.start)))
    const jobId = queued.get(b.id)
    if (jobId !== undefined) await tx.update(jobs).set({ runAt }).where(eq(jobs.id, jobId))
    else fresh.push({ kind: 'booking.sms', runAt, payload: { bookingId: b.id, kind: ADDRESS_SMS } })
  }
  if (fresh.length) await tx.insert(jobs).values(fresh)
}
