import { focusManager, MutationObserver, QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, call, createClient, isApiError } from './client'
import { staleKeys, startEvents } from './events'
import { keys } from './keys'
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

  it('a success that isn’t the api’s JSON is an ApiError too', async () => {
    for (const res of [
      () => new Response('{"items": [', { status: 200, headers: { 'Content-Type': 'application/json' } }),
      () => new Response('<html>Gateway</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
    ]) {
      const f = fixture(res)
      const err = await call(f.client.v1.categories.$get({ query: {} })).catch((e: unknown) => e)
      expect(isApiError(err, 'internal')).toBe(true)
    }
    const f = fixture(() => new Response(null, { status: 204 }))
    expect(await call(f.client.v1.auth.logout.$post())).toBeUndefined()
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
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([
      ['bookings', 'list'],
      ['availability', 'glow-studio'],
    ])
  })

  it('a send refused for being phone-only refreshes that business page, so it shows the card (book Q-154)', async () => {
    const f = fixture(() => json(409, { error: { code: 'online_blocked' } }))
    const spy = vi.spyOn(f.queryClient, 'invalidateQueries')
    const m = f.sdk.bookings.create('tk')
    const body = { type: 'appointment' as const, business: 'glow-studio', serviceIds: ['x'], staffId: null, date: '2026-10-15', start: 870 }
    const err = await m.mutationFn!(body, {} as never).catch((e: unknown) => e)
    await m.onError!(err as ApiError, body, undefined, {} as never)
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([['business', 'glow-studio']])
  })

  it('signing in or out, or another phone, refreshes the business pages (book Q-154)', async () => {
    const me = { id: 'u', name: null, phone: '+99365000001' }
    const f = fixture(() => json(200, { me, isNew: false }))
    const spy = vi.spyOn(f.queryClient, 'invalidateQueries')
    await f.sdk.auth.verify().onSuccess!({ me, isNew: false } as never, {} as never, undefined, {} as never)
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual(['business'])
    spy.mockClear()
    f.sdk.auth.logout().onSuccess!(undefined, undefined, undefined, {} as never)
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual(['business'])
    spy.mockClear()
    await f.sdk.me.phoneVerify().onSuccess!(me as never, {} as never, undefined, {} as never)
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([['business'], ['bookings']])
  })

  it('taking an offered time caches the new booking under its own code', async () => {
    const detail = { code: 'YR-48214', business: { slug: 'glow-studio' }, status: 'confirmed' }
    const f = fixture(() => json(200, detail))
    const spy = vi.spyOn(f.queryClient, 'invalidateQueries')
    const m = f.sdk.bookings.acceptAlternative('tk')
    const vars = { code: 'YR-48213', body: { index: 0, source: 'decline' as const } }
    const data = await m.mutationFn!(vars, {} as never)
    await m.onSuccess!(data, vars, undefined, {} as never)
    expect(f.calls[0]?.url.pathname).toBe('/v1/me/bookings/YR-48213/accept-alternative')
    expect(f.queryClient.getQueryData(['bookings', 'detail', 'YR-48214', 'tk'])).toEqual(detail)
    expect(f.queryClient.getQueryData(['bookings', 'detail', 'YR-48213', 'tk'])).toBeUndefined()
    // the lists and that business's free times, not the detail just written
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([
      ['bookings', 'list'],
      ['availability', 'glow-studio'],
    ])
  })

  it('a review refreshes the business’s reviews and rating', async () => {
    const detail = { code: 'YR-46511', business: { slug: 'glow-studio' }, status: 'completed' }
    const f = fixture(() => json(200, detail))
    const spy = vi.spyOn(f.queryClient, 'invalidateQueries')
    for (const m of [f.sdk.bookings.review('tk'), f.sdk.bookings.editReview('tk')]) {
      spy.mockClear()
      const vars = { code: 'YR-46511', body: { rating: 5 } }
      await m.onSuccess!(await m.mutationFn!(vars, {} as never), vars, undefined, {} as never)
      expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual(
        expect.arrayContaining([
          ['reviews', 'glow-studio'],
          ['business', 'glow-studio'],
        ]),
      )
    }
  })

  it('the cities are cached per kilometre of position, and places carry the chosen city', async () => {
    const f = fixture(() => json(200, { items: [], main: 'ashgabat', nearest: null }))
    const a = f.sdk.catalog.cities('en', { lat: 37.95012, lng: 58.38049 })
    const b = f.sdk.catalog.cities('en', { lat: 37.95031, lng: 58.37951 })
    expect(a.queryKey).toEqual(b.queryKey)
    await f.queryClient.fetchQuery(a as never)
    expect(f.calls[0]?.url.search).toBe('?lang=en&lat=37.95&lng=58.38')
    await f.queryClient.fetchQuery(f.sdk.catalog.places('Mir', 'en', 'mary') as never)
    expect(f.calls[1]?.url.searchParams.get('city')).toBe('mary')
  })

  it('reviews are cached per language', () => {
    const f = fixture(() => json(200, {}))
    expect(f.sdk.catalog.reviews('glow-studio', 'ru').queryKey).toEqual(['reviews', 'glow-studio', 'ru'])
  })

  it('every query hands TanStack’s abort signal to its request', async () => {
    const f = fixture(() => json(200, { items: [], cursor: null }))
    const { me, catalog, availability, bookings, team, links } = f.sdk
    const id = '0b6f1a4e-6a43-4f8e-9a51-3d3f1c3b9a10'
    const queries = [
      me.get(),
      me.favorites('tk'),
      catalog.categories('tk'),
      catalog.cities('tk', { lat: 37.95, lng: 58.38 }),
      catalog.suggest('saç', 'tk'),
      catalog.places('Mir', 'tk', 'mary'),
      catalog.business('glow-studio', 'tk'),
      availability.appointment('glow-studio', { lang: 'tk', services: [id], staff: 'any' }),
      availability.specialists('glow-studio', { lang: 'tk', services: [id] }),
      availability.tables('bag-kafe', { lang: 'tk', party: 2 }),
      availability.sessions('fit-zal', { lang: 'tk' }),
      bookings.detail('YR-48213', 'tk'),
      team.workspaces(),
      team.myInvites(),
      team.invite('a-long-random-token-from-the-link'),
      team.list('glow-studio'),
      links.view('a-long-random-token-from-the-sms-link', 'tk'),
    ]
    for (const q of queries) await f.queryClient.fetchQuery(q as never)
    const pages = [catalog.search({ lang: 'tk' }), catalog.reviews('glow-studio', 'tk'), bookings.list('upcoming', 'tk')]
    for (const q of pages) await f.queryClient.fetchInfiniteQuery(q as never)
    expect(f.calls).toHaveLength(queries.length + pages.length)
    for (const c of f.calls) expect(c.init.signal, c.url.pathname).toBeInstanceOf(AbortSignal)
  })
})

describe('live events', () => {
  const me = { id: 'u1', name: 'Aýjemal Gurbanowa' }
  const eventsFixture = () =>
    fixture((url) => (url.pathname === '/v1/events' ? json(200, { items: [], cursor: '7' }) : new Response(null, { status: 204 })))
  const polls = (f: ReturnType<typeof fixture>) => f.calls.filter((c) => c.url.pathname === '/v1/events').map((c) => c.url.search)

  it('a poll asked for mid-request runs right after it instead of being dropped', async () => {
    const f = eventsFixture()
    f.queryClient.setQueryData(keys.me(), me)
    const events = startEvents(f.client, f.queryClient, { intervalMs: 60_000 })
    await events.poll()
    events.stop()
    expect(polls(f)).toEqual(['', '?after=7'])
  })

  it('polls after the person’s own mutations', async () => {
    const f = eventsFixture()
    f.queryClient.setQueryData(keys.me(), me)
    const events = startEvents(f.client, f.queryClient, { intervalMs: 60_000 })
    await events.poll()
    await new MutationObserver(f.queryClient, f.sdk.me.setFavorite()).mutate({ slug: 'glow-studio', on: true })
    await vi.waitFor(() => expect(polls(f)).toEqual(['', '?after=7', '?after=7']))
    events.stop()
  })

  it('polls only while someone is signed in and the page is visible', async () => {
    const f = eventsFixture()
    const events = startEvents(f.client, f.queryClient, { intervalMs: 60_000 })
    await events.poll()
    f.queryClient.setQueryData(keys.me(), null)
    await events.poll()
    expect(polls(f)).toEqual([])
    try {
      focusManager.setFocused(false)
      f.queryClient.setQueryData(keys.me(), me)
      await events.poll()
      expect(polls(f)).toEqual([])
      // back on the tab: catch up at once
      focusManager.setFocused(true)
      await vi.waitFor(() => expect(polls(f)).toEqual(['']))
    } finally {
      events.stop()
      focusManager.setFocused(undefined)
    }
  })

  it('signing in starts polling at once; a 401 asks who is signed in again', async () => {
    const f = fixture(() => json(401, { error: { code: 'unauthorized' } }))
    const events = startEvents(f.client, f.queryClient, { intervalMs: 60_000 })
    f.queryClient.setQueryData(keys.me(), me)
    await vi.waitFor(() => expect(polls(f)).toEqual(['']))
    await events.poll()
    events.stop()
    expect(f.queryClient.getQueryState(keys.me())?.isInvalidated).toBe(true)
  })

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
    expect(staleKeys({ type: 'review.deleted', business: 'bag-kafe', bookingCode: null })).toEqual([
      ['reviews', 'bag-kafe'],
      ['business', 'bag-kafe'],
    ])
  })

  it('team changes refresh the switcher, the invites and that team', () => {
    expect(staleKeys({ type: 'team.changed', business: 'glow-studio', bookingCode: null })).toEqual([
      ['workspaces'],
      ['invites'],
      ['team', 'glow-studio'],
    ])
  })
})
