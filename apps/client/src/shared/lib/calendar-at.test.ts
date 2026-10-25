import { describe, expect, it } from 'vitest'
import { calendarAt } from './calendar-at'

describe('a business day start on the calendar', () => {
  it('reads a start past midnight on the next day', () => {
    expect(calendarAt('2026-10-23', 1470)).toEqual({ date: '2026-10-24', start: 30 })
    expect(calendarAt('2026-10-23', 1440)).toEqual({ date: '2026-10-24', start: 0 })
  })

  it('keeps a start within the day', () => {
    expect(calendarAt('2026-10-23', 870)).toEqual({ date: '2026-10-23', start: 870 })
  })
})
