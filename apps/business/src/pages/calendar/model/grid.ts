import type { CalendarView } from '@yeral/contract/calendar'
import { addDays } from '@yeral/domain/time'

/** B-Calendar's day grid: an hour is 80 px, a quarter 20 (the rows a click lands on). */
export const HOUR_PX = 80
export const QUARTER_PX = HOUR_PX / 4

const DAY_MINUTES = 1440
/** The hours the grid shows when nobody works that day (the board's 08:00–21:00). */
const QUIET = { from: 8, to: 21 }

type Booking = CalendarView['bookings'][number]
type Move = CalendarView['moves'][number]
type Day = CalendarView['columns'][number]['days'][number]
type Stretch = { start: number; end: number }

/** How a date's minutes sit on this day's grid: as they are, or the night before's after midnight; null for another day. */
function shiftOn(date: string, of: string): number | null {
  return of === date ? 0 : of === addDays(date, -1) ? -DAY_MINUTES : null
}

/** A stretch of a date (a block, time busy elsewhere) on this day's grid: the night before's past midnight too. */
export function stretchOn<T extends { date: string; start: number; end: number }>(date: string, x: T): (T & Stretch) | null {
  const shift = shiftOn(date, x.date)
  return shift === null || x.end + shift <= 0 ? null : { ...x, start: x.start + shift, end: x.end + shift }
}

/**
 * A booking in one person's column: their part of it (`items`; a booking shared with a colleague shows each part in
 * its own column) and where it sits on this day's grid (`start`, `end`). The night before's bookings past midnight
 * (book Q-105) sit at their minutes after it.
 */
export type Placed = { booking: Booking; items: Booking['items']; start: number; end: number }

/** One person's part of a booking or a move on this day's grid: their items, where they start and end on it. */
function partOn(x: { date: string; items: Booking['items'] }, staffId: string, date: string) {
  const shift = shiftOn(date, x.date)
  const items = x.items.filter((i) => i.staffId === staffId)
  if (shift === null || !items.length) return null
  const end = Math.max(...items.map((i) => i.end)) + shift
  // the night before's part that ended by midnight is that day's
  return end > 0 ? { items, start: Math.min(...items.map((i) => i.start)) + shift, end } : null
}

export function placedIn(bookings: readonly Booking[], staffId: string, date: string): Placed[] {
  return bookings.flatMap((b) => {
    const part = partOn(b, staffId, date)
    return part ? [{ booking: b, ...part }] : []
  })
}

/**
 * The day's hours, whole: an hour before the earliest start and after the latest end of anyone's working day, any
 * booking or a move's asked time (B-Calendar: Glow Studio open 09:00–20:00 shows 08:00–21:00), within the day and the night after it; from
 * midnight when the night before runs past it.
 */
export function gridHours(view: Pick<CalendarView, 'columns' | 'bookings' | 'moves'>, date: string): { from: number; to: number } {
  const starts: number[] = []
  const ends: number[] = []
  for (const c of view.columns) {
    for (const d of c.days)
      if (d.date === date && d.working) {
        starts.push(d.working.open)
        ends.push(d.working.close)
      }
    for (const p of [...placedIn(view.bookings, c.staffId, date), ...movesIn(view.moves, c.staffId, date)]) {
      starts.push(Math.max(0, p.start))
      ends.push(p.end)
    }
  }
  if (!starts.length) return QUIET
  return { from: Math.max(0, Math.floor(Math.min(...starts) / 60) - 1), to: Math.min(48, Math.ceil(Math.max(...ends) / 60) + 1) }
}

/** A minute of the day as the grid's pixels from its top. */
export const pxOf = (minute: number, fromHour: number) => ((minute - fromHour * 60) * HOUR_PX) / 60

/**
 * A stretch's place: top and height, a pixel in from its quarter lines (B-Calendar `top: px + 1`, `height: ph - 2`),
 * cut at the grid's top and bottom.
 */
export function placeOf(start: number, end: number, fromHour: number, toHour = 48) {
  const top = Math.max(start, fromHour * 60)
  const bottom = Math.min(end, toHour * 60)
  return { top: pxOf(top, fromHour) + 1, height: Math.max(((bottom - top) * HOUR_PX) / 60 - 2, 16) }
}

/** A client's move waiting in one person's column (B-21): their part of it at the asked time, the night before's too. */
export type PlacedMove = { move: Move; items: Move['items']; start: number; end: number }

export function movesIn(moves: readonly Move[], staffId: string, date: string): PlacedMove[] {
  return moves.flatMap((m) => {
    const part = partOn(m, staffId, date)
    return part ? [{ move: m, ...part }] : []
  })
}

/**
 * The time a person doesn't work on the grid (B-Calendar `.shd`): before and after their hours, or the whole day with
 * why (a day off, time off, the business closed by a special day's name; nothing for someone removed).
 */
export type Shade = Stretch & { off?: { kind: 'dayoff' | 'timeoff' | 'closed'; name: string | null } }

export function shadesOf(day: Day | undefined, fromHour: number, toHour: number): Shade[] {
  const top = fromHour * 60
  const bottom = toHour * 60
  if (!day?.working) {
    const off = day?.off
    if (!off) return [{ start: top, end: bottom }]
    const kind = off.kind === 'business-closed' ? 'closed' : off.kind === 'exception' ? 'timeoff' : 'dayoff'
    return [{ start: top, end: bottom, off: { kind, name: kind === 'closed' ? off.name : null } }]
  }
  return [
    ...(day.working.open > top ? [{ start: top, end: day.working.open }] : []),
    ...(day.working.close < bottom ? [{ start: day.working.close, end: bottom }] : []),
  ]
}

/**
 * The buffer after each live booking (B-Calendar `.buf`, «Buffer · 10 min»): the one after the person's last part, up
 * to the next booking and no further than their day's end (a booking past it keeps none).
 */
export function buffersOf(column: readonly Placed[], day: Day | undefined): (Stretch & { code: string; minutes: number })[] {
  const live = column.filter((p) => p.booking.status !== 'cancelled')
  return live.flatMap((p) => {
    const last = p.items.reduce((a, b) => (b.end > a.end ? b : a))
    const next = Math.min(...live.filter((o) => o !== p && o.start >= p.end).map((o) => o.start))
    const close = day?.working ? Math.max(day.working.close, p.end) : Infinity
    const end = Math.min(p.end + last.bufferAfter, next, close)
    return end > p.end ? [{ code: p.booking.code, start: p.end, end, minutes: last.bufferAfter }] : []
  })
}

/** Whether a stretch shows on the grid's hours at all (a block or time elsewhere can lie outside them). */
export const onGrid = (x: Stretch, fromHour: number, toHour: number) => x.end > fromHour * 60 && x.start < toHour * 60

/** Whether a stretch overlaps any of these. */
export const overlaps = (x: Stretch, list: readonly Stretch[]) => list.some((o) => o.start < x.end && x.start < o.end)

/** A cancelled booking at the time of a live one (shown with «Show cancelled») takes the right half (B-Calendar `half`). */
export function besideLive(p: Placed, column: readonly Placed[]): boolean {
  if (p.booking.status !== 'cancelled') return false
  return column.some((o) => o.booking.status !== 'cancelled' && o.booking.code !== p.booking.code && o.start < p.end && p.start < o.end)
}
