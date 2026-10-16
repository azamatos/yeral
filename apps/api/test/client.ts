import type { createApp } from '../src/app'
import { ORIGIN } from './app'

type App = ReturnType<typeof createApp>

/** A browser-like client: keeps the session cookie, sends our Origin and JSON. */
export function browser(app: App) {
  let cookie = ''
  const req = async (path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) => {
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
    const set = res.headers.get('set-cookie')
    if (set) cookie = set.split(';')[0] ?? ''
    if (set?.includes('Expires=Thu, 01 Jan 1970')) cookie = ''
    const text = await res.text()
    const json: any = text ? JSON.parse(text) : null
    return { status: res.status, json, headers: res.headers }
  }
  return {
    req,
    get cookie() {
      return cookie
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
