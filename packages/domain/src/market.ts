/**
 * The market this deployment serves (ADR 0022, ADR 0023): one country's languages, money, phone rules and time zone,
 * in one place. Every deployment serves one market, so these are constants of the build; nothing else in the code base
 * names a country's values. A second country adds its own `Market` and picks it here (by environment once it exists).
 *
 * Settings without code yet join with their features: legal texts (P4 slice 7), the SMS provider and sender (the
 * Turkmenistan launch), the map area (the client site) — book chapter 10. The market's cities are data (the `cities`
 * table, book Q-107); only the main one is named here.
 */
import type { Locale } from './model'

export interface PhoneRules {
  /** Country calling code, digits only: `993`. */
  countryCode: string
  /** Digits after the country code. */
  length: number
  /** What people type before a national number at home (`8 65 …`); never the start of a national number. */
  trunkPrefix: string
  /** A complete national number. Its first digit is never the trunk prefix or the country code's first digit. */
  valid: RegExp
  /**
   * What a national number that can receive an SMS (sign-in codes) starts with: `['6', '7']`. The one source of the
   * rule: `mobile` is built from it, and the screens say it («Enter a number starting with 6 or 7»).
   */
  mobilePrefixes: readonly [string, ...string[]]
  /** `mobilePrefixes` as a test of the national digits, made by `phoneRules()`. */
  mobile: RegExp
  /** How the national digits are grouped on screen: `+993 65 12 34 56` is [2, 2, 2, 2]. */
  groups: readonly number[]
}

export interface Market {
  /** ISO 3166-1 alpha-2, lower case. */
  code: string
  /** Languages the sites offer, in menu order; each has every key translated (CI checks). */
  languages: readonly [Locale, ...Locale[]]
  /** For a new visitor and for SMS to people who never chose a language (book Q-292). */
  defaultLanguage: Locale
  /** ISO 4217 code, printed after amounts (`40 TMT`). Amounts are whole units. */
  currency: string
  /** Every business's clock (IANA zone) and its offset from UTC: zones with daylight saving aren't supported yet. */
  timeZone: string
  utcOffsetMin: number
  phone: PhoneRules
  /** The city a visitor starts in until they allow their location or pick another (book Q-107): a `cities` id. */
  mainCity: string
}

/** A test that the digits start with one of `prefixes` (digits only): ['6', '71'] → /^(?:6|71)/. */
export function startsWithOneOf(prefixes: readonly string[]): RegExp {
  if (!prefixes.length) throw new Error('startsWithOneOf needs at least one prefix')
  const bad = prefixes.filter((p) => !/^\d+$/.test(p))
  if (bad.length) throw new Error(`startsWithOneOf takes digits only, not: ${bad.join(', ')}`)
  return new RegExp(`^(?:${prefixes.join('|')})`)
}

/** A market's phone rules with `mobile` made from `mobilePrefixes`, so the two can't say different things. */
export function phoneRules(rules: Omit<PhoneRules, 'mobile'>): PhoneRules {
  return { ...rules, mobile: startsWithOneOf(rules.mobilePrefixes) }
}

/**
 * Turkmenistan: manats, +993 numbers, Ashgabat time (UTC+5, no daylight saving). The first launch offers English only;
 * Turkmen and Russian join for the Turkmenistan launch (book chapter 1, "Launch"; ADR 0022).
 */
export const TURKMENISTAN: Market = {
  code: 'tm',
  languages: ['en'],
  defaultLanguage: 'en',
  currency: 'TMT',
  timeZone: 'Asia/Ashgabat',
  utcOffsetMin: 5 * 60,
  phone: phoneRules({
    countryCode: '993',
    length: 8,
    trunkPrefix: '8',
    // national numbers start with 1–7; mobiles with 6 or 7 (61–65 and 71 today)
    valid: /^[1-7]\d{7}$/,
    mobilePrefixes: ['6', '7'],
    groups: [2, 2, 2, 2],
  }),
  mainCity: 'ashgabat',
}

/** The market of this deployment. */
export const MARKET: Market = TURKMENISTAN
