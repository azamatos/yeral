import { describe, expect, it } from 'vitest'
import { calendarSearch } from './search'

describe('the calendar’s address', () => {
  it('keeps a real day, the cancelled switch and the open booking, and drops the rest', () => {
    expect(calendarSearch({ date: '2026-10-14', cancelled: true, booking: 'YR-48213' })).toEqual({
      date: '2026-10-14',
      cancelled: true,
      booking: 'YR-48213',
    })
    expect(calendarSearch({ date: '2026-02-30' })).toEqual({})
    expect(calendarSearch({ date: 'tomorrow', cancelled: 'yes', booking: '' })).toEqual({})
  })
})
