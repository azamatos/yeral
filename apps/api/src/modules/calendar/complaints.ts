/**
 * "Arz et" (book B-28, Q-206, Q-207, Q-254): the team records that a client didn't come, came late, was rude, or
 * something else, one per booking. "Gelmedi" makes the booking a no-show, which the client sees and which counts toward
 * the phone-only limit (book Q-127; worked out from the no-shows, `clients/online.ts`); the others stay with the team,
 * on the client card. A mistaken one is taken back within 7 days, the no-show going back to the visit it was, with no
 * word to the client.
 */
import type { complaintInputSchema } from '@yeral/contract/calendar'
import { canComplain, canRemoveComplaint, statusWithoutNoShow } from '@yeral/domain/lifecycle'
import { canOn, type Actor } from '@yeral/domain/permissions'
import { and, eq } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookings } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { guard, itemsOf, setStatus, stateOf, type BookingRow } from '../bookings/repo'
import type { Business } from './repo'

type ComplaintInput = z.infer<typeof complaintInputSchema>

/**
 * The booking, locked: one the reader can't see is 404; one they see but may not mark ("mark no-shows and complain":
 * a specialist their own) 403.
 */
async function complaintBooking(tx: Queryable, business: Business, actor: Actor, code: string): Promise<BookingRow> {
  const [b] = await tx
    .select()
    .from(bookings)
    .where(and(eq(bookings.businessId, business.id), eq(bookings.code, code)))
    .for('update')
  if (!b) throw new ApiError('not_found')
  const staffIds = (await itemsOf(tx, b.id)).flatMap((i) => (i.staffId ? [i.staffId] : []))
  if (!canOn(actor, 'calendar', staffIds)) throw new ApiError('not_found')
  if (!canOn(actor, 'noshow', staffIds)) throw new ApiError('forbidden')
  return b
}

/**
 * File one: "Gelmedi" from the visit's start until 24 hours after its end, taking the place of a complaint of another
 * kind; "Gijä galdy" from the start; rude and other any time, on a confirmed or completed booking (`canComplain`).
 */
export async function fileComplaint(deps: Deps, business: Business, actor: Actor, code: string, input: ComplaintInput): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const now = deps.now()
    const at = new Date(now)
    const b = await complaintBooking(tx, business, actor, code)
    guard(canComplain(stateOf(b), input.type, now))
    const complaint = { complaintType: input.type, complaintText: input.text ?? null, complaintAt: at, complaintBy: actor.staffId }
    if (input.type === 'noshow') {
      // "Gelmediňiz diýlip bellendi": the client sees it, and it counts toward the phone-only limit
      const row = await setStatus(tx, b, { status: 'noshow', at })
      await tx.update(bookings).set(complaint).where(eq(bookings.id, row.id))
      await emit(tx, { type: 'booking.noshow', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
      return
    }
    await tx.update(bookings).set(complaint).where(eq(bookings.id, b.id))
    // the team's only
    await emit(tx, { type: 'booking.updated', businessId: b.businessId, bookingId: b.id, bookingCode: b.code, userId: null })
  })
}

/** Take back a mistaken one within 7 days (Q-207): a no-show is the visit it was again, completed once it ended. */
export async function removeComplaint(deps: Deps, business: Business, actor: Actor, code: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const now = deps.now()
    const at = new Date(now)
    const b = await complaintBooking(tx, business, actor, code)
    guard(canRemoveComplaint({ complaintType: b.complaintType, complaintAt: b.complaintAt?.getTime() ?? null }, now))
    const cleared = { complaintType: null, complaintText: null, complaintAt: null, complaintBy: null }
    if (b.status === 'noshow') {
      const status = statusWithoutNoShow(b, now)
      const row = await setStatus(tx, b, { status, at })
      // a visit still under way isn't finished
      await tx
        .update(bookings)
        .set({ ...cleared, ...(status === 'confirmed' ? { completedAt: null } : {}) })
        .where(eq(bookings.id, row.id))
      // the client's screens show it as it was, with no message
      await emit(tx, { type: 'booking.updated', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
      return
    }
    await tx.update(bookings).set(cleared).where(eq(bookings.id, b.id))
    await emit(tx, { type: 'booking.updated', businessId: b.businessId, bookingId: b.id, bookingCode: b.code, userId: null })
  })
}
