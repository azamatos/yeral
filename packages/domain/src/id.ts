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

/** The largest multiple of 10 a Uint32 reaches; draws above it are redrawn so every digit is equally likely. */
const DIGIT_LIMIT = 2 ** 32 - (2 ** 32 % 10)

function randomDigit(from: number): number {
  const draw = new Uint32Array(1)
  for (;;) {
    const [n = 0] = webCrypto.getRandomValues(draw)
    if (n < DIGIT_LIMIT && n % 10 >= from) return n % 10
  }
}

/**
 * `YR-` + `digits` random digits, never starting with 0. Codes are unique in the database; on a collision the api
 * retries, and grows to more digits after a few tries, so codes never run out. One draw per digit, so any length
 * gets the whole range without bias.
 */
export function bookingCode(digits = 5): string {
  let code = String(randomDigit(1))
  for (let i = 1; i < digits; i++) code += String(randomDigit(0))
  return `${BOOKING_CODE_PREFIX}${code}`
}

export function isBookingCode(s: string): boolean {
  return /^YR-[1-9]\d{4,}$/.test(s)
}
