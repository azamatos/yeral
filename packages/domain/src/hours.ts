/**
 * Opening hours, special days and staff shifts (business spec §8 "Iş wagty", "Aýratyn günler", team schedules).
 * A business day ends by midnight: hours past midnight are not designed yet (business spec §11).
 */
import type { Interval } from './model'
import { addDays, diffDays, dow, localOf } from './time'

/** One weekday's hours, minutes from midnight; one optional break ("Arakesme"). */
export interface DayHours {
  open: number
  close: number
  break?: Interval | null
}

/** Seven entries, 0 = Monday … 6 = Sunday; null = closed that weekday. */
export type WeekHours = readonly (DayHours | null)[]

/**
 * A special day or range: a holiday, an inventory day, a vacation. `hours` null = closed; otherwise special hours that
 * replace the week's hours (and its break). `yearly` repeats on the same month-days every year.
 */
export interface DateException {
  name: string
  from: string
  to: string
  yearly: boolean
  hours?: { open: number; close: number } | null
}

/** What the rules need to know about a business's calendar. */
export interface BusinessHours {
  hours: WeekHours
  exceptions: readonly DateException[]
}

/**
 * A team member's schedule. `shift` null = the business hours ("Biznes wagty bilen"); otherwise own hours per weekday
 * ("Öz smenasy", null = day off), always inside the business hours. One break per weekday, may differ per day.
 * `daysOff` are personal exceptions (vacation, birthday): always closed.
 */
export interface StaffSchedule {
  shift: readonly ({ open: number; close: number } | null)[] | null
  breaks: readonly (Interval | null)[]
  daysOff: readonly DateException[]
}

/** A working day: when it starts and ends, and the breaks inside it. */
export interface WorkDay {
  open: number
  close: number
  breaks: Interval[]
}

export function inException(e: Pick<DateException, 'from' | 'to' | 'yearly'>, date: string): boolean {
  if (!e.yearly) return date >= e.from && date <= e.to
  const md = date.slice(5)
  const from = e.from.slice(5)
  const to = e.to.slice(5)
  // a yearly range can wrap around New Year (31 Dec – 2 Jan)
  return from <= to ? md >= from && md <= to : md >= from || md <= to
}

/** Days a special day covers (a yearly one in any one year, wrapping New Year). */
function spanDays(e: Pick<DateException, 'from' | 'to' | 'yearly'>): number {
  if (!e.yearly) return diffDays(e.to, e.from)
  const days = diffDays(`2001-${e.to.slice(5)}`, `2001-${e.from.slice(5)}`)
  return days < 0 ? days + 365 : days
}

/**
 * The special day that applies on a date. When several overlap, the most specific wins: a dated one beats a yearly
 * one (the business changed this year's holiday), then the narrower range (short hours on one day inside a longer
 * closure), then closed beats special hours; list order decides only between equals.
 */
export function findException<E extends Pick<DateException, 'from' | 'to' | 'yearly'> & { hours?: DateException['hours'] }>(
  list: readonly E[],
  date: string,
): E | undefined {
  const rank = (e: E) => [e.yearly ? 1 : 0, spanDays(e), e.hours ? 1 : 0]
  const before = (a: E, b: E) => {
    const [x, y] = [rank(a), rank(b)]
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i]! < y[i]!
    return false
  }
  let best: E | undefined
  for (const e of list) if (inException(e, date) && (!best || before(e, best))) best = e
  return best
}

function clipBreak(b: Interval | null | undefined, open: number, close: number): Interval[] {
  if (!b) return []
  const start = Math.max(b.start, open)
  const end = Math.min(b.end, close)
  return end > start ? [{ start, end }] : []
}

/** The business's day, or null when it's closed. */
export function businessDay(b: BusinessHours, date: string): WorkDay | null {
  const ex = findException(b.exceptions, date)
  if (ex) return ex.hours ? { open: ex.hours.open, close: ex.hours.close, breaks: [] } : null
  const h = b.hours[dow(date)]
  if (!h) return null
  return { open: h.open, close: h.close, breaks: clipBreak(h.break, h.open, h.close) }
}

export type ClosedReason = { kind: 'weekly' } | { kind: 'exception'; name: string }

/** Why the business is closed on a date; null when it's open. */
export function businessClosedReason(b: BusinessHours, date: string): ClosedReason | null {
  const ex = findException(b.exceptions, date)
  if (ex) return ex.hours ? null : { kind: 'exception', name: ex.name }
  return b.hours[dow(date)] ? null : { kind: 'weekly' }
}

/** A team member's day: their shift inside the business day, with the business's and their own breaks. */
export function staffDay(b: BusinessHours, s: StaffSchedule, date: string): WorkDay | null {
  const base = businessDay(b, date)
  if (!base) return null
  if (findException(s.daysOff, date)) return null
  let open = base.open
  let close = base.close
  if (s.shift) {
    const own = s.shift[dow(date)]
    if (!own) return null
    open = Math.max(open, own.open)
    close = Math.min(close, own.close)
  }
  if (close <= open) return null
  const breaks = [...base.breaks.flatMap((x) => clipBreak(x, open, close)), ...clipBreak(s.breaks[dow(date)], open, close)]
  return { open, close, breaks: breaks.sort((x, y) => x.start - y.start) }
}

export type StaffOffReason = { kind: 'business-closed'; name?: string } | { kind: 'dayoff' } | { kind: 'exception'; name: string }

/** Why a team member doesn't work on a date ("Dynç güni", a vacation …); null when they work. */
export function staffOffReason(b: BusinessHours, s: StaffSchedule, date: string): StaffOffReason | null {
  const closed = businessClosedReason(b, date)
  if (closed) return closed.kind === 'exception' ? { kind: 'business-closed', name: closed.name } : { kind: 'business-closed' }
  const ex = findException(s.daysOff, date)
  if (ex) return { kind: 'exception', name: ex.name }
  return staffDay(b, s, date) ? null : { kind: 'dayoff' }
}

/** The bookable stretches of a working day: open → close minus the breaks. */
export function workingIntervals(day: WorkDay): Interval[] {
  const out: Interval[] = []
  let cursor = day.open
  for (const br of day.breaks) {
    if (br.start > cursor) out.push({ start: cursor, end: br.start })
    cursor = Math.max(cursor, br.end)
  }
  if (cursor < day.close) out.push({ start: cursor, end: day.close })
  return out
}

export type OpenState = { open: true; until: number } | { open: false; inDays: number; at: number } | { open: false; inDays: null }

/**
 * Is the business open right now ("Häzir açyk · 20:00-a çenli"); if not, when it opens next (within a week). The break
 * ("Arakesme") counts as closed: open until it starts, reopening when it ends.
 */
export function openState(b: BusinessHours, now = Date.now()): OpenState {
  const { date, min } = localOf(now)
  const day = businessDay(b, date)
  const stretches = day ? workingIntervals(day) : []
  const current = stretches.find((w) => min >= w.start && min < w.end)
  if (current) return { open: true, until: current.end }
  const later = stretches.find((w) => w.start > min)
  if (later) return { open: false, inDays: 0, at: later.start }
  for (let i = 1; i < 8; i++) {
    const next = businessDay(b, addDays(date, i))
    if (next) return { open: false, inDays: i, at: next.open }
  }
  return { open: false, inDays: null }
}
