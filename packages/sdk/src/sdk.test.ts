import { focusManager, MutationObserver, QueryClient, QueryObserver } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { ApiError, call, createClient, isApiError } from './client'
import { staleKeys, startEvents } from './events'
import { audienceOf, keys } from './keys'
import { createSdk } from './sdk'

const json = (status: number, body: unknown) =>
  new Response(body === null ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function fixture(respond: (url: URL, init: RequestInit) => Response | Promise<Response>) {
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
      ['bookings', 'how-was-it'],
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

  describe('who is signed in', () => {
    const before = { id: 'u1', name: 'Aýjemal Gurbanowa', phone: '+99365000001' }
    const after = { id: 'u2', name: 'Merdan Ataýew', phone: '+99365000002' }
    // what the person before had in the cache: theirs, what answers per viewer, and the catalogue anyone sees
    const person = [
      keys.workspaces(),
      keys.invites(),
      keys.team('glow-studio'),
      keys.calendar('glow-studio'),
      keys.requests('glow-studio'),
      keys.clients('glow-studio'),
      keys.settings('glow-studio'),
      keys.bookingList('upcoming', 'tk'),
      keys.favorites('tk'),
    ]
    const viewer = [
      keys.business('glow-studio', 'tk', null),
      keys.reviews('glow-studio', 'tk'),
      keys.availability('glow-studio', 'appointment', { move: 'YR-48213' }),
      keys.invite('a-long-random-token-from-the-link'),
      keys.link('a-long-random-token-from-the-sms-link', 'tk'),
    ]
    const anyone = [keys.authMode(), keys.categories('tk'), keys.searchAll()]
    type F = ReturnType<typeof fixture>
    const seeded = (respond: (url: URL) => Response | Promise<Response> = () => json(200, {})) => {
      const f = fixture(respond)
      f.queryClient.setQueryData(keys.me(), before)
      for (const key of [...person, ...viewer, ...anyone]) f.queryClient.setQueryData(key, { of: before.id })
      return f
    }
    const kept = (f: F) => (key: readonly unknown[]) => f.queryClient.getQueryData(key) !== undefined
    const stale = (f: F) => (key: readonly unknown[]) => f.queryClient.getQueryState(key)?.isInvalidated === true
    const signIns = [
      (f: F, me: unknown) => f.sdk.auth.verify().onSuccess!({ me, isNew: false } as never, {} as never, undefined, {} as never),
      (f: F, me: unknown) => f.sdk.auth.answerIdentity().onSuccess!({ me, isNew: false } as never, {} as never, undefined, {} as never),
      // the SMS link page signs in the booking's phone, over whoever was there (book Q-169)
      (f: F, me: unknown) =>
        f.sdk.links.verify('a-long-random-token-from-the-sms-link').onSuccess!(
          { me, isNew: false } as never,
          {} as never,
          undefined,
          {} as never,
        ),
    ]

    it('every query key says whose answer it is', () => {
      expect([...person, keys.me(), keys.schedule('glow-studio', 's1'), keys.booking('YR-48213', 'tk')].map(audienceOf)).toEqual(
        Array(person.length + 3).fill('person'),
      )
      expect(viewer.map(audienceOf)).toEqual(Array(viewer.length).fill('viewer'))
      expect([...anyone, keys.cities('tk', null), keys.suggestAll(), keys.places('Mir', 'tk', null)].map(audienceOf)).toEqual(
        Array(anyone.length + 3).fill('anyone'),
      )
    })

    it('signing in over someone else empties their queries and what they saw as a team member', async () => {
      for (const signIn of signIns) {
        const f = seeded()
        await signIn(f, after)
        expect(f.queryClient.getQueryData(keys.me())).toEqual(after)
        expect([...person, ...viewer].filter(kept(f))).toEqual([])
        expect(anyone.filter(kept(f))).toEqual(anyone)
      }
    })

    it('signing in from nobody, or as the same person again, refreshes the viewer’s answers in the background', async () => {
      for (const [signIn, was] of signIns.flatMap((s) => [[s, null] as const, [s, before] as const])) {
        const f = seeded()
        f.queryClient.setQueryData(keys.me(), was)
        await signIn(f, before)
        expect(person.filter(kept(f))).toEqual([])
        expect(viewer.filter(kept(f))).toEqual(viewer)
        expect(viewer.filter(stale(f))).toEqual(viewer)
        expect(anyone.filter(stale(f))).toEqual([])
      }
    })

    it('“Is this you?” keeps the person on screen until it’s answered', async () => {
      const f = seeded()
      await f.sdk.auth.verify().onSuccess!({ isThisYou: { name: 'Merdan', ticket: 't' } }, {} as never, undefined, {} as never)
      expect(f.queryClient.getQueryData(keys.me())).toEqual(before)
      expect([...person, ...viewer].filter(kept(f))).toEqual([...person, ...viewer])
    })

    it('logging out or deleting the account forgets the person and what they sent; the catalogue stays', async () => {
      for (const signOut of [
        (f: F) => f.sdk.auth.logout().onSuccess!(undefined, undefined, undefined, {} as never),
        (f: F) => f.sdk.me.remove().onSuccess!(undefined, undefined, undefined, {} as never),
      ]) {
        const f = seeded()
        // a finished change with a client's number in it
        await new MutationObserver(f.queryClient, f.sdk.clients.add('glow-studio')).mutate({ phone: '+99365000003' })
        // a screen still showing the workspaces: it goes empty, without asking again
        const onScreen = new QueryObserver(f.queryClient, { queryKey: keys.workspaces(), enabled: false })
        const off = onScreen.subscribe(() => undefined)
        void signOut(f)
        expect(f.queryClient.getQueryData(keys.me())).toBeNull()
        expect([...person, ...viewer].filter(kept(f))).toEqual([])
        expect(anyone.filter(kept(f))).toEqual(anyone)
        expect(onScreen.getCurrentResult().data).toBeUndefined()
        // the rest leave the cache, so nothing piles up on a shared device
        expect(f.queryClient.getQueryCache().find({ queryKey: keys.team('glow-studio') })).toBeUndefined()
        expect(f.queryClient.getMutationCache().getAll()).toEqual([])
        off()
      }
    })

    it('a 401 from any request means the session ended: the person is forgotten', async () => {
      const ended = () => json(401, { error: { code: 'unauthorized' } })
      const query = seeded(ended)
      await query.queryClient.fetchQuery(query.sdk.team.workspaces()).catch(() => undefined)
      await vi.waitFor(() => expect(query.queryClient.getQueryData(keys.me())).toBeNull())
      expect([...person, ...viewer].filter(kept(query))).toEqual([])

      const mutation = seeded(ended)
      await new MutationObserver(mutation.queryClient, mutation.sdk.team.open()).mutate('glow-studio').catch(() => undefined)
      await vi.waitFor(() => expect(mutation.queryClient.getQueryData(keys.me())).toBeNull())

      // `me` itself answers null, and what the person had goes with it
      const me = seeded(ended)
      expect(await me.queryClient.fetchQuery({ ...me.sdk.me.get(), staleTime: 0 })).toBeNull()
      expect([...person, ...viewer].filter(kept(me))).toEqual([])
      expect(anyone.filter(kept(me))).toEqual(anyone)
    })

    it('the first 401 counts, even on a request that would be tried again', async () => {
      const f = seeded(() => json(401, { error: { code: 'unauthorized' } }))
      const asking = f.queryClient.fetchQuery({ ...f.sdk.team.workspaces(), retry: 3, retryDelay: 60_000 }).catch(() => undefined)
      await vi.waitFor(() => expect(f.queryClient.getQueryData(keys.me())).toBeNull())
      await asking
    })

    it('a 401 for a request sent before someone signed in here leaves the new person signed in', async () => {
      let answer: (res: Response) => void = () => undefined
      const f = seeded((url) => (url.pathname.endsWith('/open') ? new Promise<Response>((resolve) => (answer = resolve)) : json(200, {})))
      const late = new MutationObserver(f.queryClient, f.sdk.team.open()).mutate('glow-studio').catch(() => undefined)
      await vi.waitFor(() => expect(f.calls).toHaveLength(1))
      await new Promise((resolve) => setTimeout(resolve, 2))
      await f.sdk.auth.verify().onSuccess!({ me: after, isNew: false } as never, {} as never, undefined, {} as never)
      answer(json(401, { error: { code: 'unauthorized' } }))
      await late
      await Promise.resolve()
      expect(f.queryClient.getQueryData(keys.me())).toEqual(after)
    })

    it('an answer that lands after the log-out doesn’t bring the person back', async () => {
      const f = seeded()
      f.sdk.auth.logout().onSuccess!(undefined, undefined, undefined, {} as never)
      await f.sdk.me.update().onSuccess!(before as never, {}, undefined, {} as never)
      await f.sdk.me.phoneVerify().onSuccess!(before as never, {} as never, undefined, {} as never)
      expect(f.queryClient.getQueryData(keys.me())).toBeNull()
    })

    it('a 401 while nobody is signed in changes nothing', async () => {
      const f = seeded(() => json(401, { error: { code: 'unauthorized' } }))
      f.queryClient.setQueryData(keys.me(), null)
      await f.queryClient.fetchQuery({ ...f.sdk.me.favorites('en'), staleTime: 0 }).catch(() => undefined)
      await Promise.resolve()
      expect([...person, ...viewer].filter(kept(f))).toEqual([...person, ...viewer])
    })

    it('a /me already on its way can’t bring back the person who logged out', async () => {
      let answer: (res: Response) => void = () => undefined
      const f = seeded((url) => (url.pathname === '/v1/me' ? new Promise<Response>((resolve) => (answer = resolve)) : json(204, null)))
      const asking = f.queryClient.fetchQuery({ ...f.sdk.me.get(), staleTime: 0 }).catch(() => undefined)
      await vi.waitFor(() => expect(f.calls).toHaveLength(1))
      f.sdk.auth.logout().onSuccess!(undefined, undefined, undefined, {} as never)
      answer(json(200, before))
      await asking
      expect(f.queryClient.getQueryData(keys.me())).toBeNull()
    })

    it('leaving a workspace forgets it, and nothing else', async () => {
      const f = seeded()
      const nails = [keys.team('glow-nails'), keys.calendar('glow-nails'), keys.business('glow-nails', 'tk', null)]
      for (const key of nails) f.queryClient.setQueryData(key, { of: before.id })
      await f.sdk.team.leave().onSuccess!(undefined, 'glow-studio', undefined, {} as never)
      const studio = [...person, ...viewer].filter((key) => key[1] === 'glow-studio')
      expect(studio.filter(kept(f))).toEqual([])
      expect(nails.filter(kept(f))).toEqual(nails)
      expect(f.queryClient.getQueryData(keys.me())).toEqual(before)
      // a workspace named like a part of another key takes only its own
      await f.sdk.team.leave().onSuccess!(undefined, 'tk', undefined, {} as never)
      await f.sdk.team.leave().onSuccess!(undefined, 'list', undefined, {} as never)
      expect([keys.favorites('tk'), keys.bookingList('upcoming', 'tk')].filter(kept(f))).toHaveLength(2)
    })

    it('a workspace the person is no longer on counts as left; other refusals keep it', async () => {
      const f = seeded()
      await f.sdk.team.leave().onError!(new ApiError(404, 'not_found'), 'glow-studio', undefined, {} as never)
      const studio = [...person, ...viewer].filter((key) => key[1] === 'glow-studio')
      expect(studio.filter(kept(f))).toEqual([])
      expect(f.queryClient.getQueryState(keys.workspaces())?.isInvalidated).toBe(true)

      const owner = seeded()
      await owner.sdk.team.leave().onError!(new ApiError(409, 'owner_cannot_leave'), 'glow-studio', undefined, {} as never)
      expect(studio.filter(kept(owner))).toEqual(studio)
    })

    it('a number change the account can’t make now asks for the account again', async () => {
      const f = seeded()
      await f.sdk.me.phoneCode().onError!(new ApiError(409, 'phone_change_unavailable'), {} as never, undefined, {} as never)
      expect(f.queryClient.getQueryState(keys.me())?.isInvalidated).toBe(true)
      const g = seeded()
      await g.sdk.me.phoneCode().onError!(new ApiError(409, 'phone_taken'), {} as never, undefined, {} as never)
      expect(g.queryClient.getQueryState(keys.me())?.isInvalidated).toBe(false)
    })

    it('accepting an invite refreshes what that business shows its team, not every business', async () => {
      const f = seeded()
      f.queryClient.setQueryData(keys.business('glow-nails', 'tk', null), { of: before.id })
      await f.sdk.team.accept().onSuccess!({ slug: 'glow-nails' } as never, 'inv-1', undefined, {} as never)
      // (the invite link's page sits under the invites, which an accept refreshes anyway)
      expect(viewer.filter((key) => key[0] !== keys.invites()[0]).filter(stale(f))).toEqual([])
      expect(f.queryClient.getQueryState(keys.business('glow-nails', 'tk', null))?.isInvalidated).toBe(true)
    })

    it('another phone refreshes the viewer’s answers, the bookings and the invites (sent to a phone)', async () => {
      const f = seeded()
      await f.sdk.me.phoneVerify().onSuccess!(before as never, {} as never, undefined, {} as never)
      expect([...viewer, keys.bookingList('upcoming', 'tk'), keys.invites()].filter(stale(f))).toHaveLength(viewer.length + 2)
    })
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
    // the lists, "How was it?" and that business's free times, not the detail just written
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([
      ['bookings', 'list'],
      ['bookings', 'how-was-it'],
      ['availability', 'glow-studio'],
    ])
  })

  it('a review refreshes the business’s reviews and rating, and ends "How was it?" (book F-243)', async () => {
    const detail = { code: 'YR-46511', business: { slug: 'glow-studio' }, status: 'completed' }
    const f = fixture(() => json(200, detail))
    const spy = vi.spyOn(f.queryClient, 'invalidateQueries')
    for (const m of [f.sdk.bookings.review('tk'), f.sdk.bookings.editReview('tk')]) {
      spy.mockClear()
      const vars = { code: 'YR-46511', body: { rating: 5 } }
      await m.onSuccess!(await m.mutationFn!(vars, {} as never), vars, undefined, {} as never)
      expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual(
        expect.arrayContaining([
          ['bookings', 'how-was-it'],
          ['reviews', 'glow-studio'],
          ['business', 'glow-studio'],
        ]),
      )
    }
  })

  it('closing "How was it?" refreshes it, so the visit before it asks (book F-243)', async () => {
    const f = fixture(() => new Response(null, { status: 204 }))
    const spy = vi.spyOn(f.queryClient, 'invalidateQueries')
    const m = f.sdk.bookings.closeHowWasIt()
    await m.onSuccess!(await m.mutationFn!('YR-46511', {} as never), 'YR-46511', undefined, {} as never)
    expect(f.calls[0]?.url.pathname).toBe('/v1/me/bookings/YR-46511/how-was-it/close')
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toEqual([['bookings', 'how-was-it']])
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
    const { me, catalog, availability, bookings, team, settings, requests, calendar, links } = f.sdk
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
      settings.rules('glow-studio'),
      settings.menu('glow-studio'),
      settings.profile('glow-studio'),
      settings.hours('glow-studio'),
      requests.list('glow-studio'),
      calendar.freeTimes('glow-studio', { services: [id] }),
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
      ['requests', 'glow-studio'],
      ['calendar', 'glow-studio'],
      ['clients', 'glow-studio'],
    ])
    expect(staleKeys({ type: 'review.created', business: 'bag-kafe', bookingCode: null })).toEqual([
      ['reviews', 'bag-kafe'],
      ['business', 'bag-kafe'],
      // the switcher's "Jogapsyz"
      ['workspaces'],
    ])
    expect(staleKeys({ type: 'review.deleted', business: 'bag-kafe', bookingCode: null })).toEqual([
      ['reviews', 'bag-kafe'],
      ['business', 'bag-kafe'],
      // the switcher's "Jogapsyz"
      ['workspaces'],
    ])
  })

  it('team changes refresh the switcher, the invites, that team, its calendar columns and its page', () => {
    expect(staleKeys({ type: 'team.changed', business: 'glow-studio', bookingCode: null })).toEqual([
      ['workspaces'],
      ['invites'],
      ['setup'],
      ['me'],
      ['team', 'glow-studio'],
      ['calendar', 'glow-studio'],
      ['business', 'glow-studio'],
    ])
  })

  it('a reply, a report or a recount refreshes the reviews, the team’s list with them, and the page', () => {
    expect(staleKeys({ type: 'review.updated', business: 'glow-studio', bookingCode: null })).toEqual([
      ['reviews', 'glow-studio'],
      ['business', 'glow-studio'],
      // the switcher's "Jogapsyz"
      ['workspaces'],
    ])
  })

  it('a client change refreshes their pages, the calendar and the requests', () => {
    expect(staleKeys({ type: 'client.updated', business: 'glow-studio', bookingCode: null })).toEqual([
      ['clients', 'glow-studio'],
      ['calendar', 'glow-studio'],
      ['requests', 'glow-studio'],
    ])
  })

  it('a settings change refreshes the settings, the page, the free times and the switcher', () => {
    expect(staleKeys({ type: 'business.updated', business: 'glow-studio', bookingCode: null })).toEqual([
      ['settings', 'glow-studio'],
      ['business', 'glow-studio'],
      ['availability', 'glow-studio'],
      ['calendar', 'glow-studio'],
      ['workspaces'],
      ['setup'],
      ['clients', 'glow-studio'],
      ['search'],
      ['suggest'],
      ['favorites'],
    ])
    // the Ýeral team's review of the page refreshes the same, the banner with it
    expect(staleKeys({ type: 'business.reviewed', business: 'glow-studio', bookingCode: null })).toEqual(
      staleKeys({ type: 'business.updated', business: 'glow-studio', bookingCode: null }),
    )
  })
})
