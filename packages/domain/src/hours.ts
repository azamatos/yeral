/**
 * Opening hours, special days and staff shifts (business spec §8 "Iş wagty", "Aýratyn günler", team schedules).
 *
 * A business day may run past midnight (book Q-105): hours like 18:00–02:00 are `open: 1080, close: 1560`, minutes
 * from the midnight that starts the day, up to 48:00. Everything after midnight still belongs to the day it started:
 * a booking at 01:00 in a bar open 18:00–02:00 on Friday is Friday's, at minute 1500. A day's part past midnight must
 * end by the time the next day opens (`weekHoursErrors`), so no moment belongs to two days.
 */
import { contains, type Interval } from './model'
import { addDays, diffDays, dow, epochOf, localOf } from './time'

/** Minutes in a day; a business day may end up to one more day later. */
export const DAY_MINUTES = 1440
export const MAX_DAY_END = 2 * DAY_MINUTES

/** One weekday's hours, minutes from the day's midnight (close may pass 1440); one optional break ("Arakesme"). */
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

/**
 * The business day that holds now: yesterday's while it still runs past midnight (book Q-105), else today's. A walk-in
 * joins it (B-25), and the team's free times start from it.
 */
export function currentBusinessDate(b: BusinessHours, now: number): string {
  const { date, min } = localOf(now)
  const yesterday = addDays(date, -1)
  const late = businessDay(b, yesterday)
  return late && late.close > DAY_MINUTES + min ? yesterday : date
}

/**
 * Whether a visit still falls inside the business's hours on its date, the break left out (book Q-211): what a change
 * of hours or a special day leaves outside is listed for the business to keep or cancel.
 */
export function withinHours(b: BusinessHours, date: string, visit: Interval): boolean {
  const day = businessDay(b, date)
  return !!day && workingIntervals(day).some((w) => contains(w, visit))
}

/** Whether a date's business day differs between two calendars (its hours, its break, open or not): a change touches it. */
export function hoursChangedOn(a: BusinessHours, b: BusinessHours, date: string): boolean {
  return JSON.stringify(businessDay(a, date)) !== JSON.stringify(businessDay(b, date))
}

/**
 * The dates from `from` to `to` whose part past midnight runs into the next day's opening, as `weekHoursErrors` refuses
 * for the week (book Q-105): no moment may belong to two business days.
 */
export function nightOverlaps(b: BusinessHours, from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const day = businessDay(b, d)
    const next = businessDay(b, addDays(d, 1))
    if (day && next && day.close - DAY_MINUTES > next.open) out.push(d)
  }
  return out
}

/**
 * Whether a yearly special day's other hours could run into a neighbouring day's on some year, whatever weekday it falls
 * on: its part past midnight into a weekday's opening, or a weekday's part past midnight into its opening (book Q-105).
 */
export function yearlyNightOverlaps(week: WeekHours, hours: { open: number; close: number }): boolean {
  return week.some((d) => !!d && (hours.close - DAY_MINUTES > d.open || d.close - DAY_MINUTES > hours.open))
}

/** A special day runs at most a year ("Birnäçe gün": a range of days). */
export const SPECIAL_DAY_MAX_DAYS = 366

/**
 * Problems with a special day (B-40): `to` before `from` or more than a year after it ("Soňy başlangyçdan öň bolup
 * bilmeýär"); other hours that aren't a day's hours (opening a time of day, closing after it, at most a day long and by
 * 48:00). Empty when valid.
 */
export function specialDayErrors(e: Pick<DateException, 'from' | 'to' | 'hours'>): ('to' | 'hours')[] {
  const out: ('to' | 'hours')[] = []
  const days = diffDays(e.to, e.from)
  if (days < 0 || days >= SPECIAL_DAY_MAX_DAYS) out.push('to')
  const h = e.hours
  if (h && (h.open < 0 || h.open >= DAY_MINUTES || h.close <= h.open || h.close > MAX_DAY_END || h.close - h.open > DAY_MINUTES))
    out.push('hours')
  return out
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

/**
 * Whether a visit still falls inside a team member's day (B-47): their shift inside the business day, their breaks
 * and the business's left out, no personal day off. What a change of schedule leaves outside is listed for the owner.
 */
export function withinStaffDay(b: BusinessHours, s: StaffSchedule, date: string, visit: Interval): boolean {
  const day = staffDay(b, s, date)
  return !!day && workingIntervals(day).some((w) => contains(w, visit))
}

/** Whether a date's working day differs between two schedules of one team member: a change touches it. */
export function staffDayChangedOn(b: BusinessHours, was: StaffSchedule, next: StaffSchedule, date: string): boolean {
  return JSON.stringify(staffDay(b, was, date)) !== JSON.stringify(staffDay(b, next, date))
}

/**
 * Problems with a team member's schedule (B-47), each as the field it's in: a shift day whose opening isn't a time of
 * day or whose closing isn't after it (past 48:00 or a full day), a break that isn't a stretch of the day, a personal
 * day off that ends before it starts or runs past a year. Empty when valid.
 */
export function staffScheduleErrors(s: StaffSchedule): string[] {
  const bad: string[] = []
  s.shift?.forEach((h, i) => {
    if (!h) return
    if (!Number.isInteger(h.open) || h.open < 0 || h.open >= DAY_MINUTES) bad.push(`shift.${i}`)
    else if (!Number.isInteger(h.close) || h.close <= h.open || h.close > MAX_DAY_END || h.close - h.open > DAY_MINUTES)
      bad.push(`shift.${i}`)
  })
  s.breaks.forEach((br, i) => {
    if (!br) return
    const day = s.shift?.[i]
    if (br.end <= br.start || br.start < 0 || br.end > MAX_DAY_END || (day && (br.start < day.open || br.end > day.close)))
      bad.push(`breaks.${i}`)
  })
  s.daysOff.forEach((d, i) => {
    for (const field of specialDayErrors({ ...d, hours: null })) bad.push(`daysOff.${i}.${field}`)
  })
  return bad
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
 * ("Arakesme") counts as closed: open until it starts, reopening when it ends. `until` and `at` are minutes of today
 * and may pass 1440 ("02:00-a çenli" at 23:00); after midnight, yesterday's late hours count as today's (minus 1440).
 */
export function openState(b: BusinessHours, now = Date.now()): OpenState {
  const { date } = localOf(now)
  const [first] = openStretches(b, now, now + 8 * DAY_MINUTES * 60_000)
  if (!first) return { open: false, inDays: null }
  if (first.start <= now) return { open: true, until: Math.round((first.end - epochOf(date, 0)) / 60_000) }
  const at = localOf(first.start)
  return { open: false, inDays: diffDays(at.date, date), at: at.min }
}

/**
 * When the business is open between two instants: its working stretches (breaks are closed), from yesterday's business
 * day on (it may run past midnight), as epoch ranges clipped to `[from, to)`, in order and never overlapping (a day's
 * part past midnight is cut where an earlier stretch already counted). One walk for the open state and the hold time.
 */
export function openStretches(b: BusinessHours, from: number, to: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []
  let cursor = from
  for (let date = addDays(localOf(from).date, -1); epochOf(date, 0) < to; date = addDays(date, 1)) {
    const day = businessDay(b, date)
    if (!day) continue
    for (const w of workingIntervals(day)) {
      const start = Math.max(epochOf(date, w.start), cursor)
      const end = Math.min(epochOf(date, w.end), to)
      if (end <= start) continue
      out.push({ start, end })
      cursor = end
    }
  }
  return out
}

/** Minutes the business is open between two instants (its hours, special days and breaks). */
export function openMinutesBetween(b: BusinessHours, from: number, to: number): number {
  return openStretches(b, from, to).reduce((sum, s) => sum + (s.end - s.start) / 60_000, 0)
}

/**
 * Problems with a week of hours, by weekday (0 = Monday): opening isn't a time of day, closing isn't after it or runs
 * past 48:00 or a full day, the break isn't inside the hours, or the part past midnight runs into the next day's
 * opening (Sunday's into Monday's). Empty when valid.
 */
export function weekHoursErrors(week: WeekHours): number[] {
  const bad = new Set<number>()
  week.forEach((h, i) => {
    if (!h) return
    if (!Number.isInteger(h.open) || h.open < 0 || h.open >= DAY_MINUTES) bad.add(i)
    if (!Number.isInteger(h.close) || h.close <= h.open || h.close > MAX_DAY_END || h.close - h.open > DAY_MINUTES) bad.add(i)
    if (h.break && (h.break.start < h.open || h.break.end > h.close || h.break.end <= h.break.start)) bad.add(i)
    const next = week[(i + 1) % 7]
    if (next && h.close - DAY_MINUTES > next.open) bad.add(i)
  })
  return [...bad].sort((a, b) => a - b)
}
