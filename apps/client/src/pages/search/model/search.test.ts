import { describe, expect, it } from 'vitest'
import { apiSearch, areaOf, filterCount, filtered, searchAddress } from './search'

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

describe('areaOf', () => {
  it('reads an area the api can take', () => {
    expect(areaOf('37.9,58.3,38,58.5')).toEqual([37.9, 58.3, 38, 58.5])
  })

  it('leaves out anything else', () => {
    expect(areaOf(undefined)).toBeUndefined()
    expect(areaOf('37.9,58.3,38')).toBeUndefined()
    expect(areaOf('37.9,58.3,38,58.5,1')).toBeUndefined()
    expect(areaOf('a,b,c,d')).toBeUndefined()
    expect(areaOf('38,58.3,37.9,58.5')).toBeUndefined()
    expect(areaOf('95,58.3,96,58.5')).toBeUndefined()
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
