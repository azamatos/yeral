import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { createAdmin } from './admin'
import { createClient, isApiError } from './client'
import { keys } from './keys'

const json = (status: number, body: unknown) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const ME = { id: 'a1', login: 'aýna', name: 'Aýna', role: 'admin', recoveryCodesLeft: 10 }
const CHALLENGE = { challenge: 'a-challenge-token-of-some-length', login: 'aýna', expiresAt: Date.UTC(2026, 10, 6, 9, 5) }
const UNAUTHORIZED = () => json(401, { error: { code: 'unauthorized' } })

function fixture(respond: (url: URL, init: RequestInit) => Response) {
  const calls: { url: URL; init: RequestInit }[] = []
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    calls.push({ url, init: init ?? {} })
    return Promise.resolve(respond(url, init ?? {}))
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return { calls, queryClient, admin: createAdmin(createClient({ baseUrl: 'http://api.test', fetch }), queryClient) }
}

describe('admin', () => {
  it('me is null when nobody is signed in, and an error otherwise stays one', async () => {
    const f = fixture(UNAUTHORIZED)
    await expect(f.queryClient.fetchQuery(f.admin.me())).resolves.toBeNull()
    const g = fixture(() => json(503, { error: { code: 'admin_unavailable' } }))
    const error = await g.queryClient.fetchQuery(g.admin.me()).catch((e: unknown) => e)
    expect(isApiError(error, 'admin_unavailable')).toBe(true)
  })

  it('signing in takes two steps: the password step answers a challenge, the code step fills me', async () => {
    const f = fixture((url) => json(200, url.pathname.endsWith('/code') ? ME : CHALLENGE))
    const signIn = f.admin.signIn()
    const challenge = await signIn.mutationFn?.({ login: 'ayna', password: 'x' }, undefined as never)
    expect(challenge).toEqual(CHALLENGE)
    expect(f.queryClient.getQueryData(keys.adminMe())).toBeUndefined()
    const signInCode = f.admin.signInCode()
    const me = await signInCode.mutationFn?.({ challenge: CHALLENGE.challenge, code: '123456' }, undefined as never)
    await signInCode.onSuccess?.(me as never, undefined as never, undefined, undefined as never)
    expect(f.queryClient.getQueryData(keys.adminMe())).toEqual(ME)
    expect(f.calls.map((c) => c.url.pathname)).toEqual(['/v1/admin/sign-in', '/v1/admin/sign-in/code'])
  })

  it('a 401 from a list ends the session here: me is null and what the team saw goes', async () => {
    const f = fixture(UNAUTHORIZED)
    f.queryClient.setQueryData(keys.adminMe(), ME)
    f.queryClient.setQueryData(keys.adminTeam(), { items: [] })
    await f.queryClient.fetchQuery(f.admin.businesses({ view: 'review' })).catch(() => undefined)
    expect(f.queryClient.getQueryData(keys.adminMe())).toBeNull()
    expect(f.queryClient.getQueryData(keys.adminTeam())).toBeUndefined()
  })

  it('a wrong sign-in is not a session ending', async () => {
    const f = fixture(() => json(401, { error: { code: 'sign_in_failed' } }))
    f.queryClient.setQueryData(keys.adminMe(), ME)
    await f.queryClient.fetchQuery(f.admin.team()).catch(() => undefined)
    expect(f.queryClient.getQueryData(keys.adminMe())).toEqual(ME)
  })

  it('asks for a view and a search, and leaves an empty search out', async () => {
    const f = fixture(() => json(200, { items: [] }))
    await f.queryClient.fetchQuery(f.admin.businesses({ view: 'moved', q: 'glow' }))
    await f.queryClient.fetchQuery(f.admin.businesses({ view: 'review', q: '' }))
    expect(f.calls[0]?.url.search).toBe('?view=moved&q=glow')
    expect(f.calls[1]?.url.search).toBe('?view=review')
  })

  it('a business that changed refreshes its page and every list', async () => {
    const f = fixture(() => json(204, null))
    const list = new QueryObserver(f.queryClient, { ...f.admin.businesses({ view: 'review' }), enabled: false })
    const unsubscribe = list.subscribe(() => undefined)
    f.queryClient.setQueryData(keys.adminBusinesses({ view: 'review' }), { items: [] })
    const verify = f.admin.verify('b1')
    await verify.mutationFn?.(1700, undefined as never)
    expect(f.calls[0]?.url.search).toBe('?moved=1700')
    await verify.onSuccess?.(undefined, 1700, undefined, undefined as never)
    expect(f.queryClient.getQueryState(keys.adminBusinesses({ view: 'review' }))?.isInvalidated).toBe(true)
    unsubscribe()
  })
})
