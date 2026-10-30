/**
 * The booking engine's shared pieces (ADR 0017): what both the client's flows (`create.ts`, `actions.ts`) and the
 * team's (`calendar`, `requests`, `settings/hours`) do to a booking the same way. Its items and price, the transaction
 * that turns a lost race into 409 `slot_taken`, the services a booking re-books with, the client's waiting move, and the
 * business declining or cancelling.
 */
import type { BookingsAffectedDetails } from '@yeral/contract/errors'
import type { AppointmentQuery, AppointmentSlot } from '@yeral/domain/availability'
import { aheadAs, cancelledByFor, effectiveStatus, firstSmsFrom, isConfirmationNews, type NewsQueued } from '@yeral/domain/lifecycle'
import { MARKET } from '@yeral/domain/market'
import { isTeamSource, type BusinessCancelReason, type DeclineReason, type Locale } from '@yeral/domain/model'
import { priceTotal } from '@yeral/domain/pricing'
import { epochOf } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, type TimeSlot } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit, queueOutcomeSms } from '../../notify'
import { OutsideHours, type LoadedBusiness } from '../availability/context'
import { servicePrice } from '../catalog/map'
import { newsJobs } from './confirm'
import {
  countAhead,
  isSlotConflict,
  itemsOfBookings,
  recordMoveRefused,
  setStatus,
  StaleBooking,
  stateOf,
  type BookingRow,
  type ItemRow,
} from './repo'
import { teamItemOf } from './team-view'

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
 * the hours no longer hold (`OutsideHours`: a save of the hours just committed), so `alternatives` reads the business
 * as it stands. Inside a transaction: a savepoint.
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
    if (isSlotConflict(e) || e instanceof OutsideHours) throw new ApiError('slot_taken', { alternatives: await alternatives() })
    throw e
  }
}

// ── The services a booking re-books with ──

/** A booking's services in the order they run, and the one specialist doing them all (null when split). */
export interface BookedServices {
  serviceIds: string[]
  /** The one specialist doing them all, or null when split. */
  staffId: string | null
  /**
   * An item whose service row is gone for good (`serviceId` null: a group's or a setup plan's hard delete) is missing
   * from `serviceIds`, so the booking can't be re-booked as it was (`assertRebookable`).
   */
  lost: boolean
}

/** A booking's services and its one specialist, from its items in their order. */
export function bookedFrom(items: readonly Pick<ItemRow, 'serviceId' | 'staffId'>[]): BookedServices {
  const first = items[0]?.staffId ?? null
  return {
    serviceIds: items.flatMap((i) => (i.serviceId ? [i.serviceId] : [])),
    staffId: first && items.every((i) => i.staffId === first) ? first : null,
    lost: items.some((i) => !i.serviceId),
  }
}

/**
 * A booking can be re-booked as it was (a move, an offered time) when every service it holds is on the business's
 * menu as it stands (`services`: the menu's, archived ones off it): one gone for good (`lost`) or one deleted since
 * (archived, book Q-210) means a booking of fewer services, never made; `online`, one no longer booked online here
 * counts too (a move is an online booking; an offered time is just taken, as its chip says).
 */
export function rebookable(
  services: readonly { id: string; online: boolean }[],
  booked: BookedServices,
  opts: { online: boolean },
): boolean {
  if (booked.lost) return false
  return booked.serviceIds.every((id) => {
    const s = services.find((x) => x.id === id)
    return !!s && (!opts.online || s.online)
  })
}

/** `rebookable`, or 409 `not_bookable`: the client's «can't move online». */
export function assertRebookable(lb: LoadedBusiness, booked: BookedServices, opts: { online: boolean }): void {
  if (!rebookable(lb.services, booked, opts)) throw new ApiError('not_bookable')
}

/** `bookedServices` for several bookings in one query. */
export async function bookedServicesOf(db: Queryable, bookingIds: readonly string[]): Promise<Map<string, BookedServices>> {
  const items = await itemsOfBookings(db, bookingIds)
  return new Map(bookingIds.map((id) => [id, bookedFrom(items.filter((i) => i.bookingId === id))]))
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

/** The move waiting for this booking, if any (one at most: a partial unique index). */
export async function waitingMove(db: Queryable, b: Pick<BookingRow, 'id'>): Promise<BookingRow | undefined> {
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

// ── The bookings a change leaves out ──

/** The affected bookings a 409 lists one by one; the count and the counts per specialist cover them all. */
const LISTED = 50

/**
 * `bookings_affected` (B-39, B-40, B-47, B-50): how many, split into bookings and waiting requests as they stand at
 * `now` (`countAhead`), per specialist (most first), and each booking with its status, a request's answer time, its
 * client, each service with who does it (in `lang`, the reader's) and its specialists; `colleagues`, when removing
 * someone, names who could take each one.
 */
export function affectedDetails(
  rows: readonly BookingRow[],
  items: readonly ItemRow[],
  { lang, now }: { lang: Locale; now: number },
  colleagues?: (b: BookingRow, items: readonly ItemRow[]) => { staffId: string; name: string }[],
): BookingsAffectedDetails {
  const byStaff = new Map<string, { staffId: string; name: string; bookings: Set<string> }>()
  for (const i of items) {
    if (!i.staffId) continue
    const s = byStaff.get(i.staffId) ?? { staffId: i.staffId, name: i.staffName ?? '', bookings: new Set<string>() }
    s.bookings.add(i.bookingId)
    byStaff.set(i.staffId, s)
  }
  return {
    count: rows.length,
    counts: countAhead(rows, now),
    byStaff: [...byStaff.values()]
      .map((s) => ({ staffId: s.staffId, name: s.name, count: s.bookings.size }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    bookings: rows.slice(0, LISTED).map((r) => {
      const mine = items.filter((i) => i.bookingId === r.id)
      // the callers list only bookings that hold their time: a waiting request or a confirmed booking
      const request = aheadAs(stateOf(r), now) === 'request'
      return {
        code: r.code,
        date: r.date,
        start: r.start,
        end: r.end,
        status: request ? ('pending' as const) : ('confirmed' as const),
        // one without a hold time runs out at its start (`effectiveStatus`)
        holdUntil: request ? (r.holdUntil?.getTime() ?? epochOf(r.date, r.start)) : null,
        client: r.clientName,
        items: mine.map((i) => teamItemOf(i, lang)),
        staff: [...new Set(mine.flatMap((i) => (i.staffName ? [i.staffName] : [])))],
        ...(colleagues ? { colleagues: colleagues(r, mine) } : {}),
      }
    }),
  }
}

/**
 * A client's waiting move refused by the business (the caller holds the booking's lock, then the move's): the booking
 * keeps its time and says so with the reason, and the client hears it while the visit is ahead (B-21, book Q-289). Its
 * answer isn't counted toward the answer time (book Q-113): it isn't a new request.
 */
export async function refuseMove(
  tx: Queryable,
  original: BookingRow,
  move: BookingRow,
  at: Date,
  reason: { reason: DeclineReason; text: string | null },
): Promise<void> {
  const declined = await setStatus(tx, move, { status: 'cancelled', cancelledBy: 'business', at })
  await emit(tx, {
    type: 'booking.declined',
    businessId: declined.businessId,
    bookingId: declined.id,
    bookingCode: declined.code,
    userId: declined.userId,
  })
  // a move refused before its booking's visit began is recorded and told; after it, neither (recordMoveRefused)
  if ((await recordMoveRefused(tx, original, declined, { by: 'business', ...reason }, at.getTime())) && original.clientPhone)
    await queueOutcomeSms(tx, 'moveRefused', original, declined.id, at)
}
