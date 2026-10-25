import type { CalendarView } from '@yeral/contract/calendar'
import { describe, expect, it } from 'vitest'
import { besideLive, buffersOf, gridHours, movesIn, onGrid, placedIn, placeOf, pxOf, shadesOf, stretchOn } from './grid'

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
type Item = { staffId: string; start: number; end: number; bufferAfter?: number }
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
    expect(gridHours({ columns: [column(540, 1200)], bookings: [], moves: [] }, DAY)).toEqual({ from: 8, to: 21 })
    expect(gridHours({ columns: [column(540, 1200)], bookings: [booking('a', 1230, 1290)], moves: [] }, DAY)).toEqual({ from: 8, to: 23 })
    // a night bar past midnight
    expect(gridHours({ columns: [column(1080, 1560)], bookings: [], moves: [] }, DAY)).toEqual({ from: 17, to: 27 })
    expect(gridHours({ columns: [], bookings: [], moves: [] }, DAY)).toEqual({ from: 8, to: 21 })
    // the night before running past midnight: from midnight
    expect(gridHours({ columns: [column(540, 1200)], bookings: [booking('n', 1410, 1530, 'confirmed', BEFORE)], moves: [] }, DAY)).toEqual({
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

  it('shades the time a person doesn’t work, the whole day with why when they’re off', () => {
    const day = (working: { open: number; close: number } | null, off: CalendarView['columns'][number]['days'][number]['off'] = null) => ({
      date: DAY,
      working,
      breaks: [],
      off,
    })
    expect(shadesOf(day({ open: 540, close: 1200 }), 8, 21)).toEqual([
      { start: 480, end: 540 },
      { start: 1200, end: 1260 },
    ])
    expect(shadesOf(day({ open: 480, close: 1260 }), 8, 21)).toEqual([])
    expect(shadesOf(day(null, { kind: 'dayoff', name: null }), 8, 21)).toEqual([
      { start: 480, end: 1260, off: { kind: 'dayoff', name: null } },
    ])
    expect(shadesOf(day(null, { kind: 'exception', name: 'Family trip' }), 8, 21)[0]!.off).toEqual({ kind: 'timeoff', name: null })
    expect(shadesOf(day(null, { kind: 'business-closed', name: 'New Year' }), 8, 21)[0]!.off).toEqual({ kind: 'closed', name: 'New Year' })
    // someone removed, kept for their bookings: shaded, no reason
    expect(shadesOf(day(null), 8, 21)).toEqual([{ start: 480, end: 1260 }])
  })

  it('hatches the buffer after each live booking, up to the next one and the day’s end', () => {
    const day = { date: DAY, working: { open: 540, close: 1200 }, breaks: [], off: null }
    const placed = placedIn(
      [
        booking('a', 600, 660, 'confirmed', DAY, [{ staffId: 's', start: 600, end: 660, bufferAfter: 10 }]),
        booking('b', 665, 700, 'confirmed', DAY, [{ staffId: 's', start: 665, end: 700, bufferAfter: 15 }]),
        booking('c', 1190, 1200, 'confirmed', DAY, [{ staffId: 's', start: 1190, end: 1200, bufferAfter: 10 }]),
        booking('x', 720, 760, 'cancelled', DAY, [{ staffId: 's', start: 720, end: 760, bufferAfter: 10 }]),
      ],
      's',
      DAY,
    )
    expect(buffersOf(placed, day)).toEqual([
      { code: 'a', start: 660, end: 665, minutes: 10 },
      { code: 'b', start: 700, end: 715, minutes: 15 },
    ])
  })

  it('puts a move at the asked time in its person’s column, and the night before’s blocks past midnight', () => {
    const move = { code: 'YR-1', date: DAY, start: 960, end: 1050, items: [{ staffId: 's', start: 960, end: 1050 }] }
    expect(movesIn([move] as unknown as CalendarView['moves'], 's', DAY)).toMatchObject([{ start: 960, end: 1050 }])
    expect(movesIn([move] as unknown as CalendarView['moves'], 't', DAY)).toEqual([])
    const night = { ...move, date: BEFORE, start: 1380, end: 1530, items: [{ staffId: 's', start: 1380, end: 1530 }] }
    expect(movesIn([night] as unknown as CalendarView['moves'], 's', DAY)).toMatchObject([{ start: -60, end: 90 }])
    expect(stretchOn(DAY, { date: BEFORE, start: 1380, end: 1500 })).toEqual({ date: BEFORE, start: -60, end: 60 })
    expect(stretchOn(DAY, { date: BEFORE, start: 600, end: 660 })).toBeNull()
    // outside the grid's hours: not drawn
    expect(onGrid({ start: 840, end: 1080 }, 8, 14)).toBe(false)
    expect(onGrid({ start: 420, end: 480 }, 8, 14)).toBe(false)
    expect(onGrid({ start: 780, end: 900 }, 8, 14)).toBe(true)
  })
})
