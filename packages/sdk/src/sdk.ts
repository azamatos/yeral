/**
 * Query and mutation options per resource (AGENTS.md rule 3: UI talks to the api only through these).
 *
 *   const sdk = createSdk(createClient({ baseUrl: site.urls.api }), queryClient)
 *   useQuery(sdk.catalog.business('glow-studio', 'tk'))
 *   useMutation(sdk.bookings.cancel('tk'))
 *
 * Mutations invalidate the keys they change; live events from other people arrive through `startEvents`.
 */
import { infiniteQueryOptions, mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import type { BookingDetail } from '@yeral/contract/bookings'
import type { Locale } from '@yeral/contract/common'
import { call, type Client } from './client'
import { keys } from './keys'

/**
 * Query strings are text and the api's schemas coerce them; the RPC types describe the coerced values, so calls that
 * pass numbers or flags as text cast with `as never` (the parameters themselves are typed above each call).
 */
type Query = Record<string, string | undefined>
const clean = (q: Record<string, string | number | boolean | undefined | null>): Query =>
  Object.fromEntries(Object.entries(q).flatMap(([k, v]) => (v === undefined || v === null || v === '' ? [] : [[k, String(v)]])))

export interface SearchParams {
  lang: Locale
  q?: string
  cat?: string
  lat?: number
  lng?: number
  r?: number
  date?: string
  week?: boolean
  sort?: 'distance' | 'rating' | 'price'
  minRating?: number
  maxPrice?: number
  openNow?: boolean
  type?: 'appointment' | 'table' | 'class'
  womenOnly?: boolean
  bbox?: [number, number, number, number]
  party?: number
  limit?: number
}

export function createSdk(client: Client, queryClient: QueryClient) {
  const v1 = client.v1
  const invalidate = (...queryKeys: readonly (readonly unknown[])[]) =>
    Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))

  const auth = {
    sendCode: () =>
      mutationOptions({
        mutationFn: (body: { phone: string; lang?: Locale }) => call(v1.auth.code.$post({ json: body })),
      }),
    verify: () =>
      mutationOptions({
        mutationFn: (body: { phone: string; code: string; lang?: Locale }) => call(v1.auth.verify.$post({ json: body })),
        onSuccess: (data) => {
          queryClient.setQueryData(keys.me(), data.me)
          return invalidate(keys.bookings(), ['favorites'])
        },
      }),
    logout: () =>
      mutationOptions({
        mutationFn: () => call(v1.auth.logout.$post()),
        onSuccess: () => {
          queryClient.setQueryData(keys.me(), null)
          queryClient.removeQueries({ queryKey: keys.bookings() })
          queryClient.removeQueries({ queryKey: ['favorites'] })
        },
      }),
  }

  const me = {
    /** null when signed out (no error). */
    get: () =>
      queryOptions({
        queryKey: keys.me(),
        queryFn: async () => {
          try {
            return await call(v1.me.$get())
          } catch (e) {
            if (e instanceof Error && 'status' in e && (e as { status: number }).status === 401) return null
            throw e
          }
        },
        staleTime: 60_000,
      }),
    update: () =>
      mutationOptions({
        mutationFn: (body: {
          name?: string
          lang?: Locale
          notifications?: Partial<Record<'confirmation' | 'reminderDay' | 'reminder2h' | 'reviewAsk', boolean>>
        }) => call(v1.me.$patch({ json: body })),
        onSuccess: (data) => queryClient.setQueryData(keys.me(), data),
      }),
    remove: () =>
      mutationOptions({
        mutationFn: () => call(v1.me.$delete()),
        onSuccess: () => queryClient.clear(),
      }),
    phoneCode: () => mutationOptions({ mutationFn: (body: { phone: string }) => call(v1.me.phone.code.$post({ json: body })) }),
    phoneVerify: () =>
      mutationOptions({
        mutationFn: (body: { phone: string; code: string }) => call(v1.me.phone.verify.$post({ json: body })),
        onSuccess: (data) => queryClient.setQueryData(keys.me(), data),
      }),
    favorites: (lang: Locale) =>
      queryOptions({ queryKey: keys.favorites(lang), queryFn: () => call(v1.me.favorites.$get({ query: { lang } })) }),
    /** Heart toggle; the list refreshes after. */
    setFavorite: () =>
      mutationOptions({
        mutationFn: ({ slug, on }: { slug: string; on: boolean }) =>
          on ? call(v1.me.favorites[':slug'].$put({ param: { slug } })) : call(v1.me.favorites[':slug'].$delete({ param: { slug } })),
        onSuccess: () => invalidate(['favorites']),
      }),
  }

  const catalog = {
    categories: (lang: Locale) =>
      queryOptions({ queryKey: keys.categories(lang), queryFn: () => call(v1.categories.$get({ query: { lang } })), staleTime: 3_600_000 }),
    search: (p: SearchParams) => {
      const query = clean({
        ...p,
        bbox: p.bbox?.join(','),
        week: p.week ? '1' : undefined,
        openNow: p.openNow ? '1' : undefined,
        womenOnly: p.womenOnly ? '1' : undefined,
      })
      return infiniteQueryOptions({
        queryKey: keys.search(query),
        queryFn: ({ pageParam }) => call(v1.search.$get({ query: { ...query, ...(pageParam ? { cursor: pageParam } : {}) } })),
        initialPageParam: '',
        getNextPageParam: (last) => last.cursor ?? undefined,
      })
    },
    suggest: (q: string, lang: Locale) =>
      queryOptions({
        queryKey: keys.suggest(q, lang),
        queryFn: () => call(v1.search.suggest.$get({ query: { q, lang } })),
        enabled: q.trim().length > 0,
      }),
    places: (q: string, lang: Locale) =>
      queryOptions({
        queryKey: keys.places(q, lang),
        queryFn: () => call(v1.places.suggest.$get({ query: { q, lang } })),
        enabled: q.trim().length >= 2,
      }),
    ipPlace: () => queryOptions({ queryKey: keys.ipPlace(), queryFn: () => call(v1.places.ip.$get()), staleTime: Infinity }),
    business: (slug: string, lang: Locale, position: { lat: number; lng: number } | null = null) =>
      queryOptions({
        queryKey: keys.business(slug, lang, position),
        queryFn: () =>
          call(v1.businesses[':slug'].$get({ param: { slug }, query: clean({ lang, lat: position?.lat, lng: position?.lng }) })),
      }),
    reviews: (slug: string, lang: Locale) =>
      infiniteQueryOptions({
        queryKey: keys.reviews(slug),
        queryFn: ({ pageParam }) =>
          call(v1.businesses[':slug'].reviews.$get({ param: { slug }, query: clean({ lang, cursor: pageParam }) })),
        initialPageParam: '',
        getNextPageParam: (last) => last.cursor ?? undefined,
      }),
  }

  const availability = {
    /** `staff`: a specialist id or `'any'` («Islendik hünärmen»). */
    appointment: (slug: string, p: { lang: Locale; services: string[]; staff: string; date?: string }) => {
      const query = clean({ lang: p.lang, services: p.services.join(','), staff: p.staff, date: p.date })
      return queryOptions({
        queryKey: keys.availability(slug, 'appointment', query),
        queryFn: () => call(v1.businesses[':slug'].availability.$get({ param: { slug }, query: query as never })),
        enabled: p.services.length > 0,
        staleTime: 15_000,
      })
    },
    specialists: (slug: string, p: { lang: Locale; services: string[] }) => {
      const query = clean({ lang: p.lang, services: p.services.join(',') })
      return queryOptions({
        queryKey: keys.availability(slug, 'specialists', query),
        queryFn: () => call(v1.businesses[':slug'].specialists.availability.$get({ param: { slug }, query: query as never })),
        enabled: p.services.length > 0,
        staleTime: 15_000,
      })
    },
    tables: (slug: string, p: { lang: Locale; party: number; date?: string }) => {
      const query = clean(p)
      return queryOptions({
        queryKey: keys.availability(slug, 'tables', query),
        queryFn: () => call(v1.businesses[':slug'].tables.$get({ param: { slug }, query: query as never })),
        staleTime: 15_000,
      })
    },
    sessions: (slug: string, p: { lang: Locale; from?: string; days?: number }) => {
      const query = clean(p)
      return queryOptions({
        queryKey: keys.availability(slug, 'sessions', query),
        queryFn: () => call(v1.businesses[':slug'].sessions.$get({ param: { slug }, query: query })),
        staleTime: 15_000,
      })
    },
  }

  type CreateBody = Parameters<typeof v1.bookings.$post>[0]['json']
  const bookingAction = <B>(lang: Locale, run: (code: string, body: B) => Promise<BookingDetail>) =>
    mutationOptions({
      mutationFn: ({ code, body }: { code: string; body: B }) => run(code, body),
      onSuccess: (data, { code }) => {
        queryClient.setQueryData(keys.booking(code, lang), data)
        return invalidate(keys.bookings(), ['availability'])
      },
    })
  const one = v1.me.bookings[':code']

  const bookings = {
    list: (tab: 'upcoming' | 'past', lang: Locale) =>
      infiniteQueryOptions({
        queryKey: keys.bookingList(tab, lang),
        queryFn: ({ pageParam }) => call(v1.me.bookings.$get({ query: clean({ tab, lang, cursor: pageParam }) as never })),
        initialPageParam: '',
        getNextPageParam: (last) => last.cursor ?? undefined,
      }),
    detail: (code: string, lang: Locale) =>
      queryOptions({ queryKey: keys.booking(code, lang), queryFn: () => call(one.$get({ param: { code }, query: { lang } })) }),
    create: (lang: Locale) =>
      mutationOptions({
        mutationFn: (body: CreateBody) => call(v1.bookings.$post({ query: { lang }, json: body })),
        onSuccess: (data) => {
          queryClient.setQueryData(keys.booking(data.code, lang), data)
          return invalidate(keys.bookings(), keys.availabilityAll(data.business.slug))
        },
      }),
    cancel: (lang: Locale) =>
      bookingAction<{ reason?: string }>(lang, (code, json) => call(one.cancel.$post({ param: { code }, query: { lang }, json }))),
    restore: (lang: Locale) => bookingAction<undefined>(lang, (code) => call(one.restore.$post({ param: { code }, query: { lang } }))),
    note: (lang: Locale) =>
      bookingAction<{ note: string }>(lang, (code, json) => call(one.note.$patch({ param: { code }, query: { lang }, json }))),
    reschedule: (lang: Locale) =>
      bookingAction<{ date: string; start: number; staffId?: string | null }>(lang, (code, json) =>
        call(one.reschedule.$post({ param: { code }, query: { lang }, json })),
      ),
    acceptAlternative: (lang: Locale) =>
      bookingAction<{ index: number; source: 'decline' | 'expired' }>(lang, (code, json) =>
        call(one['accept-alternative'].$post({ param: { code }, query: { lang }, json })),
      ),
    review: (lang: Locale) =>
      bookingAction<{ rating: number; tags?: string[]; text?: string }>(lang, (code, json) =>
        call(one.review.$post({ param: { code }, query: { lang }, json: { tags: [], ...json } })),
      ),
    editReview: (lang: Locale) =>
      bookingAction<{ rating: number; tags?: string[]; text?: string }>(lang, (code, json) =>
        call(one.review.$patch({ param: { code }, query: { lang }, json: { tags: [], ...json } })),
      ),
  }

  return { auth, me, catalog, availability, bookings }
}

export type Sdk = ReturnType<typeof createSdk>
