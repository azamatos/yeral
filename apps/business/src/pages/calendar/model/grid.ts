import type { CalendarView } from '@yeral/contract/calendar'

/** B-Calendar's day grid: an hour is 80 px, a quarter 20 (the rows a click lands on). */
export const HOUR_PX = 80
export const QUARTER_PX = HOUR_PX / 4

/** The hours the grid shows when nobody works that day (the board's 08:00–21:00). */
const QUIET = { from: 8, to: 21 }

/**
 * The day's hours, whole: an hour before the earliest start and after the latest end of anyone's working day or any
 * booking (B-Calendar: Glow Studio open 09:00–20:00 shows 08:00–21:00), within the day and the night after it.
 */
export function gridHours(view: Pick<CalendarView, 'columns' | 'bookings'>, date: string): { from: number; to: number } {
  const starts: number[] = []
  const ends: number[] = []
  for (const c of view.columns)
    for (const d of c.days)
      if (d.date === date && d.working) {
        starts.push(d.working.open)
        ends.push(d.working.close)
      }
  for (const b of view.bookings)
    if (b.date === date) {
      starts.push(b.start)
      ends.push(b.end)
    }
  if (!starts.length) return QUIET
  return { from: Math.max(0, Math.floor(Math.min(...starts) / 60) - 1), to: Math.min(48, Math.ceil(Math.max(...ends) / 60) + 1) }
}

/** A minute of the day as the grid's pixels from its top. */
export const pxOf = (minute: number, fromHour: number) => ((minute - fromHour * 60) * HOUR_PX) / 60

/** A booking's place: top and height, a pixel in from its quarter lines (B-Calendar `top: px + 1`, `height: ph - 2`). */
export const placeOf = (start: number, end: number, fromHour: number) => ({
  top: pxOf(start, fromHour) + 1,
  height: Math.max(((end - start) * HOUR_PX) / 60 - 2, 16),
})

type Booking = CalendarView['bookings'][number]

/** The person a booking is with in a column: any of its items with them. */
export const inColumn = (b: Booking, staffId: string) => b.items.some((i) => i.staffId === staffId)

/** A cancelled booking at the time of a live one (shown with «Show cancelled») takes the right half (B-Calendar `half`). */
export function besideLive(b: Booking, column: readonly Booking[]): boolean {
  if (b.status !== 'cancelled') return false
  return column.some((o) => o.status !== 'cancelled' && o.code !== b.code && o.start < b.end && b.start < o.end)
}
