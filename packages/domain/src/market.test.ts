import { describe, expect, it } from 'vitest'
import { MARKET, phoneRules, startsWithOneOf, TURKMENISTAN, type Market } from './market'
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

  it('tells mobiles by its list of prefixes, which the screens name', () => {
    const { mobilePrefixes, mobile, valid, length } = market.phone
    const number = (start: string) => start.padEnd(length, '1')
    for (const prefix of mobilePrefixes) {
      // every prefix starts a valid national number, and that number is a mobile
      expect(valid.test(number(prefix))).toBe(true)
      expect(mobile.test(number(prefix))).toBe(true)
    }
    // every valid number, by its first two digits, is a mobile exactly when it starts with one of them
    for (let start = 0; start < 100; start++) {
      const n = number(String(start).padStart(2, '0'))
      if (valid.test(n)) expect(mobile.test(n), n).toBe(mobilePrefixes.some((p) => n.startsWith(p)))
    }
  })

  it('has a support line: one of its own numbers and a Telegram username', () => {
    const { phone, telegram } = market.support
    expect(phone.startsWith(`+${market.phone.countryCode}`)).toBe(true)
    expect(phone.slice(market.phone.countryCode.length + 1)).toMatch(market.phone.valid)
    // Telegram's rule: 5–32 letters, digits and underscores, starting with a letter; written without the @
    expect(telegram).toMatch(/^[a-z]\w{4,31}$/i)
  })

  it('writes the currency as an ISO 4217 code', () => {
    expect(market.currency).toMatch(/^[A-Z]{3}$/)
  })
})

describe('startsWithOneOf', () => {
  it('builds a test of the first digits from the prefixes', () => {
    expect(startsWithOneOf(['6', '7']).test('65102030')).toBe(true)
    expect(startsWithOneOf(['6', '7']).test('12456789')).toBe(false)
    const twoDigits = startsWithOneOf(['61', '62', '71'])
    expect(['61000000', '71000000'].every((n) => twoDigits.test(n))).toBe(true)
    expect(twoDigits.test('66000000')).toBe(false)
  })

  it('refuses anything but digits, and an empty list', () => {
    expect(() => startsWithOneOf([])).toThrow('at least one prefix')
    expect(() => startsWithOneOf(['6|.'])).toThrow('digits only, not: 6|.')
  })
})

describe('phoneRules', () => {
  it('makes the mobile test from the prefixes, so the two never disagree', () => {
    const rules = phoneRules({
      countryCode: '998',
      length: 9,
      trunkPrefix: '8',
      valid: /^\d{9}$/,
      mobilePrefixes: ['9', '33'],
      groups: [2, 3, 2, 2],
    })
    expect(rules.mobile.test('901234567')).toBe(true)
    expect(rules.mobile.test('331234567')).toBe(true)
    expect(rules.mobile.test('711234567')).toBe(false)
  })
})

describe('the first launch', () => {
  it('serves Turkmenistan in English only (book chapter 1, ADR 0022)', () => {
    expect(MARKET.code).toBe('tm')
    expect(MARKET.languages).toEqual(['en'])
    expect(MARKET.defaultLanguage).toBe('en')
  })
})
