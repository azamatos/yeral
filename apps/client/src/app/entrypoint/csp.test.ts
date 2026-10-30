import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, cspNonce } from './csp'

const hosts = { api: 'https://api.example', tiles: 'https://tiles.example' }

describe('contentSecurityPolicy', () => {
  it('lets scripts run from the site and with the page’s nonce only', () => {
    const directives = contentSecurityPolicy('abc123', hosts).split('; ')
    expect(directives).toContain(`script-src 'self' 'nonce-abc123'`)
    expect(directives.find((d) => d.startsWith('script-src'))).not.toContain('unsafe-inline')
  })

  it('names the api for requests, the events stream and photos, and the tiles host for the map', () => {
    const directives = contentSecurityPolicy('n', hosts).split('; ')
    expect(directives).toContain(`connect-src 'self' https://api.example https://tiles.example`)
    expect(directives).toContain(`img-src 'self' data: blob: https://api.example`)
    expect(directives).toContain(`worker-src blob:`)
  })

  it('keeps the page out of other sites’ frames and forms on its own origin', () => {
    const directives = contentSecurityPolicy('n', hosts).split('; ')
    expect(directives).toEqual(
      expect.arrayContaining([`frame-ancestors 'self'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`]),
    )
  })

  it('reads the api from the site config by default', () => {
    expect(contentSecurityPolicy('n')).toMatch(/connect-src 'self' https?:\/\/\S+ https:\/\/tiles\.openfreemap\.org/)
  })
})

describe('cspNonce', () => {
  it('is 16 random bytes as base64, different every time', () => {
    const a = cspNonce()
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/)
    expect(cspNonce()).not.toBe(a)
  })
})
