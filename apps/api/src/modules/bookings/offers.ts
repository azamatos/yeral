/**
 * Offered times as the client sees them (book Q-159, Q-264): each with its one specialist, and whether it can still be
 * taken — `past` once it starts earlier than now plus the lead time, `taken` once taking it would fail. The check asks
 * the same question as taking it (`rebookQueries`).
 */
import type { OfferedTime } from '@yeral/contract/bookings'
import { findAppointmentSlot, type BusyInterval } from '@yeral/domain/availability'
import { offerPast } from '@yeral/domain/lifecycle'
import { inArray } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { staff, type TimeSlot } from '../../db/schema'
import { appointmentContext, loadBusy, type LoadedBusiness } from '../availability/context'
import { bookedServices, rebookQueries } from './create'
import type { BookingRow } from './repo'

/** Where taking an offered time books: its named specialist, or (an offer made before offers named one) as a move. */
export const offerTarget = (o: TimeSlot) => ({ date: o.date, start: o.start, ...(o.staffId ? { staffId: o.staffId } : {}) })

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
    isFree = (o) => rebookQueries(booked, offerTarget(o)).some((q) => !!findAppointmentSlot(ctx, q, o.start))
  }
  return offers.map((o) => ({
    date: o.date,
    start: o.start,
    end: o.end,
    staff: names.find((n) => n.id === o.staffId) ?? null,
    state: offerPast(o, lb.rules.leadMinutes, now) ? 'past' : isFree(o) ? 'free' : 'taken',
  }))
}
