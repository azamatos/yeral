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
import type { BookingRow } from './repo'

/** The job's kind of booking SMS. */
export const ADDRESS_SMS = 'addressChanged'

/** The address SMS still waiting for these bookings; a runner's claimed one is under way and isn't. */
const waitingFor = (bookingIds: readonly string[], now: number) =>
  and(
    isNull(jobs.doneAt),
    eq(jobs.kind, 'booking.sms'),
    sql`${jobs.payload}->>'kind' = ${ADDRESS_SMS}`,
    inArray(sql`${jobs.payload}->>'bookingId'`, [...bookingIds]),
    or(isNull(jobs.lockedUntil), lt(jobs.lockedUntil, new Date(now))),
  )

/**
 * Queue the SMS for every booking ahead at the business: waiting requests and confirmed visits that haven't started,
 * not a waiting move (its booking hears it). Each keeps the address its client knew before (`addressTold`, unless an
 * earlier move set it), and one SMS waits per booking: another save before it goes moves its time on.
 */
export async function queueAddressSms(tx: Queryable, businessId: string, before: AddressTold, now: number): Promise<void> {
  // from yesterday's business day, which may run past midnight (book Q-105)
  const rows = await tx
    .select({ id: bookings.id, date: bookings.date, start: bookings.start, source: bookings.source, createdAt: bookings.createdAt })
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
  const runAt = new Map(ahead.map((b) => [b.id, new Date(addressSmsAt({ ...b, createdAt: b.createdAt.getTime() }, now))]))
  const waiting = await tx
    .select({ id: jobs.id, bookingId: sql<string>`${jobs.payload}->>'bookingId'` })
    .from(jobs)
    .where(waitingFor(ids, now))
    .for('update')
  // the waiting ones go later, in one statement (the business row stays locked until this commits)
  if (waiting.length) {
    const times = sql.join(
      waiting.map((j) => sql`(${j.id}::bigint, ${runAt.get(j.bookingId)!.toISOString()}::timestamptz)`),
      sql`, `,
    )
    await tx.execute(sql`update ${jobs} set run_at = v.run_at from (values ${times}) as v(id, run_at) where ${jobs.id} = v.id`)
  }
  const queued = new Set(waiting.map((j) => j.bookingId))
  const fresh = ahead.flatMap((b) =>
    queued.has(b.id) ? [] : [{ kind: 'booking.sms', runAt: runAt.get(b.id)!, payload: { bookingId: b.id, kind: ADDRESS_SMS } }],
  )
  if (fresh.length) await tx.insert(jobs).values(fresh)
}

/** A booking took another time (a move confirmed, the team's move): its waiting address SMS goes no later than it should now. */
export async function retimeAddressSms(tx: Queryable, b: BookingRow, now: number): Promise<void> {
  const at = new Date(addressSmsAt({ ...b, createdAt: b.createdAt.getTime() }, now))
  await tx
    .update(jobs)
    .set({ runAt: sql`least(${jobs.runAt}, ${at.toISOString()}::timestamptz)` })
    .where(waitingFor([b.id], now))
}
