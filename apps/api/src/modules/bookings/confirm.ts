/**
 * Confirming a booking — by the business (M5), by instant confirmation, or by a demo business answering itself — and
 * what follows: reminders are queued, the client gets the "confirmed" SMS (client spec §6).
 * A confirmed reschedule request moves the booking it points at.
 */
import { reminderPlan } from '@yeral/domain/lifecycle'
import { epochOf } from '@yeral/domain/time'
import { and, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, jobs } from '../../db/schema'
import type { Deps } from '../../deps'
import { CHANGE_SMS, CONFIRMATION_SMS, emit, type FirstSmsKind } from '../../notify'
import { extendBookingLinks } from './links'
import { lockBooking, setStatus, StaleBooking, type BookingRow } from './repo'

/** What the client knows of a booking, or would from a change SMS: its time, and who does it (staff ids in order). */
export interface Told {
  date: string
  start: number
  staff: string
}
export const toldOf = (b: Pick<BookingRow, 'date' | 'start'>, staffIds: readonly (string | null)[]): Told => ({
  date: b.date,
  start: b.start,
  staff: staffIds.join(','),
})
const sameTold = (a: Told, b: Told) => a.date === b.date && a.start === b.start && a.staff === b.staff

/** How a first SMS that a later one replaced is settled: unsent, never tried. */
export const DROPPED_REPLACED = 'dropped: a later SMS tells the booking as it is'

/**
 * The booking's first SMS still waiting to go. One being sent right now isn't among them: it has gone (its text is
 * made from the booking as it was then).
 */
async function waitingFirstSms(db: Queryable, bookingId: string, now: number) {
  return db
    .select({ id: jobs.id, payload: jobs.payload })
    .from(jobs)
    .where(
      and(
        eq(jobs.kind, 'booking.sms'),
        isNull(jobs.doneAt),
        sql`${jobs.payload}->>'bookingId' = ${bookingId}`,
        inArray(sql`${jobs.payload}->>'kind'`, [...CONFIRMATION_SMS, ...CHANGE_SMS]),
        or(isNull(jobs.lockedUntil), lt(jobs.lockedUntil, new Date(now))),
      ),
    )
}

/**
 * The first SMS about a booking, one at a time (book B-24, B-26). A confirmation (`confirmed`, `booked`) tells the
 * booking as it is when it goes and replaces any still waiting. A change (`moved`, `staffChanged`) gives way to a
 * confirmation still waiting, which will tell the change too, and replaces an earlier change: the client hears once,
 * and nothing when it's back as they knew it.
 */
async function queueFirstSms(
  db: Queryable,
  b: BookingRow,
  kind: FirstSmsKind,
  runAt: number,
  now: number,
  change?: { was: Told; now: Told },
): Promise<void> {
  const waiting = await waitingFirstSms(db, b.id, now)
  const kindOf = (j: (typeof waiting)[number]) => String(j.payload.kind)
  const isChange = CHANGE_SMS.has(kind)
  if (isChange && waiting.some((j) => CONFIRMATION_SMS.has(kindOf(j)))) return
  // what the client knew before the first change still waiting
  const knew = (waiting.find((j) => CHANGE_SMS.has(kindOf(j)))?.payload.from as Told | undefined) ?? change?.was
  if (waiting.length)
    await db
      .update(jobs)
      .set({ doneAt: new Date(now), lockedUntil: null, error: DROPPED_REPLACED })
      .where(
        and(
          inArray(
            jobs.id,
            waiting.map((j) => j.id),
          ),
          isNull(jobs.doneAt),
        ),
      )
  if (isChange && change && knew && sameTold(knew, change.now)) return
  await db.insert(jobs).values({
    kind: 'booking.sms',
    runAt: new Date(runAt),
    payload: {
      bookingId: b.id,
      kind,
      date: b.date,
      start: b.start,
      ...(isChange && change ? { staff: change.now.staff, from: knew } : {}),
    },
  })
}

/**
 * Queue the booking's SMS: the first one (`confirmed`; `booked` for a booking the team entered, `moved` or
 * `staffChanged` for one it moved, with `change`: what the client knew and what holds now) and the reminders (a day
 * and 2 h before, none at night: `reminderPlan`), none before `notBefore` (a booking that can still be undone, B-24).
 * No review ask (book Q-259): clients review from my bookings and the link page.
 */
export async function queueBookingSms(
  db: Queryable,
  deps: Deps,
  b: BookingRow,
  opts: { first: FirstSmsKind | null; notBefore?: number; change?: { was: Told; now: Told } },
): Promise<void> {
  const now = deps.now()
  const from = Math.max(now, opts.notBefore ?? now)
  if (opts.first) await queueFirstSms(db, b, opts.first, from, now, opts.change)
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
    await queueBookingSms(db, deps, moved, { first: 'confirmed' })
    return moved
  }
  const row = await setStatus(db, b, { status: 'confirmed', at, answered: !opts.instant })
  await emit(db, { type: 'booking.confirmed', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
  await queueBookingSms(db, deps, row, { first: 'confirmed' })
  return row
}
