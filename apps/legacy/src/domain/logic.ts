/**
 * Booking rules ported from the prototype (app/src/data/logic.ts), generalised to many salons:
 * opening hours with exceptions, staff schedules, buffer, minimum lead time, booking window.
 * In production these run on the backend (availability endpoint); the mock API calls them directly.
 */
import type { Booking, DateException, DayHours, Salon, Service, Staff, ViewStatus } from './types'
import { addDays, dow, minutesUntil, nowMin, today, diffDays } from './time'

/** Everything the rules need to know about the world. The mock DB implements it. */
export interface World {
  salon(id: string): Salon
  staff(id: string): Staff
  staffOf(salonId: string): Staff[]
  service(id: string): Service
  servicesOf(salonId: string): Service[]
  /** all bookings of one staff member on one day (any status) */
  dayBookings(staffId: string, date: string): Booking[]
  /** slots held by pending reschedule proposals */
  holds(staffId: string, date: string): { start: number; dur: number; bookingId: string }[]
}

export function viewStatus(b: Pick<Booking, 'status' | 'date' | 'start' | 'dur'>): ViewStatus {
  if (b.status === 'confirmed' && minutesUntil(b.date, b.start + b.dur) <= 0) return 'done'
  if (b.status === 'pending' && minutesUntil(b.date, b.start) <= 0) return 'expired'
  return b.status
}

export const isActive = (b: Pick<Booking, 'status'>) => b.status === 'pending' || b.status === 'confirmed'

function inException(e: DateException, date: string): boolean {
  if (!e.yearly) return date >= e.from && date <= e.to
  const md = date.slice(5)
  const from = e.from.slice(5)
  const to = e.to.slice(5)
  // a yearly range can wrap around New Year (31 Dec – 2 Jan)
  return from <= to ? md >= from && md <= to : md >= from || md <= to
}

export function salonHours(sal: Pick<Salon, 'hours' | 'exceptions'>, date: string): DayHours {
  if (sal.exceptions.some((e) => inException(e, date))) return null
  return sal.hours[dow(date)]
}

/** null when open that day, otherwise the exception name or 'dayoff' */
export function salonClosedReason(sal: Pick<Salon, 'hours' | 'exceptions'>, date: string): string | null {
  const ex = sal.exceptions.find((e) => inException(e, date))
  if (ex) return ex.name
  return sal.hours[dow(date)] ? null : 'dayoff'
}

export function staffHours(sal: Salon, st: Staff, date: string): DayHours {
  const base = salonHours(sal, date)
  if (!base) return null
  if (st.exceptions.some((e) => inException(e, date))) return null
  if (!st.schedule) return base
  const own = st.schedule[dow(date)]
  if (!own) return null
  const open = Math.max(base.open, own.open)
  const close = Math.min(base.close, own.close)
  return close > open ? { open, close } : null
}

/** null when working; 'salon-closed' | 'dayoff' | exception name otherwise */
export function staffOffReason(sal: Salon, st: Staff, date: string): string | null {
  const r = salonClosedReason(sal, date)
  if (r) return r === 'dayoff' ? 'salon-closed' : r
  const ex = st.exceptions.find((e) => inException(e, date))
  if (ex) return ex.name
  if (st.schedule && !st.schedule[dow(date)]) return 'dayoff'
  return null
}

export function bookableStaff(w: World, salonId: string): Staff[] {
  return w.staffOf(salonId).filter((x) => x.active && x.bookable && x.services.length > 0)
}

export function staffDoing(w: World, salonId: string, serviceIds: string[]): Staff[] {
  return bookableStaff(w, salonId).filter((st) => serviceIds.every((id) => st.services.includes(id)))
}

/** Free start times for one staff member. Buffer and minimum lead time are applied silently. */
export function freeSlots(w: World, staffId: string, date: string, dur: number, excludeId?: string): number[] {
  const st = w.staff(staffId)
  const sal = w.salon(st.salonId)
  const h = staffHours(sal, st, date)
  if (!h) return []
  const t = today()
  if (date < t) return []
  if (diffDays(date, t) > sal.rules.windowDays) return []
  const buf = sal.rules.buffer
  const busy: (readonly [number, number])[] = w
    .dayBookings(staffId, date)
    .filter((b) => isActive(b) && b.id !== excludeId)
    .map((b) => [b.start, b.start + b.dur + buf] as const)
  w.holds(staffId, date).forEach((p) => p.bookingId !== excludeId && busy.push([p.start, p.start + p.dur + buf]))
  const minStart = date === t ? nowMin() + sal.rules.minLead : 0
  const cands = new Set<number>()
  for (let m = h.open; m + dur <= h.close; m += 30) cands.add(m)
  busy.forEach(([, end]) => {
    const m = Math.ceil(end / 15) * 15
    if (m + dur <= h.close && m >= h.open) cands.add(m)
  })
  return [...cands]
    .filter((m) => m >= minStart && busy.every(([bs, be]) => m + dur + buf <= bs || m >= be))
    .sort((a, b) => a - b)
}

/** All windows of a salon for a set of services, with who is free at each one. */
export function salonSlots(w: World, salonId: string, serviceIds: string[], date: string, dur: number) {
  const map = new Map<number, string[]>()
  staffDoing(w, salonId, serviceIds).forEach((st) => {
    freeSlots(w, st.id, date, dur).forEach((m) => map.set(m, [...(map.get(m) ?? []), st.id]))
  })
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([start, staff]) => ({ start, staff }))
}

export type FreeSlot = { date: string; start: number; staffId: string }

export function nextFree(w: World, staffIds: string[], dur: number, from = today(), days = 21): FreeSlot | null {
  for (let i = 0; i <= days; i++) {
    const date = addDays(from, i)
    let best: FreeSlot | null = null
    for (const id of staffIds) {
      const f = freeSlots(w, id, date, dur)[0]
      if (f !== undefined && (!best || f < best.start)) best = { date, start: f, staffId: id }
    }
    if (best) return best
  }
  return null
}

/** Is the salon open right now; if not, when does it open next. */
export function openState(sal: Pick<Salon, 'hours' | 'exceptions'>): { open: true; until: number } | { open: false; inDays: number; at: number } | { open: false; inDays: null } {
  const t = today()
  const nm = nowMin()
  const h = salonHours(sal, t)
  if (h && nm >= h.open && nm < h.close) return { open: true, until: h.close }
  for (let i = h && nm < h.open ? 0 : 1; i < 8; i++) {
    const hh = salonHours(sal, addDays(t, i))
    if (hh) return { open: false, inDays: i, at: hh.open }
  }
  return { open: false, inDays: null }
}

export function cancelDeadline(cancelHours: number, b: Pick<Booking, 'date' | 'start'>): { date: string; min: number } {
  let m = b.start - cancelHours * 60
  let date = b.date
  while (m < 0) {
    m += 1440
    date = addDays(date, -1)
  }
  return { date, min: m }
}

export function svcSummary(b: Pick<Booking, 'services'>): string {
  if (b.services.length === 1) return b.services[0].name
  return b.services.map((x, i) => (i ? x.name.toLowerCase() : x.name)).join(' + ')
}
