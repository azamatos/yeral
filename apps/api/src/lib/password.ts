/** The Ýeral team's passwords (ADR 0026): PBKDF2-SHA256 through Web Crypto, a random salt, 600,000 rounds. */

export const PASSWORD_ROUNDS = 600_000

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const unb64 = (text: string) => Uint8Array.from(atob(text), (ch) => ch.charCodeAt(0))

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, rounds: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: rounds }, key, 256))
}

/** `pbkdf2-sha256$<rounds>$<salt>$<hash>`, so the rounds can grow later without breaking what's kept. */
export async function hashPassword(password: string, rounds = PASSWORD_ROUNDS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return `pbkdf2-sha256$${rounds}$${b64(salt)}$${b64(await derive(password, salt, rounds))}`
}

/** The two the same in time that doesn't depend on where they differ. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const [kind, rounds, salt, hash] = stored.split('$')
  if (kind !== 'pbkdf2-sha256' || !rounds || !salt || !hash || !(Number(rounds) > 0)) return false
  return sameBytes(await derive(password, unb64(salt), Number(rounds)), unb64(hash))
}
