import { describe, expect, it } from 'vitest'
import { directionsUrl, telHref } from './links'

const glow = { lat: 37.9601, lng: 58.3261 }
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const APPLE_MAPS = 'https://maps.apple.com/?daddr=37.9601,58.3261&q=Glow%20Studio'
const GOOGLE_MAPS = 'https://www.google.com/maps/dir/?api=1&destination=37.9601,58.3261'

describe('where Directions goes (book Q-108)', () => {
  it('opens Apple Maps on an iPhone, and on an iPad that says it is a Mac', () => {
    expect(directionsUrl(glow, 'Glow Studio', { userAgent: IPHONE })).toBe(APPLE_MAPS)
    expect(directionsUrl(glow, 'Glow Studio', { userAgent: MAC, maxTouchPoints: 5 })).toBe(APPLE_MAPS)
  })

  it('lets Android choose the app', () => {
    expect(directionsUrl(glow, 'Glow Studio', { userAgent: ANDROID })).toBe('geo:37.9601,58.3261?q=37.9601,58.3261(Glow%20Studio)')
  })

  it('opens Google Maps on a computer and from the server', () => {
    expect(directionsUrl(glow, 'Glow Studio', { userAgent: MAC, maxTouchPoints: 0 })).toBe(GOOGLE_MAPS)
    expect(directionsUrl(glow, 'Glow Studio')).toBe(GOOGLE_MAPS)
  })
})

describe('a number to call', () => {
  it('is a tel: link', () => {
    expect(telHref('+99312456789')).toBe('tel:+99312456789')
  })
})
