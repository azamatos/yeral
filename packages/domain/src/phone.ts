/**
 * Turkmen phone numbers: country code 993 + 8 national digits. Stored as E.164 (`+99365123456`), shown as
 * `+993 65 12 34 56` (design: PhoneInput with a fixed +993 prefix).
 */

const NATIONAL_DIGITS = 8

/** The 8 national digits from any input ('+993 65 12-34-56', '99365123456', '65 123456'); may be shorter while typing. */
export function nationalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  const national = digits.length > NATIONAL_DIGITS && digits.startsWith('993') ? digits.slice(3) : digits
  return national.slice(0, NATIONAL_DIGITS)
}

/** A complete Turkmen number. */
export function isPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '')
  return digits.length === NATIONAL_DIGITS || (digits.length === NATIONAL_DIGITS + 3 && digits.startsWith('993'))
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
