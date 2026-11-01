import { describe, expect, it } from 'vitest'
import { bookingsSearch, rangeOf } from './search'

describe('the bookings list’s address', () => {
  it('keeps a tab and filters it knows', () => {
    expect(bookingsSearch({ tab: 'past', q: 'YR-1', when: 'week', staff: 's' })).toEqual({
      tab: 'past',
      q: 'YR-1',
      when: 'week',
      staff: 's',
    })
  })

  it('knows the requests tab', () => {
    expect(bookingsSearch({ tab: 'requests' })).toEqual({ tab: 'requests' })
  })

  it('drops what it doesn’t', () => {
    expect(bookingsSearch({ tab: 'nope', when: 'year', q: '', booking: 5 })).toEqual({})
  })

  it('turns the date choice into days, Monday to Sunday', () => {
    expect(rangeOf(undefined, '2026-10-14')).toEqual({})
    expect(rangeOf('today', '2026-10-14')).toEqual({ from: '2026-10-14', to: '2026-10-14' })
    expect(rangeOf('week', '2026-10-14')).toEqual({ from: '2026-10-12', to: '2026-10-18' })
    expect(rangeOf('week', '2026-10-18')).toEqual({ from: '2026-10-12', to: '2026-10-18' })
  })
})
