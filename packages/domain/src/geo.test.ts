import { describe, expect, it } from 'vitest'
import { boundingBox, CITY_REACH_KM, distanceM, nearestCity } from './geo'

// two points in Ashgabat about 1.2 km apart (demo businesses)
const a = { lat: 37.9601, lng: 58.3261 }
const b = { lat: 37.9601, lng: 58.3398 }

describe('distances', () => {
  it('measures metres along the earth', () => {
    expect(distanceM(a, a)).toBe(0)
    expect(distanceM(a, b)).toBeGreaterThan(1150)
    expect(distanceM(a, b)).toBeLessThan(1250)
  })

  it('a bounding box contains every point within the radius', () => {
    const box = boundingBox(a, 1.3)
    expect(b.lng).toBeLessThan(box.maxLng)
    expect(b.lng).toBeGreaterThan(box.minLng)
    expect(boundingBox(a, 1).maxLng).toBeLessThan(b.lng)
  })
})

describe('nearestCity (book Q-107)', () => {
  const cities = [
    { id: 'a', ...a },
    // about 400 km east
    { id: 'far', lat: 37.6, lng: 62.8 },
  ]

  it('picks the city whose centre is nearest', () => {
    expect(nearestCity(cities, b)?.id).toBe('a')
    expect(nearestCity(cities, { lat: 37.62, lng: 62.7 })?.id).toBe('far')
  })

  it(`is none beyond ${CITY_REACH_KM} km of every city`, () => {
    expect(nearestCity(cities, { lat: 41.3, lng: 69.24 })).toBeNull()
    expect(nearestCity([], a)).toBeNull()
  })
})
