import { describe, expect, it } from 'vitest'
import { apiSearch, filterCount, filtered, searchAddress } from './search'

describe('searchAddress', () => {
  it('reads what it knows and leaves the rest out', () => {
    expect(searchAddress.parse({ what: ' cut ', day: 'tomorrow', sort: 'nearby', from: '50', open: true, rating: 'high' })).toEqual({
      what: 'cut',
      day: 'tomorrow',
      from: 50,
      open: true,
    })
  })
})

describe('apiSearch', () => {
  const day = '2026-11-01'

  it('turns the day into the api’s date or week', () => {
    expect(apiSearch({ day: 'tomorrow' }, 'en', day)).toMatchObject({ date: '2026-11-02' })
    expect(apiSearch({ day: 'week' }, 'en', day)).toMatchObject({ week: true })
    expect(apiSearch({ day: 'today' }, 'en', day).date).toBeUndefined()
  })

  it('reads a price range the right way round', () => {
    expect(apiSearch({ from: 200, to: 50 }, 'en', day)).toMatchObject({ minPrice: 50, maxPrice: 200 })
  })

  it('leaves an empty «what» out', () => {
    expect(apiSearch({ what: '' }, 'en', day).q).toBeUndefined()
  })
})

describe('filters', () => {
  it('knows when any is on', () => {
    expect(filtered({ day: 'week', sort: 'rating' })).toBe(false)
    expect(filtered({ rating: 4.5 })).toBe(true)
  })

  it('counts a price range once', () => {
    expect(filterCount({ from: 10, to: 20, open: true })).toBe(2)
  })
})
