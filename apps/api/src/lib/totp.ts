/**
 * Authenticator codes (ADR 0026; RFC 6238 over RFC 4226): a new 6-digit code every 30 seconds from a shared secret,
 * HMAC-SHA1, as every authenticator app makes them.
 */

export const TOTP_STEP_MS = 30_000
const DIGITS = 6
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** 20 random bytes, the length RFC 4226 recommends. */
export const newTotpSecret = () => crypto.getRandomValues(new Uint8Array(20))

/** RFC 4648 base32 without padding, as authenticator apps take a secret. */
export function base32(bytes: Uint8Array): string {
  let out = ''
  let bits = 0
  let value = 0
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

/** The code for a 30-second step. */
export async function totpAt(secret: Uint8Array<ArrayBuffer>, step: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  const counter = new Uint8Array(8)
  new DataView(counter.buffer).setBigUint64(0, BigInt(step))
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter))
  const at = mac[19]! & 0x0f
  const n = ((mac[at]! & 0x7f) << 24) | (mac[at + 1]! << 16) | (mac[at + 2]! << 8) | mac[at + 3]!
  return String(n % 10 ** DIGITS).padStart(DIGITS, '0')
}

export const stepOf = (now: number) => Math.floor(now / TOTP_STEP_MS)

/**
 * The step `code` belongs to, one step either side of now (a clock a little off), after `usedStep` only: a code works
 * once. Null when it matches none.
 */
export async function matchTotp(
  secret: Uint8Array<ArrayBuffer>,
  code: string,
  now: number,
  usedStep: number | null,
): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null
  for (const step of [stepOf(now) - 1, stepOf(now), stepOf(now) + 1]) {
    if (usedStep !== null && step <= usedStep) continue
    if ((await totpAt(secret, step)) === code) return step
  }
  return null
}

/** What an authenticator app reads from the QR code. */
export const otpauthUri = (secret: Uint8Array, issuer: string, account: string) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${base32(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${TOTP_STEP_MS / 1000}`
