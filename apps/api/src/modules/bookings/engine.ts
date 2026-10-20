/**
 * The booking engine's shared pieces (ADR 0017): what both the client's flows (`create.ts`, `actions.ts`) and the
 * team's (`calendar`, `requests`, `settings/hours`) do to a booking the same way. Its items and price, the transaction
 * that turns a lost race into 409 `slot_taken`, the services a booking re-books with, the client's waiting move, and the
 * business declining or cancelling.
 */
import type { AppointmentQuery, AppointmentSlot } from '@yeral/domain/availability'
import { cancelledByFor, effectiveStatus, firstSmsFrom, isConfirmationNews, type NewsQueued } from '@yeral/domain/lifecycle'
import { MARKET } from '@yeral/domain/market'
import { isTeamSource, type BusinessCancelReason, type DeclineReason } from '@yeral/domain/model'
import { priceTotal } from '@yeral/domain/pricing'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, type TimeSlot } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit, queueOutcomeSms } from '../../notify'
import type { LoadedBusiness } from '../availability/context'
import { servicePrice } from '../catalog/map'
import { newsJobs } from './confirm'
import { isSlotConflict, recordMoveRefused, setStatus, StaleBooking, stateOf, type BookingRow } from './repo'

// ── Items and price ──

/** What an appointment costs: its services' prices added up. */
export function appointmentPrice(lb: LoadedBusiness, slot: AppointmentSlot | undefined) {
  const services = slot?.items.map((it) => lb.services.find((s) => s.id === it.serviceId)) ?? []
  return priceTotal(services.flatMap((s) => (s ? [servicePrice(s)] : [])))
}

/** An appointment's items as rows, each with its service's name and price and its specialist's name as booked. */
export function itemRows(lb: LoadedBusiness, bookingId: string, date: string, slot: AppointmentSlot) {
  return slot.items.map((it, i) => {
    const svc = lb.services.find((s) => s.id === it.serviceId)
    const who = lb.staff.find((s) => s.id === it.staffId)
    return {
      bookingId,
      serviceId: it.serviceId,
      staffId: it.staffId,
      serviceName: svc?.name ?? { [MARKET.defaultLanguage]: '' },
      staffName: who?.name ?? null,
      date,
      start: it.start,
      end: it.end,
      bufferAfter: it.bufferAfter,
      priceType: svc?.priceType ?? ('fixed' as const),
      priceAmount: svc?.priceAmount ?? 0,
      sort: i,
    }
  })
}

/**
 * Run the insert; a race lost to another booking becomes 409 slot_taken with the nearest free times, and so does a time
 * the hours no longer hold (`assertOpenAt`: a save of the hours just committed). Inside a transaction: a savepoint.
 */
export async function inTransaction<T>(
  deps: Deps,
  fn: (tx: Queryable) => Promise<T>,
  alternatives: () => Promise<unknown[]>,
  db: Queryable = deps.db,
): Promise<T> {
  try {
    return await db.transaction(fn)
  } catch (e) {
    const outsideHours = e instanceof ApiError && e.code === 'slot_taken' && !(e.details?.alternatives as unknown[] | undefined)?.length
    if (isSlotConflict(e) || outsideHours) throw new ApiError('slot_taken', { alternatives: await alternatives() })
    throw e
  }
}

// ── The services a booking re-books with ──

/** A booking's services in the order they run, and the one specialist doing them all (null when split). */
export interface BookedServices {
  serviceIds: string[]
  /** The one specialist doing them all, or null when split. */
  staffId: string | null
}

/** `bookedServices` for several bookings in one query. */
export async function bookedServicesOf(db: Queryable, bookingIds: readonly string[]): Promise<Map<string, BookedServices>> {
  const items = bookingIds.length
    ? await db
        .select({ bookingId: bookingItems.bookingId, serviceId: bookingItems.serviceId, staffId: bookingItems.staffId })
        .from(bookingItems)
        .where(inArray(bookingItems.bookingId, [...bookingIds]))
        .orderBy(asc(bookingItems.sort))
    : []
  return new Map(
    bookingIds.map((id) => {
      const mine = items.filter((i) => i.bookingId === id)
      const first = mine[0]?.staffId ?? null
      return [
        id,
        {
          serviceIds: mine.flatMap((i) => (i.serviceId ? [i.serviceId] : [])),
          staffId: first && mine.every((i) => i.staffId === first) ? first : null,
        },
      ]
    }),
  )
}

export async function bookedServices(db: Queryable, bookingId: string): Promise<BookedServices> {
  return (await bookedServicesOf(db, [bookingId])).get(bookingId)!
}

/**
 * Who a re-booked time goes to, never someone else silently (ROUND6 A5, book Q-159): the specialist `to` names, anyone
 * free for null («Islendik hünärmen»), or the booking's own specialist when it names none. A move doesn't count the
 * booking's own time as busy (Q-165). The offered times' state asks the same question.
 */
export function rebookQuery(
  booked: { serviceIds: string[]; staffId: string | null },
  to: { date: string; staffId?: string | null },
  excludeBookingIds?: readonly string[],
): AppointmentQuery {
  const staffId = to.staffId === undefined ? booked.staffId : to.staffId
  // «Islendik» still tries the booking's own specialist first at the same start
  return { date: to.date, serviceIds: booked.serviceIds, by: 'client', staffId, preferStaffId: booked.staffId, excludeBookingIds }
}

// ── The client's waiting move ──

/** The move waiting for this booking, if any. */
async function waitingMove(db: Queryable, b: BookingRow): Promise<BookingRow | undefined> {
  const [m] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.rescheduleOf, b.id), eq(bookings.status, 'pending')))
  return m
}

/**
 * Withdraw a pending move of this booking, if there is one, and tell the business's open screens: the client's (or,
 * when the business cancels the booking, the business's, `by`). One whose hold has run out lapsed unanswered: it's
 * recorded as the jobs would. One the jobs just settled is gone.
 */
export async function dropPendingMove(db: Queryable, b: BookingRow, at: Date, by: 'client' | 'business' = 'client') {
  const m = await waitingMove(db, b)
  if (!m) return
  const lapsed = effectiveStatus(stateOf(m), at.getTime()).status !== 'pending'
  try {
    const row = await setStatus(db, m, { status: 'cancelled', cancelledBy: lapsed ? 'system' : by, at })
    // as the jobs would: the booking says the move wasn't accepted (a cancel and "Yzyna al" keep that)
    if (lapsed) await recordMoveRefused(db, b, row, { by: 'system', reason: null, text: null }, m.holdUntil?.getTime() ?? at.getTime())
    await emit(db, {
      type: lapsed ? 'booking.expired' : 'booking.cancelled',
      businessId: row.businessId,
      bookingId: row.id,
      bookingCode: row.code,
      userId: row.userId,
    })
  } catch (e) {
    if (!(e instanceof StaleBooking)) throw e
  }
}

// ── The business declines or cancels ──

/**
 * A booking the team entered that the client has no SMS about yet: its undo may still come (`firstSmsFrom`), or its
 * confirmation hasn't gone (a runner may hold it, but it finds the booking cancelled and sends nothing). They learned of
 * it on the phone or at the desk, so its cancel doesn't text them either (B-24).
 */
export async function clientUnaware(db: Queryable, b: BookingRow, now: number): Promise<boolean> {
  if (!isTeamSource(b.source)) return false
  if (firstSmsFrom({ source: b.source, createdAt: b.createdAt.getTime() }, now) > now) return true
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
  const declined = await setStatus(tx, row, {
    status: 'cancelled',
    cancelledBy: 'business',
    at,
    answered: true,
    decline: { reason: d.reason, text: d.text },
    offers: d.offers,
  })
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
  const cancelled = await setStatus(tx, row, {
    status: 'cancelled',
    cancelledBy,
    cancelReason: c.text,
    businessCancelReason: c.reason,
    at,
    offers: c.offers,
  })
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
