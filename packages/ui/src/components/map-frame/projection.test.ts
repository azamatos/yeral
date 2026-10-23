import { describe, expect, it } from 'vitest'
import { fromScreen, toScreen, type MapView } from './projection'

const view: MapView = { center: { lat: 37.95, lng: 58.38 }, zoom: 16, width: 640, height: 320 }

describe('map projection', () => {
  it('puts the centre in the middle of the frame', () => {
    expect(toScreen(view.center, view)).toEqual({ x: 320, y: 160 })
  })

  it('reads a pixel back as the place it shows', () => {
    const place = fromScreen({ x: 400, y: 100 }, view)
    const pixel = toScreen(place, view)
    expect(pixel.x).toBeCloseTo(400, 0)
    expect(pixel.y).toBeCloseTo(100, 0)
  })

  it('puts east to the right and north up', () => {
    const p = toScreen({ lat: 37.951, lng: 58.381 }, view)
    expect(p.x).toBeGreaterThan(320)
    expect(p.y).toBeLessThan(160)
  })

  it('doubles the distances with each zoom level', () => {
    const near = toScreen({ lat: 37.95, lng: 58.381 }, view)
    const closer = toScreen({ lat: 37.95, lng: 58.381 }, { ...view, zoom: 17 })
    expect(closer.x - 320).toBeCloseTo((near.x - 320) * 2, 6)
  })
})
