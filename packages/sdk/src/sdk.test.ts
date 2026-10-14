import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, call, createClient, isApiError } from './client'
import { staleKeys } from './events'
import { createSdk } from './sdk'

const json = (status: number, body: unknown) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function fixture(respond: (url: URL, init: RequestInit) => Response) {
  const calls: { url: URL; init: RequestInit }[] = []
  const fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    calls.push({ url, init: init ?? {} })
    return Promise.resolve(respond(url, init ?? {}))
  })
  const client = createClient({ baseUrl: 'http://api.test', fetch })
  const queryClient = new QueryClient()
  return { calls, client, queryClient, sdk: createSdk(client, queryClient) }
}

describe('client', () => {
  it('sends cookies and returns the typed body', async () => {
    const f = fixture(() => json(200, { items: [] }))
    const res = await call(f.client.v1.categories.$get({ query: { lang: 'ru' } }))
    expect(res).toEqual({ items: [] })
    expect(f.calls[0]?.url.toString()).toBe('http://api.test/v1/categories?lang=ru')
    expect(f.calls[0]?.init.credentials).toBe('include')
  })

  it('turns error bodies into ApiError with the contract code', async () => {
    const f = fixture(() =>
      json(409, { error: { code: 'slot_taken', details: { alternatives: [{ date: '2026-10-15', start: 780, end: 840 }] } } }),
    )
    const err = await call(f.client.v1.categories.$get({ query: {} })).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(isApiError(err, 'slot_taken')).toBe(true)
    expect((err as ApiError).status).toBe(409)
    expect((err as ApiError).details.alternatives).toHaveLength(1)
  })

  it('a failed request is a network error', async () => {
    const client = createClient({ baseUrl: 'http://api.test', fetch: () => Promise.reject(new TypeError('offline')) })
    const err = await call(client.v1.categories.$get({ query: {} })).catch((e: unknown) => e)
    expect(isApiError(err, 'network')).toBe(true)
  })
})

describe('sdk', () => {
  it('me is null when signed out, not an error', async () => {
    const f = fixture(() => json(401, { error: { code: 'unauthorized' } }))
    expect(await f.queryClient.fetchQuery(f.sdk.me.get())).toBeNull()
  })

  it('search pages with the cursor and drops empty parameters', async () => {
    const f = fixture((url) =>
      json(200, { items: [], total: 30, cursor: url.searchParams.get('cursor') === '12' ? null : '12', located: true }),
    )
    const opts = f.sdk.catalog.search({ lang: 'tk', lat: 37.95, lng: 58.38, q: '', openNow: true })
    const data = await f.queryClient.fetchInfiniteQuery(opts)
    expect(opts.getNextPageParam(data.pages[0]!, data.pages, '', [''])).toBe('12')
    expect(Object.fromEntries(f.calls[0]!.url.searchParams)).toEqual({ lang: 'tk', lat: '37.95', lng: '58.38', openNow: '1' })
  })

  it('a sent booking is cached and refreshes my lists and that business’s free times', async () => {
    const detail = { code: 'YR-48213', business: { slug: 'glow-studio' }, status: 'pending' }
    const f = fixture(() => json(201, detail))
    const spy = vi.spyOn(f.queryClient, 'invalidateQueries')
    const m = f.sdk.bookings.create('tk')
    const data = await m.mutationFn!(
      { type: 'appointment', business: 'glow-studio', serviceIds: ['x'], staffId: null, date: '2026-10-15', start: 870 },
      {} as never,
    )
    await m.onSuccess!(data, {} as never, undefined, {} as never)
    expect(f.queryClient.getQueryData(['bookings', 'detail', 'YR-48213', 'tk'])).toEqual(detail)
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([['bookings'], ['availability', 'glow-studio']])
  })
})

describe('live events', () => {
  it('booking events refresh bookings and the business’s free times; reviews refresh reviews', () => {
    expect(staleKeys({ type: 'booking.confirmed', business: 'glow-studio', bookingCode: 'YR-48213' })).toEqual([
      ['bookings'],
      ['availability', 'glow-studio'],
      ['business', 'glow-studio'],
    ])
    expect(staleKeys({ type: 'review.created', business: 'bag-kafe', bookingCode: null })).toEqual([
      ['reviews', 'bag-kafe'],
      ['business', 'bag-kafe'],
    ])
  })
})
