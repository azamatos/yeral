import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { createAdmin } from './admin'
import { createClient, isApiError } from './client'
import { keys } from './keys'

const json = (status: number, body: unknown) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const ME = { id: 'a1', login: 'aýna', name: 'Aýna', recoveryCodesLeft: 10 }
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

  it('signing in fills me; a wrong part keeps nobody signed in', async () => {
    const f = fixture(() => json(200, ME))
    const signIn = f.admin.signIn()
    const me = await signIn.mutationFn?.({ login: 'ayna', password: 'x', code: '123456' }, undefined as never)
    await signIn.onSuccess?.(me as never, undefined as never, undefined as never, undefined as never)
    expect(f.queryClient.getQueryData(keys.adminMe())).toEqual(ME)
    expect(f.calls[0]?.url.pathname).toBe('/v1/admin/sign-in')
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
    await verify.onSuccess?.(undefined as never, 1700, undefined as never, undefined as never)
    expect(f.queryClient.getQueryState(keys.adminBusinesses({ view: 'review' }))?.isInvalidated).toBe(true)
    unsubscribe()
  })
})
