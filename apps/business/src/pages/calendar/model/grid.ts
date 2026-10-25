import type { CalendarView } from '@yeral/contract/calendar'
import { addDays } from '@yeral/domain/time'

/** B-Calendar's day grid: an hour is 80 px, a quarter 20 (the rows a click lands on). */
export const HOUR_PX = 80
export const QUARTER_PX = HOUR_PX / 4

const DAY_MINUTES = 1440
/** The hours the grid shows when nobody works that day (the board's 08:00–21:00). */
const QUIET = { from: 8, to: 21 }

type Booking = CalendarView['bookings'][number]

/**
 * A booking in one person's column: their part of it (`items`; a booking shared with a colleague shows each part in
 * its own column) and where it sits on this day's grid (`start`, `end`). The night before's bookings past midnight
 * (book Q-105) sit at their minutes after it.
 */
export type Placed = { booking: Booking; items: Booking['items']; start: number; end: number }

export function placedIn(bookings: readonly Booking[], staffId: string, date: string): Placed[] {
  const before = addDays(date, -1)
  return bookings.flatMap((b) => {
    const shift = b.date === date ? 0 : b.date === before ? -DAY_MINUTES : null
    const items = b.items.filter((i) => i.staffId === staffId)
    if (shift === null || !items.length) return []
    const end = Math.max(...items.map((i) => i.end)) + shift
    // the night before's part that ended by midnight is that day's
    return end > 0 ? [{ booking: b, items, start: Math.min(...items.map((i) => i.start)) + shift, end }] : []
  })
}

/**
 * The day's hours, whole: an hour before the earliest start and after the latest end of anyone's working day or any
 * booking (B-Calendar: Glow Studio open 09:00–20:00 shows 08:00–21:00), within the day and the night after it; from
 * midnight when the night before runs past it.
 */
export function gridHours(view: Pick<CalendarView, 'columns' | 'bookings'>, date: string): { from: number; to: number } {
  const starts: number[] = []
  const ends: number[] = []
  for (const c of view.columns) {
    for (const d of c.days)
      if (d.date === date && d.working) {
        starts.push(d.working.open)
        ends.push(d.working.close)
      }
    for (const p of placedIn(view.bookings, c.staffId, date)) {
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
 * cut at the grid's top.
 */
export function placeOf(start: number, end: number, fromHour: number) {
  const top = Math.max(start, fromHour * 60)
  return { top: pxOf(top, fromHour) + 1, height: Math.max(((end - top) * HOUR_PX) / 60 - 2, 16) }
}

/** A cancelled booking at the time of a live one (shown with «Show cancelled») takes the right half (B-Calendar `half`). */
export function besideLive(p: Placed, column: readonly Placed[]): boolean {
  if (p.booking.status !== 'cancelled') return false
  return column.some((o) => o.booking.status !== 'cancelled' && o.booking.code !== p.booking.code && o.start < p.end && p.start < o.end)
}
