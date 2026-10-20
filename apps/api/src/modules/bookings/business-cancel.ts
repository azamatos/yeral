/**
 * A booking cancelled by the business, the same on every path that does it: the team's cancel (B-27) and closing over
 * bookings, with offered times (B-39, B-40).
 */
import { cancelledByFor, NEW_BOOKING_UNDO_MS } from '@yeral/domain/lifecycle'
import type { BusinessCancelReason } from '@yeral/domain/model'
import { eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, type TimeSlot } from '../../db/schema'
import { emit, queueOutcomeSms } from '../../notify'
import { dropPendingMove } from './actions'
import { setStatus, type BookingRow } from './repo'

/** A booking the team just added that the client hasn't heard of yet: "Yzyna al" still runs, its SMS waits (B-24). */
export const unheardUntil = (b: BookingRow, now: number): number | null => {
  const until = b.createdAt.getTime() + NEW_BOOKING_UNDO_MS
  return (b.source === 'phone' || b.source === 'walkin') && now < until ? until : null
}

/**
 * Cancel `row` for the business (the caller holds its lock and checked it may be): "The client called to cancel" as the
 * client's own cancel, the others as the business's with the reason (`text`: the words for "Other", a special day's
 * name). A move the client asked for goes with it. `offers`, when the business closed over it, are the times the client
 * takes in one tap. The client hears it by SMS, unless they never heard of the booking.
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
  if (cancelled.clientPhone && unheardUntil(row, at.getTime()) === null)
    await queueOutcomeSms(
      tx,
      c.offers ? 'cancelledOffers' : cancelledBy === 'client' ? 'cancelledAsAsked' : 'cancelled',
      cancelled,
      cancelled.id,
      at,
    )
  return cancelled
}
