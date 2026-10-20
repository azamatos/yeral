/**
 * A booking cancelled by the business, the same on every path that does it: the team's cancel (B-27) and closing over
 * bookings, with offered times (B-39, B-40).
 */
import { cancelledByFor, isConfirmationNews, NEW_BOOKING_SMS_AFTER_MS, type NewsQueued } from '@yeral/domain/lifecycle'
import { isTeamSource, type BusinessCancelReason, type DeclineReason } from '@yeral/domain/model'
import { eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, type TimeSlot } from '../../db/schema'
import { emit, queueOutcomeSms } from '../../notify'
import { dropPendingMove } from './actions'
import { newsJobs } from './confirm'
import { setStatus, type BookingRow } from './repo'

/**
 * A booking the team entered that the client has no SMS about yet: its undo may still come, or its confirmation hasn't
 * gone (a runner may hold it, but it finds the booking cancelled and sends nothing). They learned of it on the phone or
 * at the desk, so its cancel doesn't text them either (B-24).
 */
export async function clientUnaware(db: Queryable, b: BookingRow, now: number): Promise<boolean> {
  if (!isTeamSource(b.source)) return false
  if (now < b.createdAt.getTime() + NEW_BOOKING_SMS_AFTER_MS) return true
  return (await newsJobs(db, b.id, { unclaimed: false })).some((j) => isConfirmationNews(j.payload.kind as NewsQueued))
}

/**
 * Decline a new request for the business (the caller holds its lock and checked it's still waiting): the reason the
 * client sees and the times offered (B-20), counted as an answer (book Q-113). The SMS always goes, with the reason.
 */
export async function declineForBusiness(
  tx: Queryable,
  row: BookingRow,
  at: Date,
  d: { reason: DeclineReason; text: string | null; offers: TimeSlot[] },
): Promise<BookingRow> {
  const declined = await setStatus(tx, row, { status: 'cancelled', cancelledBy: 'business', at, answered: true })
  await tx
    .update(bookings)
    .set({ declineReason: d.reason, declineText: d.text, declineAlternatives: d.offers })
    .where(eq(bookings.id, declined.id))
  await emit(tx, {
    type: 'booking.declined',
    businessId: declined.businessId,
    bookingId: declined.id,
    bookingCode: declined.code,
    userId: declined.userId,
  })
  if (declined.clientPhone) await queueOutcomeSms(tx, 'declined', declined, declined.id, at)
  return declined
}

/**
 * Cancel `row` for the business (the caller holds its lock and checked it may be): "The client called to cancel" as the
 * client's own cancel, the others as the business's with the reason (`text`: the words for "Other", a special day's
 * name). A move the client asked for goes with it. `offers`, when the business closed over it, are the times the client
 * takes in one tap. The client hears it by SMS, unless they have no SMS about the booking yet (`clientUnaware`).
 */
export async function cancelForBusiness(
  tx: Queryable,
  row: BookingRow,
  at: Date,
  c: { reason: BusinessCancelReason; text: string | null; offers?: TimeSlot[] },
): Promise<BookingRow> {
  const cancelledBy = cancelledByFor(c.reason)
  if (row.status === 'confirmed') await dropPendingMove(tx, row, at, 'business')
  const cancelled = await setStatus(tx, row, { status: 'cancelled', cancelledBy, cancelReason: c.text, businessCancelReason: c.reason, at })
  if (c.offers) await tx.update(bookings).set({ declineAlternatives: c.offers }).where(eq(bookings.id, cancelled.id))
  await emit(tx, {
    type: 'booking.cancelled',
    businessId: cancelled.businessId,
    bookingId: cancelled.id,
    bookingCode: cancelled.code,
    userId: cancelled.userId,
  })
  if (cancelled.clientPhone && !(await clientUnaware(tx, row, at.getTime())))
    await queueOutcomeSms(
      tx,
      c.offers ? 'cancelledOffers' : cancelledBy === 'client' ? 'cancelledAsAsked' : 'cancelled',
      cancelled,
      cancelled.id,
      at,
    )
  return cancelled
}
