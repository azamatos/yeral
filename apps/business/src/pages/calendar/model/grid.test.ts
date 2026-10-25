import type { CalendarView } from '@yeral/contract/calendar'
import { describe, expect, it } from 'vitest'
import { besideLive, gridHours, placedIn, placeOf, pxOf } from './grid'

const DAY = '2026-10-14'
const BEFORE = '2026-10-13'
const column = (open: number, close: number) =>
  ({
    staffId: 's',
    name: 'Aýna',
    photo: null,
    level: 'specialist',
    hasApp: true,
    removed: false,
    days: [{ date: DAY, working: { open, close }, breaks: [], off: null }],
  }) as CalendarView['columns'][number]
type Item = { staffId: string; start: number; end: number }
const booking = (
  code: string,
  start: number,
  end: number,
  status: CalendarView['bookings'][number]['status'] = 'confirmed',
  date = DAY,
  items: Item[] = [{ staffId: 's', start, end }],
) => ({ code, date, start, end, status, items }) as unknown as CalendarView['bookings'][number]

describe('the calendar day’s grid', () => {
  it('shows an hour around the day’s working hours and bookings, 08:00–21:00 when nobody works', () => {
    expect(gridHours({ columns: [column(540, 1200)], bookings: [] }, DAY)).toEqual({ from: 8, to: 21 })
    expect(gridHours({ columns: [column(540, 1200)], bookings: [booking('a', 1230, 1290)] }, DAY)).toEqual({ from: 8, to: 23 })
    // a night bar past midnight
    expect(gridHours({ columns: [column(1080, 1560)], bookings: [] }, DAY)).toEqual({ from: 17, to: 27 })
    expect(gridHours({ columns: [], bookings: [] }, DAY)).toEqual({ from: 8, to: 21 })
    // the night before running past midnight: from midnight
    expect(gridHours({ columns: [column(540, 1200)], bookings: [booking('n', 1410, 1530, 'confirmed', BEFORE)] }, DAY)).toEqual({
      from: 0,
      to: 21,
    })
  })

  it('places minutes 80 px an hour, a pixel inside the quarter lines, cut at the top', () => {
    expect(pxOf(540, 8)).toBe(80)
    expect(placeOf(615, 660, 8)).toEqual({ top: 181, height: 58 })
    // a short one keeps room for its first line
    expect(placeOf(600, 605, 8).height).toBe(16)
    expect(placeOf(-30, 90, 0)).toEqual({ top: 1, height: 118 })
  })

  it('puts each person’s part of a booking in their column, and the night before’s past midnight', () => {
    const shared = booking('a', 600, 690, 'confirmed', DAY, [
      { staffId: 's', start: 600, end: 660 },
      { staffId: 't', start: 660, end: 690 },
    ])
    expect(placedIn([shared], 't', DAY)).toMatchObject([{ start: 660, end: 690, items: [{ staffId: 't' }] }])
    expect(placedIn([booking('n', 1410, 1530, 'confirmed', BEFORE)], 's', DAY)).toMatchObject([{ start: -30, end: 90 }])
    // the night before's that ended by midnight, and another day's, aren't this day's
    expect(placedIn([booking('m', 1300, 1440, 'confirmed', BEFORE), booking('x', 600, 660, 'confirmed', '2026-10-15')], 's', DAY)).toEqual(
      [],
    )
  })

  it('puts a cancelled booking beside a live one at the same time, not over it', () => {
    const placed = placedIn([booking('a', 600, 660), booking('b', 630, 690, 'cancelled'), booking('c', 700, 720, 'cancelled')], 's', DAY)
    const [live, gone, apart] = [placed[0]!, placed[1]!, placed[2]!]
    expect(besideLive(gone, [live, gone])).toBe(true)
    expect(besideLive(apart, [live])).toBe(false)
    expect(besideLive(live, [live, gone])).toBe(false)
  })
})
