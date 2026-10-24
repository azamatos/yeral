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
  yearlyNightOverlaps,
  type BusinessHours,
  type DateException,
} from '@yeral/domain/hours'
import { occupiesSlot } from '@yeral/domain/lifecycle'
import type { Locale } from '@yeral/domain/model'
import { addDays, epochOf, today } from '@yeral/domain/time'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import type { Deps } from '../../deps'
import { ApiError, invalid, type Issue } from '../../http/errors'
import { emit } from '../../notify'
import { loadHours } from '../availability/context'
import { affectedDetails, bookedServices, cancelForBusiness, declineForBusiness } from '../bookings/engine'
import { alternativesContext, pickAlternatives } from '../bookings/offers'
import { itemsOfBookings, lockBooking, StaleBooking, stateOf, type BookingRow } from '../bookings/repo'
import { bookingsAhead, saveHours } from './repo'

type HoursView = z.infer<typeof businessHoursSettingsSchema>
type HoursChange = z.infer<typeof businessHoursUpdateSchema>

const viewOf = (b: BusinessHours): HoursView => ({
  hours: b.hours.map((d) => (d ? { open: d.open, close: d.close, break: d.break ?? null } : null)),
  specialDays: b.exceptions.map((e) => ({ name: e.name, from: e.from, to: e.to, yearly: e.yearly, hours: e.hours ?? null })),
})

export async function hoursOf(db: Queryable, businessId: string): Promise<HoursView> {
  return viewOf(await loadHours(db, businessId))
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
    // its neighbours this time, special days included; a yearly day falls on any weekday some year, so all of them too
    if (d.hours && (nightOverlaps(next, addDays(d.from, -1), d.to).length || (d.yearly && yearlyNightOverlaps(next.hours, d.hours))))
      issues.push({ path: ['specialDays', i, 'hours'], code: 'overlaps_next_day' })
  }
  if (issues.length) throw invalid(...issues)
  return next
}

/**
 * The bookings ahead the change leaves outside the hours, on the dates it changes: what the team keeps or cancels
 * (Q-211). One kept after an earlier change isn't asked about again until a later change touches its day. Appointments
 * and tables; a waiting move is answered on its own.
 */
async function affectedBy(db: Queryable, businessId: string, was: BusinessHours, next: BusinessHours, now: number): Promise<BookingRow[]> {
  return (await bookingsAhead(db, businessId, now))
    .filter((b) => occupiesSlot(stateOf(b), now) && epochOf(b.date, b.start) >= now)
    .filter((b) => hoursChangedOn(was, next, b.date) && !withinHours(next, b.date, { start: b.start, end: b.end }))
    .sort((a, b) => epochOf(a.date, a.start) - epochOf(b.date, b.start))
}

/** "Şu günlere 3 ýazylyş bar — Aýna 2, Maral 1" (most first), and each booking with its client, services and specialists. */
async function detailsOf(db: Queryable, rows: readonly BookingRow[], lang: Locale): Promise<BookingsAffectedDetails> {
  return affectedDetails(
    rows,
    await itemsOfBookings(
      db,
      rows.map((r) => r.id),
    ),
    lang,
  )
}

/**
 * "Ýatyr we müşderilere 3 başga wagt hödürle": each booking cancelled by the business with the special day's name (or
 * "The opening hours changed"), a waiting request declined, with up to 3 free times under the new hours. The business and its busy time load once;
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
    // undone or changed meanwhile: left as it is now
    let row: BookingRow
    try {
      row = await lockBooking(tx, b.id)
    } catch (e) {
      if (e instanceof StaleBooking) continue
      throw e
    }
    // moved back inside the hours meanwhile (a move confirmed): it stays
    if (
      !occupiesSlot(stateOf(row), now) ||
      epochOf(row.date, row.start) < now ||
      withinHours(next, row.date, { start: row.start, end: row.end })
    )
      continue
    let offers: BookingRow['declineAlternatives'] = []
    if (ctx && row.type === 'appointment') {
      // read under its lock: a move confirmed meanwhile may have changed them
      const picked = pickAlternatives(ctx, row, await bookedServices(tx, row.id), exclude)
      offers = picked.offers
      ctx = { ...ctx, busy: [...ctx.busy, ...picked.held] }
    }
    const special = findException(next.exceptions, row.date)
    // a request is declined, not cancelled (B-27), with the day's name or "this time isn't free"
    if (row.status === 'pending')
      await declineForBusiness(tx, row, at, {
        reason: special ? 'other' : 'slot_busy',
        text: special?.name ?? null,
        offers,
      })
    else await cancelForBusiness(tx, row, at, { reason: special ? 'closed' : 'hours', text: special?.name ?? null, offers })
    cancelled++
  }
  return cancelled
}

/**
 * Save the week and the special days. Bookings ahead the change leaves outside the hours: without a choice it's 409
 * `bookings_affected` listing them and nothing is saved; `keep` saves and leaves them; `cancel` saves and cancels each
 * with offered times. The list names the services in `lang`, the reader's.
 */
export async function updateHours(
  deps: Deps,
  businessId: string,
  change: HoursChange,
  lang: Locale,
): Promise<HoursView & { cancelled: number }> {
  return deps.db.transaction(async (tx) => {
    const now = deps.now()
    // one save at a time, read against the hours it replaces. Every way a booking takes its time reads the hours
    // `for share` (`lockedHours`) and waits for this; plain references (an event, a booking's row) don't
    const b = await loadHours(tx, businessId, { lock: 'no key update' })
    const next = checkChange(change, b.exceptions, today(now))
    const affected = await affectedBy(tx, businessId, b, next, now)
    if (affected.length && !change.affected) throw new ApiError('bookings_affected', await detailsOf(tx, affected, lang))
    await saveHours(tx, businessId, next)
    await emit(tx, { type: 'business.updated', businessId })
    const cancelled = change.affected === 'cancel' && affected.length ? await cancelWithOffers(tx, businessId, affected, next, now) : 0
    return { ...viewOf(next), cancelled }
  })
}
