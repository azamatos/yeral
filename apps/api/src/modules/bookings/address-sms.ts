/**
 * A business that moves tells every client with a booking ahead (book Q-215, owner 20.10.2026): one SMS per booking,
 * sent `ADDRESS_SMS_AFTER_MS` after the last save that changed the address, worded by the jobs when it goes
 * (`sendAddressSms`), and nothing when the client already knows the address as it is then.
 */
import { ADDRESS_SMS_AFTER_MS, addressSmsAt, RESTORE_MINUTES, type AddressTold } from '@yeral/domain/lifecycle'
import { addDays, epochOf, localOf } from '@yeral/domain/time'
import { and, eq, gt, gte, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, businesses, jobs } from '../../db/schema'
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
 * and the ones the client cancelled that "Yzyna al" may still bring back; not a waiting move (its booking hears it).
 * Each keeps the address its client knew before (`addressTold`, unless an earlier move set it), and one SMS waits per
 * booking: another save before it goes moves its time on. The jobs send it only to a booking that still hears it.
 */
export async function queueAddressSms(tx: Queryable, businessId: string, before: AddressTold, now: number): Promise<void> {
  // from yesterday's business day, which may run past midnight (book Q-105)
  const rows = await tx
    .select({ id: bookings.id, date: bookings.date, start: bookings.start, source: bookings.source, createdAt: bookings.createdAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.businessId, businessId),
        or(
          inArray(bookings.status, ['pending', 'confirmed']),
          and(
            eq(bookings.status, 'cancelled'),
            eq(bookings.cancelledBy, 'client'),
            isNull(bookings.businessCancelReason),
            gt(bookings.cancelledAt, new Date(now - RESTORE_MINUTES * 60_000)),
          ),
        ),
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

/**
 * A booking made in the minutes after the business moved, from a page that may still have shown the old address: it
 * hears the new one as the bookings made before did (book Q-215).
 */
export async function addressSmsForNewBooking(tx: Queryable, b: BookingRow, now: number): Promise<void> {
  const [biz] = await tx
    .select({ movedAt: businesses.movedAt, movedFrom: businesses.movedFrom })
    .from(businesses)
    .where(eq(businesses.id, b.businessId))
  if (!biz?.movedAt || !biz.movedFrom || now - biz.movedAt.getTime() >= ADDRESS_SMS_AFTER_MS || !b.clientPhone) return
  await tx.update(bookings).set({ addressTold: biz.movedFrom }).where(eq(bookings.id, b.id))
  await tx
    .insert(jobs)
    .values({
      kind: 'booking.sms',
      runAt: new Date(addressSmsAt({ ...b, createdAt: b.createdAt.getTime() }, now)),
      payload: { bookingId: b.id, kind: ADDRESS_SMS },
    })
}
