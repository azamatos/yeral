import { describe, expect, it } from 'vitest'
import { apiSearch, areaOf, dayOf, filtered, nearOf, priceBandAddress, priceBandOf, searchAddress, widerRadius } from './search'

describe('searchAddress', () => {
  it('reads what it knows and leaves the rest out', () => {
    expect(searchAddress.parse({ what: ' cut ', day: 'tomorrow', sort: 'nearby', from: '50', open: true, rating: 'high' })).toEqual({
      what: 'cut',
      day: 'tomorrow',
      from: 50,
    })
  })

  it('keeps only a real calendar date and a known time of day', () => {
    expect(searchAddress.parse({ date: '2026-11-20', tod: 'morning' })).toEqual({ date: '2026-11-20', tod: 'morning' })
    expect(searchAddress.parse({ date: '2026-13-45', tod: 'night' })).toEqual({})
    expect(searchAddress.parse({ date: '20.11.2026' })).toEqual({})
  })
})

describe('apiSearch', () => {
  const day = '2026-11-01'

  it('turns the day into the api’s date or week', () => {
    expect(apiSearch({ day: 'tomorrow' }, 'en', day)).toMatchObject({ date: '2026-11-02' })
    expect(apiSearch({ day: 'week' }, 'en', day)).toMatchObject({ week: true })
    expect(apiSearch({ day: 'today' }, 'en', day).date).toBeUndefined()
  })

  it('sends a calendar date, and the day instead when both are there', () => {
    expect(apiSearch({ date: '2026-11-20' }, 'en', day)).toMatchObject({ date: '2026-11-20' })
    expect(apiSearch({ date: '2026-11-20', day: 'today' }, 'en', day).date).toBeUndefined()
  })

  it('reads a price range the right way round', () => {
    expect(apiSearch({ from: 200, to: 50 }, 'en', day)).toMatchObject({ minPrice: 50, maxPrice: 200 })
  })

  it('leaves an empty «what» out', () => {
    expect(apiSearch({ what: '' }, 'en', day).q).toBeUndefined()
  })
})

describe('dayOf', () => {
  const today = '2026-11-01'

  it('takes the toggle’s day first', () => {
    expect(dayOf({ day: 'week', date: '2026-11-20' }, today)).toBe('week')
    expect(dayOf({}, today)).toBe('today')
  })

  it('names today and tomorrow from a calendar date, and any other day as a date', () => {
    expect(dayOf({ date: '2026-11-01' }, today)).toBe('today')
    expect(dayOf({ date: '2026-11-02' }, today)).toBe('tomorrow')
    expect(dayOf({ date: '2026-11-20' }, today)).toBe('date')
  })
})

describe('price bands', () => {
  it('knows the menu’s bands and keeps an older range as custom', () => {
    expect(priceBandOf({})).toBeUndefined()
    expect(priceBandOf({ to: 100 })).toBe('to100')
    expect(priceBandOf({ from: 100, to: 200 })).toBe('100to200')
    expect(priceBandOf({ from: 200 })).toBe('from200')
    expect(priceBandOf({ from: 50 })).toBe('custom')
  })

  it('turns a band into the address, none into no range', () => {
    expect(priceBandAddress('100to200')).toEqual({ from: 100, to: 200 })
    expect(priceBandAddress(null)).toEqual({ from: undefined, to: undefined })
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

describe('near', () => {
  it('reads a position and asks around it', () => {
    expect(nearOf('37.9,58.3')).toEqual({ lat: 37.9, lng: 58.3 })
    expect(apiSearch({ near: '37.9,58.3', r: 10 }, 'en', '2026-11-01')).toMatchObject({ lat: 37.9, lng: 58.3, r: 10 })
  })

  it('leaves out anything else', () => {
    expect(nearOf(undefined)).toBeUndefined()
    expect(nearOf('37.9')).toBeUndefined()
    expect(nearOf('north,east')).toBeUndefined()
    expect(nearOf('137,58')).toBeUndefined()
    expect(apiSearch({ r: 10 }, 'en', '2026-11-01').r).toBeUndefined()
  })

  it('widens one step at a time, up to the last', () => {
    expect(widerRadius()).toBe(10)
    expect(widerRadius(10)).toBe(25)
    expect(widerRadius(25)).toBeUndefined()
  })
})

describe('filters', () => {
  it('knows when any is on', () => {
    expect(filtered({ day: 'week', sort: 'rating' })).toBe(false)
    expect(filtered({ r: 5 })).toBe(false)
    expect(filtered({ rating: 4.5 })).toBe(true)
    expect(filtered({ r: 10 })).toBe(true)
  })
})
