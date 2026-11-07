import { describe, expect, it } from 'vitest'
import { calendarSearch, statusesOf } from './search'

describe('the calendar’s address', () => {
  it('keeps a real day, the cancelled switch, the booking picked and the request open, and drops the rest', () => {
    expect(calendarSearch({ date: '2026-10-14', cancelled: true, booking: 'YR-48213', request: 'YR-48214', staff: 's1' })).toEqual({
      date: '2026-10-14',
      cancelled: true,
      booking: 'YR-48213',
      request: 'YR-48214',
      staff: 's1',
    })
    expect(calendarSearch({ date: '2026-02-30' })).toEqual({})
    expect(calendarSearch({ date: 'tomorrow', cancelled: 'yes', booking: '', request: 7, staff: '' })).toEqual({})
  })

  it('keeps the statuses Filters ticked, known ones only, in the board’s order', () => {
    expect(calendarSearch({ status: 'noshow,pending,cancelled,x' })).toEqual({ status: 'pending,noshow' })
    expect(calendarSearch({ status: 'cancelled' })).toEqual({})
    expect(statusesOf(undefined)).toEqual([])
  })
})
