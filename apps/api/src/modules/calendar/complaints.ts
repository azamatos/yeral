/**
 * "Arz et" (book B-28, Q-206, Q-207, Q-254): the team records that a client didn't come, came late, was rude, or
 * something else, one per booking of an appointment. "Gelmedi" makes the booking a no-show, which the client sees and
 * which counts toward the phone-only limit (book Q-127; worked out from the no-shows, `clients/online.ts`); the others
 * stay with the team, on the client card. A mistaken one is taken back within 7 days, the booking as it was: a no-show
 * goes back to the visit it was, and the complaint it took the place of comes back, with no word to the client.
 */
import type { complaintInputSchema } from '@yeral/contract/calendar'
import { canComplain, canRemoveComplaint, statusWithoutNoShow } from '@yeral/domain/lifecycle'
import { scopeOf, type Actor } from '@yeral/domain/permissions'
import { epochOf } from '@yeral/domain/time'
import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import { bookings, type FiledComplaint } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { assertStaffFree, lockedHours } from '../availability/context'
import { dropPendingMove } from '../bookings/engine'
import { guard, isSlotConflict, setStatus, stateOf, type BookingRow } from '../bookings/repo'
import { teamBooking, type Business } from './repo'

type ComplaintInput = z.infer<typeof complaintInputSchema>

const filedOf = (b: BookingRow): FiledComplaint | null =>
  b.complaintType && b.complaintAt ? { type: b.complaintType, text: b.complaintText, at: b.complaintAt.getTime(), by: b.complaintBy } : null

/**
 * File one: "Gelmedi" from the visit's start until 24 hours after its end, taking the place of a complaint of another
 * kind; "Gijä galdy" from the start; rude and other any time, on a confirmed or completed booking (`canComplain`).
 * Whoever may mark the booking's no-shows files it (a specialist on bookings that are all theirs). Classes mark theirs
 * in the class drawer (B-67), and tables come later.
 */
export async function fileComplaint(deps: Deps, business: Business, actor: Actor, code: string, input: ComplaintInput): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const now = deps.now()
    const at = new Date(now)
    const { b } = await teamBooking(tx, business, actor, code, { lock: true, permission: 'noshow' })
    if (b.type !== 'appointment') throw new ApiError('not_bookable')
    guard(canComplain(stateOf(b), input.type, now))
    const complaint = { complaintType: input.type, complaintText: input.text ?? null, complaintAt: at, complaintBy: actor.staffId }
    if (input.type === 'noshow') {
      // a move still waiting ran out at the visit's start (its hold never passes it): settled as the jobs would
      await dropPendingMove(tx, b, at, 'business')
      // "Gelmediňiz diýlip bellendi": the client sees it, and it counts toward the phone-only limit; a complaint it
      // takes the place of is kept for a take-back
      const row = await setStatus(tx, b, {
        status: 'noshow',
        at,
        fields: { ...complaint, complaintBefore: filedOf(b) },
      })
      await emit(tx, { type: 'booking.noshow', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
      return
    }
    await tx
      .update(bookings)
      .set({ ...complaint, updatedAt: at })
      .where(eq(bookings.id, b.id))
    // the team's only
    await emit(tx, { type: 'booking.updated', businessId: b.businessId, bookingId: b.id, bookingCode: b.code, userId: null })
  })
}

/**
 * Take back a mistaken one within 7 days of filing it (Q-207): the owner and administrators any, a specialist those
 * they filed. A no-show is the visit it was again: completed when it ended (at its end, as the jobs would have), or
 * confirmed while it runs, taking its time back only from people still on the team and free (B-50, B-18; the database
 * guards the rest). The complaint it took the place of comes back as it was.
 */
export async function removeComplaint(deps: Deps, business: Business, actor: Actor, code: string): Promise<void> {
  try {
    await deps.db.transaction(async (tx) => {
      const now = deps.now()
      const at = new Date(now)
      // the hours first, as every path that takes time locks them, then the booking
      const hours = await lockedHours(tx, business.id)
      const { b, items } = await teamBooking(tx, business, actor, code, { lock: true, permission: 'noshow' })
      guard(canRemoveComplaint({ complaintType: b.complaintType, complaintAt: b.complaintAt?.getTime() ?? null }, now))
      if (scopeOf(actor, 'noshow') !== 'all' && b.complaintBy !== actor.staffId) throw new ApiError('forbidden')
      const before = b.complaintType === 'noshow' ? b.complaintBefore : null
      const restored = {
        complaintType: before?.type ?? null,
        complaintText: before?.text ?? null,
        complaintAt: before ? new Date(before.at) : null,
        complaintBy: before?.by ?? null,
        complaintBefore: null,
      }
      if (b.status === 'noshow') {
        const status = statusWithoutNoShow(b, now)
        if (status === 'confirmed') await assertStaffFree(tx, hours, b.date, items, { day: false })
        const row = await setStatus(tx, b, {
          status,
          at,
          fields: { ...restored, completedAt: status === 'completed' ? new Date(epochOf(b.date, b.end)) : null },
        })
        // the client's screens show it as it was, with no message
        await emit(tx, {
          type: 'booking.updated',
          businessId: row.businessId,
          bookingId: row.id,
          bookingCode: row.code,
          userId: row.userId,
        })
        return
      }
      await tx
        .update(bookings)
        .set({ ...restored, updatedAt: at })
        .where(eq(bookings.id, b.id))
      await emit(tx, { type: 'booking.updated', businessId: b.businessId, bookingId: b.id, bookingCode: b.code, userId: null })
    })
  } catch (e) {
    // the time was taken meanwhile (another workspace, a booking the database saw first)
    if (isSlotConflict(e)) throw new ApiError('slot_taken', { alternatives: [] })
    throw e
  }
}
