import type { CalendarView } from '@yeral/contract/calendar'
import { describe, expect, it } from 'vitest'
import { besideLive, gridHours, placeOf, pxOf } from './grid'

const DAY = '2026-10-14'
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
const booking = (code: string, start: number, end: number, status: CalendarView['bookings'][number]['status'] = 'confirmed') =>
  ({ code, date: DAY, start, end, status, items: [{ staffId: 's' }] }) as unknown as CalendarView['bookings'][number]

describe('the calendar day’s grid', () => {
  it('shows an hour around the day’s working hours and bookings, 08:00–21:00 when nobody works', () => {
    expect(gridHours({ columns: [column(540, 1200)], bookings: [] }, DAY)).toEqual({ from: 8, to: 21 })
    expect(gridHours({ columns: [column(540, 1200)], bookings: [booking('a', 1230, 1290)] }, DAY)).toEqual({ from: 8, to: 23 })
    // a night bar past midnight
    expect(gridHours({ columns: [column(1080, 1560)], bookings: [] }, DAY)).toEqual({ from: 17, to: 27 })
    expect(gridHours({ columns: [], bookings: [] }, DAY)).toEqual({ from: 8, to: 21 })
  })

  it('places minutes 80 px an hour, a pixel inside the quarter lines', () => {
    expect(pxOf(540, 8)).toBe(80)
    expect(placeOf(615, 660, 8)).toEqual({ top: 181, height: 58 })
    // a short one keeps room for its first line
    expect(placeOf(600, 605, 8).height).toBe(16)
  })

  it('puts a cancelled booking beside a live one at the same time, not over it', () => {
    const live = booking('a', 600, 660)
    const gone = booking('b', 630, 690, 'cancelled')
    expect(besideLive(gone, [live, gone])).toBe(true)
    expect(besideLive(booking('c', 700, 720, 'cancelled'), [live])).toBe(false)
    expect(besideLive(live, [live, gone])).toBe(false)
  })
})
