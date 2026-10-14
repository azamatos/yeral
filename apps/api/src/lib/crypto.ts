/** Web Crypto helpers (browsers, Node 20+, Workers). */

export function randomToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes))
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** `n` random decimal digits, uniformly. */
export function randomDigits(n: number): string {
  const out: string[] = []
  const buf = new Uint8Array(1)
  while (out.length < n) {
    crypto.getRandomValues(buf)
    const v = buf[0] ?? 255
    if (v < 250) out.push(String(v % 10))
  }
  return out.join('')
}
