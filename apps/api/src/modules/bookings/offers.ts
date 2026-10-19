/**
 * Offered times as the client sees them (book Q-159, Q-264): each with its one specialist, and whether it can still be
 * taken — `past` once it starts earlier than now plus the lead time, `taken` once that specialist isn't free then.
 */
import type { OfferedTime } from '@yeral/contract/bookings'
import { findAppointmentSlot } from '@yeral/domain/availability'
import { offerPast } from '@yeral/domain/lifecycle'
import { eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, type TimeSlot } from '../../db/schema'
import { appointmentContext, loadBusy, type LoadedBusiness } from '../availability/context'
import type { BookingRow } from './repo'

export async function offeredTimes(
  db: Queryable,
  lb: LoadedBusiness,
  from: BookingRow,
  offers: readonly TimeSlot[],
  now: number,
): Promise<OfferedTime[]> {
  if (!offers.length) return []
  const staffOf = (id: string | null | undefined) => {
    const s = id ? lb.staff.find((x) => x.id === id) : undefined
    return s ? { id: s.id, name: s.name } : null
  }
  const ahead = offers.filter((o) => !offerPast(o, lb.rules.leadMinutes, now))
  let isFree = (_: TimeSlot) => true
  if (from.type === 'appointment' && ahead.length) {
    const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, from.id))
    const serviceIds = items.flatMap((i) => (i.serviceId ? [i.serviceId] : []))
    const dates = ahead.map((o) => o.date).sort()
    const ctx = appointmentContext(lb, await loadBusy(db, [lb.business.id], dates[0]!, dates.at(-1)!), now)
    isFree = (o) =>
      !!findAppointmentSlot(
        ctx,
        // an offer from before offers named a specialist goes to anyone free, as taking it does
        { date: o.date, serviceIds, staffId: o.staffId ?? null, by: 'client', oneSpecialist: !!o.staffId },
        o.start,
      )
  }
  return offers.map((o) => ({
    date: o.date,
    start: o.start,
    end: o.end,
    staff: staffOf(o.staffId),
    state: offerPast(o, lb.rules.leadMinutes, now) ? 'past' : isFree(o) ? 'free' : 'taken',
  }))
}
