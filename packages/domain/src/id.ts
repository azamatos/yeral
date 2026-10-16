/**
 * Identifiers. Rows use UUIDs; bookings also get a short code people can read out on the phone (`YR-48213`).
 * Web Crypto is a web-standard global in browsers, Node 20+ and Workers.
 */

interface WebCrypto {
  randomUUID(): string
  getRandomValues<T extends Uint32Array>(array: T): T
}

const webCrypto = (globalThis as unknown as { crypto: WebCrypto }).crypto

export function newId(): string {
  return webCrypto.randomUUID()
}

export const BOOKING_CODE_PREFIX = 'YR-'

/**
 * `YR-` + `digits` random digits, never starting with 0. Codes are unique in the database; on a collision the api
 * retries, and grows to more digits after a few tries, so codes never run out.
 */
export function bookingCode(digits = 5): string {
  const [n = 0] = webCrypto.getRandomValues(new Uint32Array(1))
  const min = 10 ** (digits - 1)
  return `${BOOKING_CODE_PREFIX}${min + (n % (9 * min))}`
}

export function isBookingCode(s: string): boolean {
  return /^YR-[1-9]\d{4,}$/.test(s)
}
