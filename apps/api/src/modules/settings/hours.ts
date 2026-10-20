/**
 * Opening hours and special days (book B-39, B-40): the week with one break a day, and holidays or unusual days,
 * closed or on other hours. A change that leaves bookings ahead outside the hours asks the team first (book Q-211):
 * keep them, or cancel them with up to 3 other times offered to each client. New bookings follow the new hours either
 * way.
 */
import type { bookingsAffectedDetailsSchema, businessHoursSettingsSchema, businessHoursUpdateSchema } from '@yeral/contract/settings'
import { findException, specialDayErrors, weekHoursErrors, withinHours, type BusinessHours, type DateException } from '@yeral/domain/hours'
import { occupiesSlot } from '@yeral/domain/lifecycle'
import { addDays, epochOf, today } from '@yeral/domain/time'
import { and, eq, gte, inArray, isNull, ne } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, businesses } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit, queueOutcomeSms } from '../../notify'
import { dropPendingMove } from '../bookings/actions'
import { freeAlternatives } from '../bookings/offers'
import { lockBooking, setStatus, stateOf, type BookingRow } from '../bookings/repo'
import { unheardUntil } from '../calendar/service'

type HoursView = z.infer<typeof businessHoursSettingsSchema>
type HoursChange = z.infer<typeof businessHoursUpdateSchema>
type AffectedDetails = z.infer<typeof bookingsAffectedDetailsSchema>

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
 * The week and the special days as the domain checks them (`weekHoursErrors`, `specialDayErrors`). A special day the
 * business saved before stays as it is; a new one that isn't yearly can't start in the past ("Geçen güni saýlap
 * bolmaýar").
 */
function checkChange(change: HoursChange, stored: readonly DateException[], todayDate: string): BusinessHours {
  const next: BusinessHours = {
    hours: change.hours.map((d) => (d ? { open: d.open, close: d.close, break: d.break } : null)),
    exceptions: change.specialDays.map((d) => ({ name: d.name, from: d.from, to: d.to, yearly: d.yearly, hours: d.hours })),
  }
  const issues: { path: (string | number)[]; code: string }[] = weekHoursErrors(next.hours).map((i) => ({
    path: ['hours', i],
    code: 'invalid',
  }))
  next.exceptions.forEach((d, i) => {
    for (const field of specialDayErrors(d)) issues.push({ path: ['specialDays', i, field], code: 'invalid' })
    if (!d.yearly && d.from < todayDate && !stored.some((s) => sameDay(s, d)))
      issues.push({ path: ['specialDays', i, 'from'], code: 'past' })
  })
  if (issues.length) throw new ApiError('validation_error', { issues })
  return next
}

/**
 * The bookings ahead that were inside the hours and aren't any more: what the team keeps or cancels (Q-211). One kept
 * after an earlier change isn't asked about again. Appointments and tables; a waiting move is answered on its own.
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
    .filter((b) => {
      const visit = { start: b.start, end: b.end }
      return withinHours(was, b.date, visit) && !withinHours(next, b.date, visit)
    })
    .sort((a, b) => epochOf(a.date, a.start) - epochOf(b.date, b.start))
}

/** "Şu günlere 3 ýazylyş bar — Aýna 2, Maral 1", and each booking with its client and specialists. */
async function detailsOf(db: Queryable, rows: readonly BookingRow[]): Promise<AffectedDetails> {
  const items = await db
    .select({ bookingId: bookingItems.bookingId, staffId: bookingItems.staffId, staffName: bookingItems.staffName })
    .from(bookingItems)
    .where(
      inArray(
        bookingItems.bookingId,
        rows.map((r) => r.id),
      ),
    )
  const byStaff = new Map<string, { staffId: string; name: string; bookings: Set<string> }>()
  for (const i of items) {
    if (!i.staffId) continue
    const s = byStaff.get(i.staffId) ?? { staffId: i.staffId, name: i.staffName ?? '', bookings: new Set<string>() }
    s.bookings.add(i.bookingId)
    byStaff.set(i.staffId, s)
  }
  return {
    count: rows.length,
    byStaff: [...byStaff.values()].map((s) => ({ staffId: s.staffId, name: s.name, count: s.bookings.size })),
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
 * "Ýatyr we müşderilere 3 başga wagt hödürle": cancelled by the business with the special day's name (or "the opening
 * hours changed") and up to 3 free times under the new hours, which the client takes in one tap; the SMS lists them. A
 * booking the client hasn't heard of yet (the team's, its undo still running) is cancelled without one. False when the
 * booking changed meanwhile.
 */
async function cancelWithOffers(tx: Queryable, b: BookingRow, next: BusinessHours, now: number): Promise<boolean> {
  const row = await lockBooking(tx, b.id)
  if (!occupiesSlot(stateOf(row), now) || epochOf(row.date, row.start) < now) return false
  const at = new Date(now)
  if (row.status === 'confirmed') await dropPendingMove(tx, row, at, 'business')
  const special = findException(next.exceptions, row.date)
  const cancelled = await setStatus(tx, row, {
    status: 'cancelled',
    cancelledBy: 'business',
    cancelReason: special?.name ?? null,
    businessCancelReason: special ? 'closed' : 'hours',
    at,
  })
  // the free times as they are now: the new hours saved, this booking's own time freed
  const offers = await freeAlternatives(tx, cancelled, now)
  await tx.update(bookings).set({ declineAlternatives: offers }).where(eq(bookings.id, cancelled.id))
  await emit(tx, {
    type: 'booking.cancelled',
    businessId: cancelled.businessId,
    bookingId: cancelled.id,
    bookingCode: cancelled.code,
    userId: cancelled.userId,
  })
  if (cancelled.clientPhone && unheardUntil(row, now) === null) await queueOutcomeSms(tx, 'cancelledOffers', cancelled, cancelled.id, at)
  return true
}

/**
 * Save the week and the special days. Bookings ahead the change leaves outside the hours: without a choice it's 409
 * `bookings_affected` listing them and nothing is saved; `keep` saves and leaves them; `cancel` saves and cancels each
 * with offered times.
 */
export async function updateHours(deps: Deps, businessId: string, change: HoursChange): Promise<HoursView & { cancelled: number }> {
  return deps.db.transaction(async (tx) => {
    const now = deps.now()
    // one save at a time: the bookings a change affects are read against the hours it replaces
    const [b] = await tx
      .select({ hours: businesses.hours, exceptions: businesses.exceptions })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .for('update')
    if (!b) throw new ApiError('not_found')
    const next = checkChange(change, b.exceptions, today(now))
    const affected = await affectedBy(tx, businessId, b, next, now)
    if (affected.length && !change.affected) throw new ApiError('bookings_affected', await detailsOf(tx, affected))
    await tx
      .update(businesses)
      .set({ hours: next.hours, exceptions: [...next.exceptions] })
      .where(eq(businesses.id, businessId))
    await emit(tx, { type: 'business.updated', businessId })
    let cancelled = 0
    if (change.affected === 'cancel') for (const row of affected) if (await cancelWithOffers(tx, row, next, now)) cancelled++
    return { ...viewOf(next), cancelled }
  })
}
