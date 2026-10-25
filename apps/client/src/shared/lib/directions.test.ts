import { describe, expect, it } from 'vitest'
import { directionsUrl } from './directions'

const glow = { lat: 37.9601, lng: 58.3261 }
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'

describe('where Directions goes (book Q-108)', () => {
  it('opens Apple Maps on an iPhone, named', () => {
    expect(directionsUrl(glow, 'Glow Studio', IPHONE)).toBe('https://maps.apple.com/?daddr=37.9601,58.3261&q=Glow%20Studio')
  })

  it('lets Android choose the app', () => {
    expect(directionsUrl(glow, 'Glow Studio', ANDROID)).toBe('geo:37.9601,58.3261?q=37.9601,58.3261(Glow%20Studio)')
  })

  it('opens Google Maps on a computer', () => {
    expect(directionsUrl(glow, 'Glow Studio', MAC)).toBe('https://www.google.com/maps/dir/?api=1&destination=37.9601,58.3261')
    expect(directionsUrl(glow, 'Glow Studio', '')).toBe('https://www.google.com/maps/dir/?api=1&destination=37.9601,58.3261')
  })
})
