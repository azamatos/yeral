/**
 * Offered times as the client sees them (book Q-159, Q-264): each with its one specialist, and whether it can still be
 * taken — `past` once it starts earlier than now plus the lead time, `taken` once taking it would fail. The check asks
 * the same question as taking it (`rebookQuery`).
 */
import type { OfferedTime } from '@yeral/contract/bookings'
import {
  findAppointmentSlot,
  nearestSlots,
  nextFreeSlot,
  slotStaffId,
  staffDoingAll,
  type AppointmentSlot,
  type BusyInterval,
} from '@yeral/domain/availability'
import { effectiveStatus, MAX_ALTERNATIVES, offerPast } from '@yeral/domain/lifecycle'
import { addDays, epochOf, localOf } from '@yeral/domain/time'
import { inArray } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, staff, type TimeSlot } from '../../db/schema'
import { appointmentContext, loadBusinesses, loadBusy, type LoadedBusiness } from '../availability/context'
import { bookOnlineFor } from '../clients/online'
import { bookedServices, rebookQuery } from './create'
import { recipientOf } from './links'
import { stateOf, type BookingRow } from './repo'

/** Where taking an offered time books: its named specialist, or anyone free when it names nobody. */
export const offerTarget = (o: TimeSlot) => ({ date: o.date, start: o.start, staffId: o.staffId ?? null })

/**
 * The offered times a request has, by one rule for the list, the detail and taking one: after the business declined it,
 * the times it offered; after it ran out, the free times the jobs found (none until they've run). `source` is what the
 * client sends back to take one.
 */
export function offersOf(b: BookingRow, now: number): { source: 'decline' | 'expired'; list: TimeSlot[] } | null {
  const { status, cancelledBy } = effectiveStatus(stateOf(b), now)
  if (status !== 'cancelled') return null
  if (cancelledBy === 'business') return { source: 'decline', list: b.declineAlternatives }
  if (cancelledBy === 'system') return { source: 'expired', list: b.expiredAlternatives }
  return null
}

/**
 * The declined and expired requests that stay on top of "Upcoming" (book C-25, C-26, C-40), each with the start of its
 * soonest offered time that can still be taken. These are the detail's free chips, so a row whose times are all past or
 * taken goes to Past; after an expiry, only while the client may book online, checked as the detail checks it.
 */
export async function withOffersAhead(
  db: Queryable,
  rows: readonly BookingRow[],
  accountPhone: string,
  now: number,
): Promise<Map<string, number>> {
  // most rows stop here without a query: offers that already started can't count, whatever the lead time
  const picked = rows.flatMap((r) => {
    const offers = offersOf(r, now)
    return r.type === 'appointment' && offers?.list.some((o) => !offerPast(o, 0, now)) ? [{ r, offers }] : []
  })
  if (!picked.length) return new Map()
  const [taken, businesses] = await Promise.all([
    db
      .select({ of: bookings.alternativeOf })
      .from(bookings)
      .where(
        inArray(
          bookings.alternativeOf,
          picked.map((p) => p.r.id),
        ),
      ),
    loadBusinesses(db, [...new Set(picked.map((p) => p.r.businessId))]),
  ])
  const takenFrom = new Set(taken.map((t) => t.of))
  // every row is the signed-in client's: one check per business and phone
  const online = new Map<string, Promise<boolean>>()
  const bookOnline = (lb: LoadedBusiness, r: BookingRow) => {
    const phone = recipientOf(r, accountPhone)
    const key = `${lb.business.id} ${phone}`
    const known = online.get(key) ?? bookOnlineFor(db, lb, phone)
    online.set(key, known)
    return known
  }
  const soonest = await Promise.all(
    picked.map(async ({ r, offers }) => {
      const lb = businesses.get(r.businessId)
      if (!lb || takenFrom.has(r.id)) return null
      if (offers.source === 'expired' && !(await bookOnline(lb, r))) return null
      const free = (await offeredTimes(db, lb, r, offers.list, now)).filter((o) => o.state === 'free')
      return free.length ? Math.min(...free.map((o) => epochOf(o.date, o.start))) : null
    }),
  )
  return new Map(picked.flatMap(({ r }, i) => (soonest[i] == null ? [] : [[r.id, soonest[i]] as const])))
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

/**
 * Up to three free times for the same services, as the client would book them: after an expired request, or when the
 * business closes over a booking (B-39, B-40). That day first, then the next free days. Each names one specialist who
 * does every service (book Q-159); at the same start the one booked comes first. Services nobody does alone keep being
 * split between people, and those times name nobody.
 */
export async function freeAlternatives(db: Queryable, b: BookingRow, now: number): Promise<TimeSlot[]> {
  if (b.type !== 'appointment') return []
  const lb = (await loadBusinesses(db, [b.businessId])).get(b.businessId)
  if (!lb) return []
  const booked = await bookedServices(db, b.id)
  if (!booked.serviceIds.length) return []
  const from = localOf(now).date
  const ctx = appointmentContext(lb, await loadBusy(db, [b.businessId], from, addDays(from, lb.rules.windowDays)), now)
  const q = {
    serviceIds: booked.serviceIds,
    staffId: null,
    by: 'client' as const,
    oneSpecialist: staffDoingAll(ctx, booked.serviceIds).length > 0,
    preferStaffId: booked.staffId,
    // still active while this runs: its own time mustn't count as busy
    excludeBookingIds: [b.id],
  }
  const offer = (date: string, s: AppointmentSlot): TimeSlot => ({ date, start: s.start, end: s.end, staffId: slotStaffId(s) })
  const out = nearestSlots(ctx, { ...q, date: b.date }, b.start, MAX_ALTERNATIVES).map((s) => offer(b.date, s))
  // the days after the request's own (strict: never back to it, even when it was last night's)
  for (let day = addDays(b.date, 1); out.length < MAX_ALTERNATIVES;) {
    const next = nextFreeSlot(ctx, q, day, lb.rules.windowDays, { strict: true })
    if (!next) break
    out.push(offer(next.date, next.slot))
    day = addDays(next.date, 1)
  }
  return out.slice(0, MAX_ALTERNATIVES)
}
