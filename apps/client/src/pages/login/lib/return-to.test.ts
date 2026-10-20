import { describe, expect, it } from 'vitest'
import { returnTo } from './return-to'

describe('returnTo', () => {
  it('goes back to the page that asked for the login', () => {
    expect(returnTo('en', '/en/account/profile')).toBe('/en/account/profile')
    expect(returnTo('en', '/en/account/bookings?tab=past#YR-1')).toBe('/en/account/bookings?tab=past#YR-1')
  })

  it("else the language's Home", () => {
    expect(returnTo('en', undefined)).toBe('/en')
    expect(returnTo('en', '')).toBe('/en')
    expect(returnTo('en', '/en')).toBe('/en')
  })

  it('never leaves the site or the language, and never loops back to the login', () => {
    for (const away of [
      'https://evil.example',
      '//evil.example/en/x',
      '/\\evil.example',
      '/ru/account',
      '/en/../../x',
      '/en/login',
      '/enx',
    ])
      expect(returnTo('en', away)).toBe('/en')
  })
})
