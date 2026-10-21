import type { createApp } from '../src/app'
import { ORIGIN } from './app'

type App = ReturnType<typeof createApp>

/** A browser-like client: keeps its cookies (the session's, the demo's), sends our Origin and JSON. */
export function browser(app: App) {
  const jar = new Map<string, string>()
  const cookieHeader = () => [...jar].map(([name, value]) => `${name}=${value}`).join('; ')
  const req = async (path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
    const cookie = cookieHeader()
    const res = await app.request(path, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: {
        Origin: ORIGIN,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    })
    for (const set of res.headers.getSetCookie()) {
      const [pair = ''] = set.split(';')
      const at = pair.indexOf('=')
      const [name, value] = [pair.slice(0, at), pair.slice(at + 1)]
      if (set.includes('Expires=Thu, 01 Jan 1970') || /Max-Age=0\b/i.test(set)) jar.delete(name)
      else jar.set(name, value)
    }
    const text = await res.text()
    const json: any = text ? JSON.parse(text) : null
    return { status: res.status, json, headers: res.headers }
  }
  return {
    req,
    get cookie() {
      return cookieHeader()
    },
    /** Sign in with the demo code. */
    async login(phone: string, name?: string) {
      const sent = await req('/v1/auth/code', { body: { phone } })
      if (sent.status !== 200) throw new Error(`code: ${sent.status} ${JSON.stringify(sent.json)}`)
      const verified = await req('/v1/auth/verify', { body: { phone, code: '1234' } })
      if (verified.status !== 200) throw new Error(`verify: ${verified.status} ${JSON.stringify(verified.json)}`)
      if (name && verified.json.isNew) await req('/v1/me', { method: 'PATCH', body: { name } })
      return verified.json
    },
  }
}

/**
 * `GET /v1/events?after=` until `ready` holds for the items (≤ 5 s; by default: anything arrived). Events show once every
 * older transaction on the server has finished, and other test files seed in parallel, so an earlier event can show
 * while the one a test waits for is still held back: wait for that one.
 */
export async function eventsAfter(
  b: ReturnType<typeof browser>,
  cursor: string,
  ready: (items: { type: string; bookingCode: string | null }[]) => boolean = (items) => items.length > 0,
) {
  for (let i = 0; ; i++) {
    const res = await b.req(`/v1/events?after=${cursor}`)
    if (ready(res.json.items ?? []) || i >= 50) return res
    await new Promise((r) => setTimeout(r, 100))
  }
}
