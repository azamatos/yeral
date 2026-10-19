import { describe, expect, it } from 'vitest'
import { MARKET, TURKMENISTAN, type Market } from './market'
import { LOCALES } from './model'

/** The zone's offset from UTC at an instant, in minutes, from the runtime's time zone data. */
function zoneOffsetMin(zone: string, at: Date): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(name ?? '')
  if (!m) return 0
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]))
}

describe.each<[string, Market]>([['Turkmenistan', TURKMENISTAN]])('market %s', (_, market) => {
  it('has a fixed offset that matches its zone all year (no daylight saving)', () => {
    for (let month = 0; month < 12; month++) {
      expect(zoneOffsetMin(market.timeZone, new Date(Date.UTC(2026, month, 15, 12)))).toBe(market.utcOffsetMin)
    }
  })

  it('offers languages the code has, the default among them', () => {
    for (const lang of market.languages) expect(LOCALES).toContain(lang)
    expect(market.languages).toContain(market.defaultLanguage)
  })

  it('has phone rules a prefix can never be mistaken in', () => {
    const { countryCode, trunkPrefix, valid, groups, length } = market.phone
    // phone.ts strips a leading country code or trunk prefix: no national number may start with either
    for (const first of [trunkPrefix[0], countryCode[0]]) {
      expect(valid.test(`${first}${'1'.repeat(length - 1)}`)).toBe(false)
    }
    expect(groups.reduce((a, b) => a + b, 0)).toBe(length)
  })

  it('writes the currency as an ISO 4217 code', () => {
    expect(market.currency).toMatch(/^[A-Z]{3}$/)
  })
})

describe('the first launch', () => {
  it('serves Turkmenistan in English only (book chapter 1, ADR 0022)', () => {
    expect(MARKET.code).toBe('tm')
    expect(MARKET.languages).toEqual(['en'])
    expect(MARKET.defaultLanguage).toBe('en')
  })
})
