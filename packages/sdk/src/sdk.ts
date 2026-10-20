/**
 * Query and mutation options per resource (AGENTS.md rule 3: UI talks to the api only through these).
 *
 *   const sdk = createSdk(createClient({ baseUrl: site.urls.api }), queryClient)
 *   useQuery(sdk.catalog.business('glow-studio', 'tk'))
 *   useMutation(sdk.bookings.cancel('tk'))
 *
 * Mutations invalidate the keys they change; live events from other people arrive through `startEvents`, which also
 * polls after every successful mutation. Queries hand TanStack's abort signal to the request, so a superseded search or
 * a closed screen stops its request.
 *
 * Request types come from `@yeral/contract` (ADR 0006), so a contract change fails type-checking here: bodies are what a
 * schema accepts (`z.input`), query parameters the values it reads them as (`z.output`), turned back into text below.
 */
import { infiniteQueryOptions, mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query'
import type {
  identityAnswerSchema,
  linkCodeSchema,
  linkVerifySchema,
  sendCodeSchema,
  updateMeSchema,
  verifyCodeSchema,
} from '@yeral/contract/account'
import type {
  appointmentAvailabilityQuerySchema,
  sessionsQuerySchema,
  specialistsAvailabilityQuerySchema,
  tableAvailabilityQuerySchema,
} from '@yeral/contract/availability'
import type {
  acceptAlternativeSchema,
  BookingDetail,
  cancelBookingSchema,
  createBookingSchema,
  editNoteSchema,
  rescheduleSchema,
  reviewInputSchema,
} from '@yeral/contract/bookings'
import type {
  blockInputSchema,
  businessCancelSchema,
  freeTimesQuerySchema,
  moveBookingSchema,
  newBookingSchema,
} from '@yeral/contract/calendar'
import type { searchQuerySchema } from '@yeral/contract/catalog'
import type { Locale } from '@yeral/contract/common'
import type { declineInputSchema } from '@yeral/contract/requests'
import type { groupInputSchema, menuOrderSchema, serviceInputSchema, serviceUpdateSchema } from '@yeral/contract/services'
import type { bookingRulesUpdateSchema, businessHoursUpdateSchema, businessProfileUpdateSchema } from '@yeral/contract/settings'
import type {
  inviteInputSchema,
  phoneOnlyInputSchema,
  removeMemberSchema,
  staffScheduleUpdateSchema,
  updateMemberSchema,
} from '@yeral/contract/team'
import type { z } from 'zod'
import { call, isApiError, type Client } from './client'
import { staleKeys } from './events'
import { keys, type BookingTab } from './keys'

/**
 * Query strings are text and the api's schemas coerce them; the RPC types describe the coerced values, so calls that
 * pass numbers or flags as text cast with `as never` (the parameters themselves are typed from the contract).
 */
type Query = Record<string, string | undefined>
const clean = (q: Record<string, string | number | boolean | undefined | null>): Query =>
  Object.fromEntries(Object.entries(q).flatMap(([k, v]) => (v === undefined || v === null || v === '' ? [] : [[k, String(v)]])))

/** A query's parameters as its contract schema reads them: `K` must be given, the rest may be. */
type Params<S extends z.ZodType, K extends keyof z.output<S>> = Pick<z.output<S>, K> & Partial<z.output<S>>

export type SearchParams = Omit<Params<typeof searchQuerySchema, 'lang'>, 'cursor'>

/** Lets TanStack Query abort the request. */
const abortWith = (signal: AbortSignal) => ({ init: { signal } })

export function createSdk(client: Client, queryClient: QueryClient) {
  const v1 = client.v1
  const invalidate = (...queryKeys: readonly (readonly unknown[])[]) =>
    Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))

  /**
   * The person looking changed (signed in or out, another phone): each business page says whether they may book there
   * online (book Q-154), so the pages refresh, in the background.
   */
  const viewerChanged = () => void invalidate(keys.businesses())

  /** Someone signed in who may not be the person before: every query goes back to empty and the screens reload. */
  const signedInAnew = async (data: { me: unknown }) => {
    queryClient.setQueryData(keys.me(), data.me)
    await queryClient.resetQueries({ predicate: (q) => q.queryKey[0] !== keys.me()[0] })
  }

  const auth = {
    sendCode: () =>
      mutationOptions({
        mutationFn: (body: z.input<typeof sendCodeSchema>) => call(v1.auth.code.$post({ json: body })),
      }),
    /** Signs in, or answers `{ isThisYou }` for an account unused for 6 months: then `answerIdentity` (book Q-270). */
    verify: () =>
      mutationOptions({
        mutationFn: (body: z.input<typeof verifyCodeSchema>) => call(v1.auth.verify.$post({ json: body })),
        onSuccess: (data) => {
          if (!('me' in data)) return
          queryClient.setQueryData(keys.me(), data.me)
          viewerChanged()
          return invalidate(keys.bookings(), ['favorites'])
        },
      }),
    /** "Is this you?": yes signs in to that account, no to a fresh one; whoever was on screen before is gone. */
    answerIdentity: () =>
      mutationOptions({
        mutationFn: (body: z.input<typeof identityAnswerSchema>) => call(v1.auth.identity.$post({ json: body })),
        onSuccess: signedInAnew,
      }),
    logout: () =>
      mutationOptions({
        mutationFn: () => call(v1.auth.logout.$post()),
        onSuccess: () => {
          queryClient.setQueryData(keys.me(), null)
          queryClient.removeQueries({ queryKey: keys.bookings() })
          queryClient.removeQueries({ queryKey: ['favorites'] })
          viewerChanged()
        },
      }),
  }

  const me = {
    /** null when signed out (no error). */
    get: () =>
      queryOptions({
        queryKey: keys.me(),
        queryFn: async ({ signal }) => {
          try {
            return await call(v1.me.$get(undefined, abortWith(signal)))
          } catch (e) {
            if (isApiError(e, 'unauthorized')) return null
            throw e
          }
        },
        staleTime: 60_000,
      }),
    update: () =>
      mutationOptions({
        mutationFn: (body: z.input<typeof updateMeSchema>) => call(v1.me.$patch({ json: body })),
        onSuccess: (data) => queryClient.setQueryData(keys.me(), data),
      }),
    remove: () =>
      mutationOptions({
        mutationFn: () => call(v1.me.$delete()),
        onSuccess: () => queryClient.clear(),
      }),
    phoneCode: () =>
      mutationOptions({ mutationFn: (body: z.input<typeof sendCodeSchema>) => call(v1.me.phone.code.$post({ json: body })) }),
    phoneVerify: () =>
      mutationOptions({
        mutationFn: (body: z.input<typeof verifyCodeSchema>) => call(v1.me.phone.verify.$post({ json: body })),
        // another number: the business pages and the bookings may say otherwise now
        onSuccess: (data) => {
          queryClient.setQueryData(keys.me(), data)
          viewerChanged()
          return invalidate(keys.bookings())
        },
      }),
    favorites: (lang: Locale) =>
      queryOptions({
        queryKey: keys.favorites(lang),
        queryFn: ({ signal }) => call(v1.me.favorites.$get({ query: { lang } }, abortWith(signal))),
      }),
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
      queryOptions({
        queryKey: keys.categories(lang),
        queryFn: ({ signal }) => call(v1.categories.$get({ query: { lang } }, abortWith(signal))),
        staleTime: 3_600_000,
      }),
    /** The cities for "Nirede?", the market's main one and, with a position, the one it's in (book Q-107). */
    cities: (lang: Locale, position: { lat: number; lng: number } | null = null) => {
      // about a kilometre: a phone's position moves a little between renders, the city it's in doesn't
      const near = position && { lat: Math.round(position.lat * 100) / 100, lng: Math.round(position.lng * 100) / 100 }
      return queryOptions({
        queryKey: keys.cities(lang, near),
        queryFn: ({ signal }) => call(v1.cities.$get({ query: clean({ lang, lat: near?.lat, lng: near?.lng }) }, abortWith(signal))),
        staleTime: 3_600_000,
      })
    },
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
        queryFn: ({ pageParam, signal }) =>
          call(v1.search.$get({ query: { ...query, ...(pageParam ? { cursor: pageParam } : {}) } }, abortWith(signal))),
        initialPageParam: '',
        getNextPageParam: (last) => last.cursor ?? undefined,
      })
    },
    suggest: (q: string, lang: Locale) =>
      queryOptions({
        queryKey: keys.suggest(q, lang),
        queryFn: ({ signal }) => call(v1.search.suggest.$get({ query: { q, lang } }, abortWith(signal))),
        enabled: q.trim().length > 0,
      }),
    /** "Nirede?" suggestions, in the chosen city when there is one. */
    places: (q: string, lang: Locale, city: string | null = null) =>
      queryOptions({
        queryKey: keys.places(q, lang, city),
        queryFn: ({ signal }) => call(v1.places.suggest.$get({ query: { q, ...clean({ lang, city }) } }, abortWith(signal))),
        enabled: q.trim().length >= 2,
      }),
    business: (slug: string, lang: Locale, position: { lat: number; lng: number } | null = null) =>
      queryOptions({
        queryKey: keys.business(slug, lang, position),
        queryFn: ({ signal }) =>
          call(
            v1.businesses[':slug'].$get(
              { param: { slug }, query: clean({ lang, lat: position?.lat, lng: position?.lng }) },
              abortWith(signal),
            ),
          ),
      }),
    reviews: (slug: string, lang: Locale) =>
      infiniteQueryOptions({
        queryKey: keys.reviews(slug, lang),
        queryFn: ({ pageParam, signal }) =>
          call(v1.businesses[':slug'].reviews.$get({ param: { slug }, query: clean({ lang, cursor: pageParam }) }, abortWith(signal))),
        initialPageParam: '',
        getNextPageParam: (last) => last.cursor ?? undefined,
      }),
  }

  const availability = {
    /** `staff`: a specialist id or `'any'` («Islendik hünärmen»). */
    appointment: (slug: string, p: Params<typeof appointmentAvailabilityQuerySchema, 'lang' | 'services' | 'staff'>) => {
      const query = clean({ ...p, services: p.services.join(',') })
      return queryOptions({
        queryKey: keys.availability(slug, 'appointment', query),
        queryFn: ({ signal }) =>
          call(v1.businesses[':slug'].availability.$get({ param: { slug }, query: query as never }, abortWith(signal))),
        enabled: p.services.length > 0,
        staleTime: 15_000,
      })
    },
    specialists: (slug: string, p: Params<typeof specialistsAvailabilityQuerySchema, 'lang' | 'services'>) => {
      const query = clean({ ...p, services: p.services.join(',') })
      return queryOptions({
        queryKey: keys.availability(slug, 'specialists', query),
        queryFn: ({ signal }) =>
          call(v1.businesses[':slug'].specialists.availability.$get({ param: { slug }, query: query as never }, abortWith(signal))),
        enabled: p.services.length > 0,
        staleTime: 15_000,
      })
    },
    tables: (slug: string, p: Params<typeof tableAvailabilityQuerySchema, 'lang' | 'party'>) => {
      const query = clean(p)
      return queryOptions({
        queryKey: keys.availability(slug, 'tables', query),
        queryFn: ({ signal }) => call(v1.businesses[':slug'].tables.$get({ param: { slug }, query: query as never }, abortWith(signal))),
        staleTime: 15_000,
      })
    },
    sessions: (slug: string, p: Params<typeof sessionsQuerySchema, 'lang'>) => {
      const query = clean(p)
      return queryOptions({
        queryKey: keys.availability(slug, 'sessions', query),
        queryFn: ({ signal }) => call(v1.businesses[':slug'].sessions.$get({ param: { slug }, query: query }, abortWith(signal))),
        staleTime: 15_000,
      })
    },
  }

  /**
   * The booking that came back is cached under its own code (taking an offered time makes a new booking); my lists and
   * that business's free times refresh, the detail just written doesn't.
   */
  const settle = (lang: Locale, data: BookingDetail, ...stale: (readonly unknown[])[]) => {
    queryClient.setQueryData(keys.booking(data.code, lang), data)
    return invalidate(keys.bookingLists(), keys.availabilityAll(data.business.slug), ...stale)
  }
  const bookingAction = <B>(
    lang: Locale,
    run: (code: string, body: B) => Promise<BookingDetail>,
    alsoStale: (data: BookingDetail) => (readonly unknown[])[] = () => [],
  ) =>
    mutationOptions({
      mutationFn: ({ code, body }: { code: string; body: B }) => run(code, body),
      onSuccess: (data) => settle(lang, data, ...alsoStale(data)),
    })
  /** A review changes the business's reviews, rating and count. */
  const reviewed = (data: BookingDetail) => [keys.reviewsAll(data.business.slug), keys.businessAll(data.business.slug)]
  const one = v1.me.bookings[':code']

  const bookings = {
    list: (tab: BookingTab, lang: Locale) =>
      infiniteQueryOptions({
        queryKey: keys.bookingList(tab, lang),
        queryFn: ({ pageParam, signal }) =>
          call(v1.me.bookings.$get({ query: clean({ tab, lang, cursor: pageParam }) as never }, abortWith(signal))),
        initialPageParam: '',
        getNextPageParam: (last) => last.cursor ?? undefined,
      }),
    detail: (code: string, lang: Locale) =>
      queryOptions({
        queryKey: keys.booking(code, lang),
        queryFn: ({ signal }) => call(one.$get({ param: { code }, query: { lang } }, abortWith(signal))),
      }),
    create: (lang: Locale) =>
      mutationOptions({
        mutationFn: (body: z.input<typeof createBookingSchema>) => call(v1.bookings.$post({ query: { lang }, json: body })),
        onSuccess: (data) => settle(lang, data),
        // refused for being phone-only or a paused business: the page learns it and shows the "Jaň et" card (book Q-154)
        onError: (e, body) =>
          isApiError(e, 'online_blocked') || isApiError(e, 'online_disabled') ? invalidate(keys.businessAll(body.business)) : undefined,
      }),
    cancel: (lang: Locale) =>
      bookingAction<z.input<typeof cancelBookingSchema>>(lang, (code, json) =>
        call(one.cancel.$post({ param: { code }, query: { lang }, json })),
      ),
    restore: (lang: Locale) => bookingAction<undefined>(lang, (code) => call(one.restore.$post({ param: { code }, query: { lang } }))),
    /** "Haýyşy yzyna al": withdraw the waiting move. */
    withdrawMove: (lang: Locale) =>
      bookingAction<undefined>(lang, (code) => call(one['withdraw-move'].$post({ param: { code }, query: { lang } }))),
    note: (lang: Locale) =>
      bookingAction<z.input<typeof editNoteSchema>>(lang, (code, json) =>
        call(one.note.$patch({ param: { code }, query: { lang }, json })),
      ),
    reschedule: (lang: Locale) =>
      bookingAction<z.input<typeof rescheduleSchema>>(lang, (code, json) =>
        call(one.reschedule.$post({ param: { code }, query: { lang }, json })),
      ),
    acceptAlternative: (lang: Locale) =>
      bookingAction<z.input<typeof acceptAlternativeSchema>>(lang, (code, json) =>
        call(one['accept-alternative'].$post({ param: { code }, query: { lang }, json })),
      ),
    review: (lang: Locale) =>
      bookingAction<z.input<typeof reviewInputSchema>>(
        lang,
        (code, json) => call(one.review.$post({ param: { code }, query: { lang }, json })),
        reviewed,
      ),
    editReview: (lang: Locale) =>
      bookingAction<z.input<typeof reviewInputSchema>>(
        lang,
        (code, json) => call(one.review.$patch({ param: { code }, query: { lang }, json })),
        reviewed,
      ),
  }

  /** The business team (ADR 0025): the switcher, invites, and the team the owner manages. */
  const w = v1.w[':slug']
  const teamChanged = (slug?: string) => invalidate(keys.workspaces(), ...(slug ? [keys.team(slug)] : []))
  const team = {
    /** The switcher; `current` is the workspace opened last. */
    workspaces: () =>
      queryOptions({
        queryKey: keys.workspaces(),
        queryFn: ({ signal }) => call(v1.me.workspaces.$get(undefined, abortWith(signal))),
      }),
    open: () =>
      mutationOptions({
        mutationFn: (slug: string) => call(v1.me.workspaces[':slug'].open.$post({ param: { slug } })),
        onSuccess: () => teamChanged(),
      }),
    /** Open and expired invites for the signed-in phone (shown at sign-in). */
    myInvites: () =>
      queryOptions({
        queryKey: keys.invites(),
        queryFn: ({ signal }) => call(v1.me.invites.$get(undefined, abortWith(signal))),
      }),
    /** The invite behind a link; it never signs anyone in. */
    invite: (token: string) =>
      queryOptions({
        queryKey: keys.invite(token),
        queryFn: ({ signal }) => call(v1.invites[':token'].$get({ param: { token } }, abortWith(signal))),
      }),
    accept: () =>
      mutationOptions({
        mutationFn: (id: string) => call(v1.me.invites[':id'].accept.$post({ param: { id } })),
        onSuccess: () => invalidate(keys.invites(), keys.workspaces(), keys.me()),
      }),
    decline: () =>
      mutationOptions({
        mutationFn: (id: string) => call(v1.me.invites[':id'].decline.$post({ param: { id } })),
        onSuccess: () => invalidate(keys.invites()),
      }),
    list: (slug: string) =>
      queryOptions({
        queryKey: keys.team(slug),
        queryFn: ({ signal }) => call(w.team.$get({ param: { slug } }, abortWith(signal))),
      }),
    /** Returns the link for the owner to copy. */
    sendInvite: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof inviteInputSchema>) => call(w.team.invites.$post({ param: { slug }, json })),
        onSuccess: () => teamChanged(slug),
      }),
    addPhoneOnly: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof phoneOnlyInputSchema>) => call(w.team['phone-only'].$post({ param: { slug }, json })),
        onSuccess: () => teamChanged(slug),
      }),
    /** Send again, or switch the app on for a specialist without it. */
    resendInvite: (slug: string) =>
      mutationOptions({
        mutationFn: (staffId: string) => call(w.team[':staffId'].invite.$post({ param: { slug, staffId } })),
        onSuccess: () => teamChanged(slug),
      }),
    cancelInvite: (slug: string) =>
      mutationOptions({
        mutationFn: (staffId: string) => call(w.team[':staffId'].invite.$delete({ param: { slug, staffId } })),
        onSuccess: () => teamChanged(slug),
      }),
    update: (slug: string) =>
      mutationOptions({
        mutationFn: ({ staffId, ...json }: { staffId: string } & z.input<typeof updateMemberSchema>) =>
          call(w.team[':staffId'].$patch({ param: { slug, staffId }, json })),
        onSuccess: () => teamChanged(slug),
      }),
    /**
     * "Işgäri öçür" (book B-50): their bookings ahead make it `bookings_affected` (`details` lists them, each with the
     * colleagues who do it) until it's sent again with `affected: 'move' | 'keep' | 'cancel'`.
     */
    remove: (slug: string) =>
      mutationOptions({
        mutationFn: ({ staffId, ...json }: { staffId: string } & z.input<typeof removeMemberSchema>) =>
          call(w.team[':staffId'].remove.$post({ param: { slug, staffId }, json })),
        // their bookings moved or cancelled, and the free times without them
        onSuccess: () => Promise.all([teamChanged(slug), booked(slug)]),
      }),
    /** A team member's shift, breaks and days off (book B-47). */
    schedule: (slug: string, staffId: string) =>
      queryOptions({
        queryKey: keys.schedule(slug, staffId),
        queryFn: ({ signal }) => call(w.team[':staffId'].schedule.$get({ param: { slug, staffId } }, abortWith(signal))),
      }),
    /** Saves it; bookings left outside make it `bookings_affected` until it's sent again with `affected: 'move' | 'keep'`. */
    updateSchedule: (slug: string, staffId: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof staffScheduleUpdateSchema>) =>
          call(w.team[':staffId'].schedule.$put({ param: { slug, staffId }, json })),
        // the schedule sits under the team's keys; the free times change with it
        onSuccess: () => Promise.all([teamChanged(slug), booked(slug)]),
      }),
    reactivate: (slug: string) =>
      mutationOptions({
        mutationFn: (staffId: string) => call(w.team[':staffId'].reactivate.$post({ param: { slug, staffId } })),
        onSuccess: () => teamChanged(slug),
      }),
    /** "Bu biznesden çyk": the signed-in person leaves this workspace. */
    leave: () =>
      mutationOptions({
        mutationFn: (slug: string) => call(v1.w[':slug'].leave.$post({ param: { slug } })),
        onSuccess: () => invalidate(keys.workspaces(), keys.me()),
      }),
  }

  /** Business settings (book B-37–B-43): the owner and administrators read and change them. */
  // what the team's live events refresh too
  const settingsChanged = (slug: string) => invalidate(...staleKeys({ type: 'business.updated', business: slug, bookingCode: null }))
  const settings = {
    rules: (slug: string) =>
      queryOptions({
        queryKey: keys.rules(slug),
        queryFn: ({ signal }) => call(w.settings.rules.$get({ param: { slug } }, abortWith(signal))),
      }),
    updateRules: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof bookingRulesUpdateSchema>) => call(w.settings.rules.$patch({ param: { slug }, json })),
        onSuccess: () => settingsChanged(slug),
      }),
    /** The business profile (book B-37): what the public page says. */
    profile: (slug: string) =>
      queryOptions({
        queryKey: keys.profile(slug),
        queryFn: ({ signal }) => call(w.settings.profile.$get({ param: { slug } }, abortWith(signal))),
      }),
    updateProfile: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof businessProfileUpdateSchema>) => call(w.settings.profile.$patch({ param: { slug }, json })),
        onSuccess: () => settingsChanged(slug),
      }),
    /** The week and the special days (book B-39, B-40). */
    hours: (slug: string) =>
      queryOptions({
        queryKey: keys.hours(slug),
        queryFn: ({ signal }) => call(w.settings.hours.$get({ param: { slug } }, abortWith(signal))),
      }),
    /**
     * Saves both; bookings left outside make it `bookings_affected` (`details` lists them) until it's sent again with
     * `affected: 'keep' | 'cancel'`; `cancelled` says how many clients were told.
     */
    updateHours: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof businessHoursUpdateSchema>) => call(w.settings.hours.$put({ param: { slug }, json })),
        // the calendar refreshes with the settings (`business.updated`); cancelled bookings may take waiting moves along
        onSuccess: () => Promise.all([settingsChanged(slug), invalidate(keys.requests(slug))]),
      }),
    /** The services menu (book B-38): groups, services, who does each, the clients' order. */
    menu: (slug: string) =>
      queryOptions({
        queryKey: keys.menu(slug),
        queryFn: ({ signal }) => call(w.services.$get({ param: { slug } }, abortWith(signal))),
      }),
    addService: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof serviceInputSchema>) => call(w.services.$post({ param: { slug }, json })),
        onSuccess: () => settingsChanged(slug),
      }),
    updateService: (slug: string) =>
      mutationOptions({
        mutationFn: ({ serviceId, ...json }: { serviceId: string } & z.input<typeof serviceUpdateSchema>) =>
          call(w.services[':serviceId'].$patch({ param: { slug, serviceId }, json })),
        onSuccess: () => settingsChanged(slug),
      }),
    /** "Hyzmaty poz"; `restoreService` is its undo. */
    deleteService: (slug: string) =>
      mutationOptions({
        mutationFn: (serviceId: string) => call(w.services[':serviceId'].$delete({ param: { slug, serviceId } })),
        onSuccess: () => settingsChanged(slug),
      }),
    restoreService: (slug: string) =>
      mutationOptions({
        mutationFn: (serviceId: string) => call(w.services[':serviceId'].restore.$post({ param: { slug, serviceId } })),
        onSuccess: () => settingsChanged(slug),
      }),
    addGroup: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof groupInputSchema>) => call(w.services.groups.$post({ param: { slug }, json })),
        onSuccess: () => settingsChanged(slug),
      }),
    renameGroup: (slug: string) =>
      mutationOptions({
        mutationFn: ({ groupId, ...json }: { groupId: string } & z.input<typeof groupInputSchema>) =>
          call(w.services.groups[':groupId'].$patch({ param: { slug, groupId }, json })),
        onSuccess: () => settingsChanged(slug),
      }),
    deleteGroup: (slug: string) =>
      mutationOptions({
        mutationFn: (groupId: string) => call(w.services.groups[':groupId'].$delete({ param: { slug, groupId } })),
        onSuccess: () => settingsChanged(slug),
      }),
    orderMenu: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof menuOrderSchema>) => call(w.services.order.$put({ param: { slug }, json })),
        onSuccess: () => settingsChanged(slug),
      }),
  }

  /** Booking requests the business answers (book B-19–B-21): the waiting ones, confirm, decline. */
  const answered = (slug: string) => invalidate(keys.requests(slug), keys.workspaces(), keys.availabilityAll(slug))
  const requests = {
    /** The ones the viewer may see, most urgent first, with whether they may answer each. */
    list: (slug: string) =>
      queryOptions({
        queryKey: keys.requests(slug),
        queryFn: ({ signal }) => call(w.requests.$get({ param: { slug } }, abortWith(signal))),
      }),
    confirm: (slug: string) =>
      mutationOptions({
        mutationFn: (code: string) => call(w.requests[':code'].confirm.$post({ param: { slug, code } })),
        onSuccess: () => answered(slug),
      }),
    decline: (slug: string) =>
      mutationOptions({
        mutationFn: ({ code, ...json }: { code: string } & z.input<typeof declineInputSchema>) =>
          call(w.requests[':code'].decline.$post({ param: { slug, code }, json })),
        onSuccess: () => answered(slug),
      }),
  }

  /**
   * The business's own bookings (book B-23–B-27): free times as the team books them, a booking by phone or walk-in and
   * its undo, moving and cancelling one.
   */
  // a move or a cancel may also settle the client's waiting move: the requests and the switcher's counts
  const booked = (slug: string) => invalidate(keys.calendar(slug), keys.availabilityAll(slug), keys.requests(slug), keys.workspaces())
  const calendar = {
    /** The nearest four, a day's starts with who is free at each, and the 14-day strip; a specialist gets their own. */
    freeTimes: (slug: string, p: Params<typeof freeTimesQuerySchema, 'services'>) => {
      const query = clean({ ...p, services: p.services.join(',') })
      return queryOptions({
        queryKey: keys.freeTimes(slug, query),
        queryFn: ({ signal }) => call(w['free-times'].$get({ param: { slug }, query: query as never }, abortWith(signal))),
        enabled: p.services.length > 0,
        staleTime: 15_000,
      })
    },
    /** "Ýazyp goý": confirmed at once; `undoUntil` says how long "Yzyna al" works. */
    add: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof newBookingSchema>) => call(w.bookings.$post({ param: { slug }, json })),
        onSuccess: () => booked(slug),
      }),
    undo: (slug: string) =>
      mutationOptions({
        mutationFn: (code: string) => call(w.bookings[':code'].undo.$post({ param: { slug, code } })),
        onSuccess: () => booked(slug),
      }),
    /** A refused move is `cannot_move` with `details.problem` for the toast. */
    move: (slug: string) =>
      mutationOptions({
        mutationFn: ({ code, ...json }: { code: string } & z.input<typeof moveBookingSchema>) =>
          call(w.bookings[':code'].move.$post({ param: { slug, code }, json })),
        onSuccess: () => booked(slug),
      }),
    cancel: (slug: string) =>
      mutationOptions({
        mutationFn: ({ code, ...json }: { code: string } & z.input<typeof businessCancelSchema>) =>
          call(w.bookings[':code'].cancel.$post({ param: { slug, code }, json })),
        onSuccess: () => booked(slug),
      }),
    /** Blocked time from–to (book B-18): everyone's, or a specialist their own. */
    blocks: (slug: string, from: string, to: string) =>
      queryOptions({
        queryKey: keys.blocks(slug, from, to),
        queryFn: ({ signal }) => call(w.calendar.blocks.$get({ param: { slug }, query: { from, to } }, abortWith(signal))),
      }),
    /** "Wagty ýap"; over a booking it's `block_over_bookings` with `details.bookings`. */
    block: (slug: string) =>
      mutationOptions({
        mutationFn: (json: z.input<typeof blockInputSchema>) => call(w.calendar.blocks.$post({ param: { slug }, json })),
        onSuccess: () => booked(slug),
      }),
    unblock: (slug: string) =>
      mutationOptions({
        mutationFn: ({ id, scope = 'one' }: { id: string; scope?: 'one' | 'series' }) =>
          call(w.calendar.blocks[':id'].$delete({ param: { slug, id }, query: { scope } })),
        onSuccess: () => booked(slug),
      }),
  }

  /** The SMS link page (book Q-168, F-068): the booking by its link's token, and the login with its own phone. */
  const links = {
    view: (token: string, lang: Locale) =>
      queryOptions({
        queryKey: keys.link(token, lang),
        queryFn: ({ signal }) => call(v1.links[':token'].$get({ param: { token }, query: { lang } }, abortWith(signal))),
      }),
    sendCode: (token: string) =>
      mutationOptions({
        mutationFn: (body: z.input<typeof linkCodeSchema> = {}) => call(v1.links[':token'].code.$post({ param: { token }, json: body })),
      }),
    verify: (token: string) =>
      mutationOptions({
        mutationFn: (body: z.input<typeof linkVerifySchema>) => call(v1.links[':token'].verify.$post({ param: { token }, json: body })),
        // the link page can sign someone in over another person (a shared phone, book Q-169); `{ isThisYou }` waits
        // for `auth.answerIdentity` (Q-270)
        onSuccess: (data) => ('me' in data ? signedInAnew(data) : undefined),
      }),
  }

  return { auth, me, catalog, availability, bookings, team, settings, requests, calendar, links }
}

export type Sdk = ReturnType<typeof createSdk>
