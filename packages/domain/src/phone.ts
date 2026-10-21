/**
 * Phone numbers by the market's rules (`MARKET.phone`; Turkmenistan: country code 993 + 8 national digits). Stored as
 * E.164 (`+99365123456`), shown grouped (`+993 65 12 34 56`; design: PhoneInput with a fixed country code in front).
 */
import { MARKET } from './market'

const RULES = MARKET.phone
const COUNTRY = RULES.countryCode

/**
 * The digits after the country code or the trunk prefix, as typed. No national number starts with the trunk prefix or
 * the country code's first digit (`PhoneRules.valid`), so a leading country code or trunk prefix is always a prefix,
 * even in partial input; a '+' followed by part of the country code is too. The trunk prefix can also follow the
 * country code: a field that shows "+993" gets the local form "8 65 …" typed after it.
 */
function afterPrefix(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+') && COUNTRY.startsWith(digits)) return ''
  const rest = digits.startsWith(COUNTRY) ? digits.slice(COUNTRY.length) : digits
  return rest.startsWith(RULES.trunkPrefix) ? rest.slice(RULES.trunkPrefix.length) : rest
}

/** The national digits from any input ('+993 65 12-34-56', '99365123456', '8 65 123456'); may be shorter while typing. */
export function nationalDigits(raw: string): string {
  return afterPrefix(raw).slice(0, RULES.length)
}

/** A complete number of this market. */
export function isPhone(raw: string): boolean {
  return RULES.valid.test(afterPrefix(raw))
}

/** Only mobile numbers can receive the sign-in code: those that start with one of the market's `mobilePrefixes`. */
export function isMobile(raw: string): boolean {
  return isPhone(raw) && RULES.mobile.test(nationalDigits(raw))
}

/** E.164 for storage and lookups: '+99365123456'. Throws on an incomplete number; validate with isPhone first. */
export function toE164(raw: string): string {
  if (!isPhone(raw)) throw new Error(`Not a phone number of this market: ${raw}`)
  return `+${COUNTRY}${nationalDigits(raw)}`
}

/** E.164 of this market, for schemas: `+993` and the national digits. */
export const E164 = new RegExp(`^\\+${COUNTRY}\\d{${RULES.length}}$`)

/** The country code as shown in front of the number: '+993'. */
export const COUNTRY_PREFIX = `+${COUNTRY}`

/** '65 12 34 56': the national digits grouped by the market's rules; partial input as far as it goes. */
export function formatNational(raw: string): string {
  const d = nationalDigits(raw)
  const groups: string[] = []
  let at = 0
  for (const size of RULES.groups) {
    const part = d.slice(at, at + size)
    if (part) groups.push(part)
    at += size
  }
  return groups.join(' ')
}

/** '+993 65 12 34 56'; partial input is grouped as far as it goes. */
export function formatPhone(raw: string): string {
  return [COUNTRY_PREFIX, formatNational(raw)].filter(Boolean).join(' ')
}

/**
 * `+993 65 •• •• 22`: the first and last groups shown, the rest hidden. The link page's login names the booking's
 * phone this way, so the person knows where the code goes without the page giving the number away (book F-068).
 */
export function maskPhone(raw: string): string {
  const groups = formatNational(raw).split(' ')
  const masked = groups.map((g, i) => (i === 0 || i === groups.length - 1 ? g : '•'.repeat(g.length)))
  return [COUNTRY_PREFIX, masked.join(' ')].filter(Boolean).join(' ')
}
