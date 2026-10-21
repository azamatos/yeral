/** A signed-in Ýeral team member for the admin endpoints' tests (ADR 0026). */
import { inviteOrReset } from '../src/modules/admin/accounts'
import { stepOf, totpAt } from '../src/lib/totp'
import { site, type testApp } from './app'
import { browser } from './client'

/** The secret as the setup gives it to the app (base32), back to bytes. */
export function fromBase32(text: string): Uint8Array<ArrayBuffer> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const out: number[] = []
  let bits = 0
  let value = 0
  for (const ch of text) {
    value = (value << 5) | alphabet.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

/** A browser on the admin tool's site. */
export function cmsBrowser(t: ReturnType<typeof testApp>) {
  const b = browser(t.app)
  return {
    req: (path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
      b.req(path, { ...init, headers: { Origin: site.urls.cms, ...init.headers } }),
    get cookie() {
      return b.cookie
    },
  }
}

/** An account set up from the server command's link and signed in. */
export async function signedInAdmin(t: ReturnType<typeof testApp>, login: string, name = 'Team member') {
  const b = cmsBrowser(t)
  const link = await inviteOrReset(t.deps, login, name)
  const token = link.url.slice(link.url.lastIndexOf('/') + 1)
  const secret = fromBase32(
    (await b.req(`/v1/admin/setup/${token}/password`, { body: { password: 'a long enough password' } })).json.secret,
  )
  const confirmed = await b.req(`/v1/admin/setup/${token}/confirm`, { body: { code: await totpAt(secret, stepOf(t.clock.now)) } })
  if (confirmed.status !== 200) throw new Error(`admin setup: ${confirmed.status} ${JSON.stringify(confirmed.json)}`)
  return b
}
