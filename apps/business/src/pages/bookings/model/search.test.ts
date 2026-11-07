import { describe, expect, it } from 'vitest'
import { bookingsSearch, joined, listOf, rangeOf } from './search'

describe('the bookings list’s address', () => {
  it('keeps a tab and filters it knows', () => {
    expect(bookingsSearch({ tab: 'past', q: 'YR-1', when: 'week', staff: 's' })).toEqual({
      tab: 'past',
      q: 'YR-1',
      when: 'week',
      staff: 's',
    })
  })

  it('reads several specialists, services and statuses; an old one-value link still opens', () => {
    expect(bookingsSearch({ staff: 'a,b,a', service: ['x', 'y,z'], status: 'pending,lost,confirmed', sortBy: 'booked' })).toEqual({
      staff: 'a,b',
      service: 'x,y,z',
      status: 'pending,confirmed',
      sortBy: 'booked',
    })
    expect(bookingsSearch({ staff: ',', status: 'lost', sortBy: 'random' })).toEqual({})
    expect(listOf('a,b')).toEqual(['a', 'b'])
    expect(listOf(undefined)).toEqual([])
    expect(joined([])).toBeUndefined()
  })

  it('knows the requests tab', () => {
    expect(bookingsSearch({ tab: 'requests' })).toEqual({ tab: 'requests' })
    expect(bookingsSearch({ when: 'tomorrow' })).toEqual({ when: 'tomorrow' })
  })

  it('drops what it doesn’t', () => {
    expect(bookingsSearch({ tab: 'nope', when: 'year', q: '', booking: 5 })).toEqual({})
  })

  it('turns the date choice into days, Monday to Sunday', () => {
    expect(rangeOf(undefined, '2026-10-14')).toEqual({})
    expect(rangeOf('today', '2026-10-14')).toEqual({ from: '2026-10-14', to: '2026-10-14' })
    expect(rangeOf('tomorrow', '2026-10-18')).toEqual({ from: '2026-10-19', to: '2026-10-19' })
    expect(rangeOf('week', '2026-10-14')).toEqual({ from: '2026-10-12', to: '2026-10-18' })
    expect(rangeOf('week', '2026-10-18')).toEqual({ from: '2026-10-12', to: '2026-10-18' })
  })
})
