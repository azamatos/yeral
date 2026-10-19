/**
 * The market this deployment serves (ADR 0022, ADR 0023): one country's languages, money, phone rules and time zone,
 * in one place. Every deployment serves one market, so these are constants of the build; nothing else in the code base
 * names a country's values. A second country adds its own `Market` and picks it here (by environment once it exists).
 *
 * Settings without code yet join with their features: legal texts (P4 slice 7), the SMS provider and sender (the
 * Turkmenistan launch), the main city and map area (the client site) — book chapter 10.
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
  /** National numbers that can receive an SMS (sign-in codes). */
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
  phone: {
    countryCode: '993',
    length: 8,
    trunkPrefix: '8',
    // national numbers start with 1–7; mobiles with 6 or 7 (61–65 and 71 today)
    valid: /^[1-7]\d{7}$/,
    mobile: /^[67]/,
    groups: [2, 2, 2, 2],
  },
}

/** The market of this deployment. */
export const MARKET: Market = TURKMENISTAN
