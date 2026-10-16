/**
 * Turkmen phone numbers: country code 993 + 8 national digits. Stored as E.164 (`+99365123456`), shown as
 * `+993 65 12 34 56` (design: PhoneInput with a fixed +993 prefix).
 */

const NATIONAL_DIGITS = 8
const COUNTRY = '993'

/**
 * The digits after the country code (993) or the trunk prefix (8), as typed. National numbers start with 1–7, never
 * with 8 or 9, so a leading 993 or 8 is always a prefix, even in partial input; a '+' followed by part of 993 is too.
 * The 8 can also follow the 993: a field that shows "+993" gets the local form "8 65 …" typed after it.
 */
function afterPrefix(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+') && COUNTRY.startsWith(digits)) return ''
  const rest = digits.startsWith(COUNTRY) ? digits.slice(COUNTRY.length) : digits
  return rest.startsWith('8') ? rest.slice(1) : rest
}

/** The 8 national digits from any input ('+993 65 12-34-56', '99365123456', '8 65 123456'); may be shorter while typing. */
export function nationalDigits(raw: string): string {
  return afterPrefix(raw).slice(0, NATIONAL_DIGITS)
}

/** A complete Turkmen number. */
export function isPhone(raw: string): boolean {
  return /^[1-7]\d{7}$/.test(afterPrefix(raw))
}

/** Mobile numbers start with 6 or 7 (61–65, 71 today); only they can receive the login code. */
export function isMobile(raw: string): boolean {
  return isPhone(raw) && /^[67]/.test(nationalDigits(raw))
}

/** E.164 for storage and lookups: '+99365123456'. Throws on an incomplete number; validate with isPhone first. */
export function toE164(raw: string): string {
  if (!isPhone(raw)) throw new Error(`Not a Turkmen phone number: ${raw}`)
  return `+993${nationalDigits(raw)}`
}

/** '+993 65 12 34 56'; partial input is grouped as far as it goes. */
export function formatPhone(raw: string): string {
  const d = nationalDigits(raw)
  const groups = [d.slice(0, 2), d.slice(2, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean)
  return ['+993', ...groups].join(' ')
}
