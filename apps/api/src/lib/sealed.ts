/**
 * Secrets kept sealed in the database (ADR 0026): AES-256-GCM under a key from the environment, so a copy of the
 * database alone doesn't give them. `<iv>.<ciphertext>`, both base64url.
 */

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
const unb64url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0))

/** The sealing key from its 32 raw bytes. */
export const sealingKey = (raw: Uint8Array<ArrayBuffer>) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
export type SealingKey = Awaited<ReturnType<typeof sealingKey>>

export async function seal(key: SealingKey, plain: Uint8Array<ArrayBuffer>): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  return `${b64url(iv)}.${b64url(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain)))}`
}

/** What `seal` kept; it throws for anything sealed under another key or changed since. */
export async function unseal(key: SealingKey, sealed: string): Promise<Uint8Array<ArrayBuffer>> {
  const [iv, data] = sealed.split('.')
  if (!iv || !data) throw new Error('not a sealed value')
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64url(iv) }, key, unb64url(data)))
}
