/** The calendar's queries (book B-23–B-27): a team member's booking, who hears a change, the phone's client record. */
import { canOn, type Actor } from '@yeral/domain/permissions'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, clients, staff, users } from '../../db/schema'
import { ApiError } from '../../http/errors'
import { unusedSince } from '../auth/sign-in'
import { awaitingAnswer, itemsOf, type BookingRow, type ItemRow } from '../bookings/repo'
import { isSandbox } from '../demo/sandbox'

/** A workspace as the calendar needs it. */
export interface Business {
  id: string
}

/** The booking's specialists, in its order. */
export const staffOf = (items: readonly ItemRow[]) => items.flatMap((i) => (i.staffId ? [i.staffId] : []))

/**
 * A booking of this business with its items, which the actor may change: one they can't see is 404, one they see but
 * may not change (a specialist's shared booking) 403. `lock` holds the row for the rest of the transaction;
 * `permission` is the row of the table the change needs (`bookings` to add, move and cancel; `noshow` to complain).
 */
export async function teamBooking(
  db: Queryable,
  business: Business,
  actor: Actor,
  code: string,
  opts: { lock?: boolean; permission?: 'bookings' | 'noshow' } = {},
) {
  const q = db
    .select()
    .from(bookings)
    .where(and(eq(bookings.businessId, business.id), eq(bookings.code, code)))
  const [b] = opts.lock ? await q.for('update') : await q
  if (!b) throw new ApiError('not_found')
  const items = await itemsOf(db, b.id)
  const staffIds = staffOf(items)
  if (!canOn(actor, 'calendar', staffIds)) throw new ApiError('not_found')
  if (!canOn(actor, opts.permission ?? 'bookings', staffIds)) throw new ApiError('forbidden')
  return { b, items, staffIds }
}

/**
 * The accounts of the specialists among these team members. A specialist's feed finds a booking through its items, so
 * those a change leaves (a deleted booking, a move to someone else) hear it as the person concerned (`userId`).
 */
export async function specialistAccounts(db: Queryable, staffIds: readonly string[]): Promise<string[]> {
  if (!staffIds.length) return []
  const rows = await db
    .select({ userId: staff.userId })
    .from(staff)
    .where(and(inArray(staff.id, [...staffIds]), eq(staff.level, 'specialist')))
  return rows.flatMap((r) => (r.userId ? [r.userId] : []))
}

/**
 * The phone's client at this business (B-23): its record, found by the number, or a new one with the name typed in.
 * An account's name never fills it: a number alone mustn't tell a business who holds it. The booking joins the
 * number's account unless it went unused for 6 months: the number may be someone else's now, and it joins after "Is
 * this you?" at their next sign-in (book Q-270). A record not yet linked is linked as an online booking links it. In the
 * demo workspace nothing joins an account (book F-242).
 */
export async function phoneClient(
  tx: Queryable,
  businessId: string,
  phone: string,
  name: string | undefined,
  now: number,
  bookingId: string,
) {
  const [account] = await tx.select().from(users).where(eq(users.phone, phone))
  const holder = account && !unusedSince(account.lastSeenAt, now) && !(await isSandbox(tx, businessId)) ? account : undefined
  const [record] = await tx
    .insert(clients)
    // an undo removes a record its booking made: made at the booking's instant, held by no other booking
    .values({
      businessId,
      phone,
      name: name ?? null,
      nameSetBy: name ? bookingId : null,
      userId: holder?.id ?? null,
      createdAt: new Date(now),
    })
    .onConflictDoUpdate({
      target: [clients.businessId, clients.phone],
      // a known client keeps their name; a record without one takes the name typed in, which an undo takes back
      set: {
        name: sql`coalesce(${clients.name}, excluded.name)`,
        nameSetBy: sql`case when ${clients.name} is null and excluded.name is not null then ${bookingId}::uuid else ${clients.nameSetBy} end`,
        userId: sql`coalesce(${clients.userId}, excluded.user_id)`,
      },
    })
    .returning()
  if (!record) throw new Error('client upsert failed')
  return { record, holder }
}

/** A move the client asked for that still waits for its answer: it's answered first (B-21, B-26). */
export async function assertNoWaitingMove(db: Queryable, b: BookingRow, now: number): Promise<void> {
  const [waiting] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.rescheduleOf, b.id), awaitingAnswer(now)))
  if (waiting) throw new ApiError('move_waiting')
}
