/**
 * Offered times as the client sees them (book Q-159, Q-264): each with its one specialist, and whether it can still be
 * taken — `past` once it starts earlier than now plus the lead time, `taken` once taking it would fail. The check asks
 * the same question as taking it (`rebookQuery`).
 */
import type { OfferedTime } from '@yeral/contract/bookings'
import { findAppointmentSlot, type BusyInterval } from '@yeral/domain/availability'
import { effectiveStatus, offerPast } from '@yeral/domain/lifecycle'
import { inArray } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, staff, type TimeSlot } from '../../db/schema'
import { appointmentContext, loadBusinesses, loadBusy, type LoadedBusiness } from '../availability/context'
import { bookOnlineFor } from '../clients/online'
import { bookedServices, rebookQuery } from './create'
import { bookingRecipient } from './links'
import { stateOf, type BookingRow } from './repo'

/** Where taking an offered time books: its named specialist, or anyone free when it names nobody. */
export const offerTarget = (o: TimeSlot) => ({ date: o.date, start: o.start, staffId: o.staffId ?? null })

/**
 * The declined and expired requests that stay on top of "Upcoming" (book C-25, C-26, C-40): one of their offered times
 * is still ahead (Q-264). They show chips by the detail's rules: appointments only, none taken yet, and after an expiry
 * only while the client may book online. An offer someone else took meanwhile still counts: the row shows it struck
 * through until the times pass.
 */
export async function withOffersAhead(db: Queryable, rows: readonly BookingRow[], now: number): Promise<Set<string>> {
  const offersOf = (r: BookingRow) => (r.declineReason ? r.declineAlternatives : r.cancelledBy === 'system' ? r.expiredAlternatives : [])
  // offers that already started can't count, whatever the lead time: most rows stop here without a query
  const cancelled = rows.filter(
    (r) =>
      r.type === 'appointment' && effectiveStatus(stateOf(r), now).status === 'cancelled' && offersOf(r).some((o) => !offerPast(o, 0, now)),
  )
  if (!cancelled.length) return new Set()
  const ids = cancelled.map((r) => r.id)
  const [taken, businesses] = await Promise.all([
    db.select({ of: bookings.alternativeOf }).from(bookings).where(inArray(bookings.alternativeOf, ids)),
    loadBusinesses(db, [...new Set(cancelled.map((r) => r.businessId))]),
  ])
  const ahead = new Set<string>()
  for (const r of cancelled) {
    const lb = businesses.get(r.businessId)
    if (!lb || taken.some((t) => t.of === r.id)) continue
    if (!offersOf(r).some((o) => !offerPast(o, lb.rules.leadMinutes, now))) continue
    if (!r.declineReason && !(await bookOnlineFor(db, lb, await bookingRecipient(db, r)))) continue
    ahead.add(r.id)
  }
  return ahead
}

export async function offeredTimes(
  db: Queryable,
  lb: LoadedBusiness,
  from: BookingRow,
  offers: readonly TimeSlot[],
  now: number,
): Promise<OfferedTime[]> {
  // tables and classes can't be re-booked online yet (they come after the MVP): no chips that can't be taken
  if (!offers.length || from.type !== 'appointment') return []
  const ids = [...new Set(offers.flatMap((o) => (o.staffId ? [o.staffId] : [])))]
  // removed specialists keep their name on the chip
  const names = ids.length ? await db.select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, ids)) : []
  const ahead = offers.filter((o) => !offerPast(o, lb.rules.leadMinutes, now))
  let isFree = (_: TimeSlot) => false
  if (ahead.length) {
    const booked = await bookedServices(db, from.id)
    // busy time on the offered days only (each load takes the days around it too, for nights past midnight)
    const busy = new Map<string, BusyInterval>()
    for (const date of new Set(ahead.map((o) => o.date)))
      for (const b of await loadBusy(db, [lb.business.id], date, date)) busy.set(`${b.bookingId} ${b.staffId} ${b.date} ${b.start}`, b)
    const ctx = appointmentContext(lb, [...busy.values()], now)
    isFree = (o) => !!findAppointmentSlot(ctx, rebookQuery(booked, offerTarget(o)), o.start)
  }
  return offers.map((o) => ({
    date: o.date,
    start: o.start,
    end: o.end,
    staff: names.find((n) => n.id === o.staffId) ?? null,
    state: offerPast(o, lb.rules.leadMinutes, now) ? 'past' : isFree(o) ? 'free' : 'taken',
  }))
}
