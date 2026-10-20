/**
 * Opening hours and special days (book B-39, B-40): the week with one break a day, and holidays or unusual days,
 * closed or on other hours. A change that leaves bookings ahead outside the hours asks the team first (book Q-211):
 * keep them, or cancel them with up to 3 other times offered to each client. New bookings follow the new hours either
 * way.
 */
import type { BookingsAffectedDetails } from '@yeral/contract/errors'
import type { businessHoursSettingsSchema, businessHoursUpdateSchema } from '@yeral/contract/settings'
import {
  findException,
  hoursChangedOn,
  nightOverlaps,
  specialDayErrors,
  weekHoursErrors,
  withinHours,
  type BusinessHours,
  type DateException,
} from '@yeral/domain/hours'
import { occupiesSlot } from '@yeral/domain/lifecycle'
import { addDays, epochOf, today } from '@yeral/domain/time'
import { and, asc, eq, gte, inArray, isNull, ne } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, businesses } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { cancelForBusiness } from '../bookings/business-cancel'
import { bookedServices } from '../bookings/create'
import { alternativesContext, pickAlternatives } from '../bookings/offers'
import { lockBooking, stateOf, type BookingRow } from '../bookings/repo'

type HoursView = z.infer<typeof businessHoursSettingsSchema>
type HoursChange = z.infer<typeof businessHoursUpdateSchema>
interface Issue {
  path: (string | number)[]
  code: string
}

/** The affected bookings the 409 lists one by one; the count and the counts per specialist cover them all. */
const LISTED = 50

const viewOf = (b: BusinessHours): HoursView => ({
  hours: b.hours.map((d) => (d ? { open: d.open, close: d.close, break: d.break ?? null } : null)),
  specialDays: b.exceptions.map((e) => ({ name: e.name, from: e.from, to: e.to, yearly: e.yearly, hours: e.hours ?? null })),
})

export async function hoursOf(db: Queryable, businessId: string): Promise<HoursView> {
  const [b] = await db
    .select({ hours: businesses.hours, exceptions: businesses.exceptions })
    .from(businesses)
    .where(eq(businesses.id, businessId))
  if (!b) throw new ApiError('not_found')
  return viewOf(b)
}

const sameDay = (a: DateException, b: DateException) =>
  a.name === b.name &&
  a.from === b.from &&
  a.to === b.to &&
  a.yearly === b.yearly &&
  (a.hours ?? null)?.open === (b.hours ?? null)?.open &&
  (a.hours ?? null)?.close === (b.hours ?? null)?.close

/**
 * The week and the special days as the domain checks them (`weekHoursErrors`, `specialDayErrors`, `nightOverlaps`). A
 * one-off day that has ended is dropped when it was saved before (the list never fills up with them) and refused when
 * it's new ("Geçen güni saýlap bolmaýar"); one under way may still change.
 */
function checkChange(change: HoursChange, stored: readonly DateException[], todayDate: string): BusinessHours {
  const issues: Issue[] = weekHoursErrors(change.hours).map((i) => ({ path: ['hours', i], code: 'invalid' }))
  const exceptions: DateException[] = []
  const kept: number[] = []
  change.specialDays.forEach((d, i) => {
    const day: DateException = { name: d.name, from: d.from, to: d.to, yearly: d.yearly, hours: d.hours }
    const ended = !d.yearly && d.to < todayDate
    if (ended && stored.some((s) => sameDay(s, day))) return
    const problems = specialDayErrors(day)
    for (const field of problems) issues.push({ path: ['specialDays', i, field], code: 'invalid' })
    if (ended) issues.push({ path: ['specialDays', i, 'to'], code: 'past' })
    if (!problems.length) kept.push(i)
    exceptions.push(day)
  })
  const next: BusinessHours = { hours: change.hours.map((d) => (d ? { open: d.open, close: d.close, break: d.break } : null)), exceptions }
  // other hours past midnight may not run into the next day's opening, nor the day before into theirs
  for (const i of kept) {
    const d = change.specialDays[i]!
    if (d.hours && nightOverlaps(next, addDays(d.from, -1), d.to).length)
      issues.push({ path: ['specialDays', i, 'hours'], code: 'overlaps_next_day' })
  }
  if (issues.length) throw new ApiError('validation_error', { issues })
  return next
}

/**
 * The bookings ahead the change leaves outside the hours, on the dates it changes: what the team keeps or cancels
 * (Q-211). One kept after an earlier change isn't asked about again until a later change touches its day. Appointments
 * and tables; a waiting move is answered on its own.
 */
async function affectedBy(db: Queryable, businessId: string, was: BusinessHours, next: BusinessHours, now: number): Promise<BookingRow[]> {
  const rows = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.businessId, businessId),
        eq(bookings.active, true),
        ne(bookings.type, 'class'),
        isNull(bookings.rescheduleOf),
        // yesterday's business day may still run past midnight (book Q-105)
        gte(bookings.date, addDays(today(now), -1)),
      ),
    )
  return rows
    .filter((b) => occupiesSlot(stateOf(b), now) && epochOf(b.date, b.start) >= now)
    .filter((b) => hoursChangedOn(was, next, b.date) && !withinHours(next, b.date, { start: b.start, end: b.end }))
    .sort((a, b) => epochOf(a.date, a.start) - epochOf(b.date, b.start))
}

/** "Şu günlere 3 ýazylyş bar — Aýna 2, Maral 1" (most first), and each booking with its client and specialists. */
async function detailsOf(db: Queryable, rows: readonly BookingRow[]): Promise<BookingsAffectedDetails> {
  const items = await db
    .select({ bookingId: bookingItems.bookingId, staffId: bookingItems.staffId, staffName: bookingItems.staffName })
    .from(bookingItems)
    .where(
      inArray(
        bookingItems.bookingId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(bookingItems.sort))
  const byStaff = new Map<string, { staffId: string; name: string; bookings: Set<string> }>()
  for (const i of items) {
    if (!i.staffId) continue
    const s = byStaff.get(i.staffId) ?? { staffId: i.staffId, name: i.staffName ?? '', bookings: new Set<string>() }
    s.bookings.add(i.bookingId)
    byStaff.set(i.staffId, s)
  }
  return {
    count: rows.length,
    byStaff: [...byStaff.values()]
      .map((s) => ({ staffId: s.staffId, name: s.name, count: s.bookings.size }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    bookings: rows.slice(0, LISTED).map((r) => ({
      code: r.code,
      date: r.date,
      start: r.start,
      end: r.end,
      client: r.clientName,
      staff: [...new Set(items.filter((i) => i.bookingId === r.id).flatMap((i) => (i.staffName ? [i.staffName] : [])))],
    })),
  }
}

/**
 * "Ýatyr we müşderilere 3 başga wagt hödürle": each booking cancelled by the business with the special day's name (or
 * "The opening hours changed") and up to 3 free times under the new hours. The business and its busy time load once;
 * each client's times are held from the next, so no two clients are offered the same time. Returns how many were
 * cancelled (one that changed meanwhile is left).
 */
async function cancelWithOffers(
  tx: Queryable,
  businessId: string,
  rows: readonly BookingRow[],
  next: BusinessHours,
  now: number,
): Promise<number> {
  let ctx = await alternativesContext(tx, businessId, now)
  const exclude = rows.map((r) => r.id)
  const at = new Date(now)
  let cancelled = 0
  for (const b of rows) {
    const row = await lockBooking(tx, b.id)
    if (!occupiesSlot(stateOf(row), now) || epochOf(row.date, row.start) < now) continue
    let offers: BookingRow['declineAlternatives'] = []
    if (ctx && row.type === 'appointment') {
      const picked = pickAlternatives(ctx, row, await bookedServices(tx, row.id), exclude)
      offers = picked.offers
      ctx = { ...ctx, busy: [...ctx.busy, ...picked.held] }
    }
    const special = findException(next.exceptions, row.date)
    await cancelForBusiness(tx, row, at, { reason: special ? 'closed' : 'hours', text: special?.name ?? null, offers })
    cancelled++
  }
  return cancelled
}

/**
 * Save the week and the special days. Bookings ahead the change leaves outside the hours: without a choice it's 409
 * `bookings_affected` listing them and nothing is saved; `keep` saves and leaves them; `cancel` saves and cancels each
 * with offered times.
 */
export async function updateHours(deps: Deps, businessId: string, change: HoursChange): Promise<HoursView & { cancelled: number }> {
  return deps.db.transaction(async (tx) => {
    const now = deps.now()
    // one save at a time, read against the hours it replaces; the weaker lock leaves bookings (which reference the
    // business) going in and out meanwhile
    const [b] = await tx
      .select({ hours: businesses.hours, exceptions: businesses.exceptions })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .for('no key update')
    if (!b) throw new ApiError('not_found')
    const next = checkChange(change, b.exceptions, today(now))
    const affected = await affectedBy(tx, businessId, b, next, now)
    if (affected.length && !change.affected) throw new ApiError('bookings_affected', await detailsOf(tx, affected))
    await tx
      .update(businesses)
      .set({ hours: next.hours, exceptions: [...next.exceptions] })
      .where(eq(businesses.id, businessId))
    await emit(tx, { type: 'business.updated', businessId })
    const cancelled = change.affected === 'cancel' && affected.length ? await cancelWithOffers(tx, businessId, affected, next, now) : 0
    return { ...viewOf(next), cancelled }
  })
}
