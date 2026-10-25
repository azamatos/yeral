/**
 * Live updates (ADR 0028; systemPatterns.md "Data flow"): while someone is signed in and the tab is visible,
 * `GET /v1/events/stream` (server-sent events) nudges this page whenever something of theirs may have changed; it then
 * reads `GET /v1/events?after=<cursor>` and invalidates what each event touches, and reads again shortly while the api
 * says an event is held back (it shows once every older transaction has finished). It reads too every minute (the
 * stream may be down), when the tab becomes visible again and after the person's own mutations. The endpoints need a
 * user, so this waits until `me` (`sdk.me.get()`) says someone is signed in; hidden tabs and offline devices skip their
 * turn (TanStack's focus and online managers).
 */
import { focusManager, hashKey, onlineManager, type QueryClient } from '@tanstack/react-query'
import { call, isApiError, type Client } from './client'
import { keys } from './keys'

export interface EventsHandle {
  /** Poll now; asked for while a poll runs, it runs once more right after. */
  poll(): Promise<void>
  stop(): void
}

/** What the feed needs of an `EventSource` (tests pass their own). */
export interface EventStream {
  addEventListener(type: 'ready' | 'changed' | 'error', listener: () => void): void
  close(): void
  /** 2: closed for good (a refusal, a server down): the feed opens another a little later. */
  readonly readyState: number
}

/** The browser's `EventSource`, sending the session's cookie to the api's address; none where there is none (the server). */
const browserStream =
  typeof EventSource === 'undefined' ? null : (url: string): EventStream => new EventSource(url, { withCredentials: true })

interface LiveEvent {
  type: string
  business: string | null
  bookingCode: string | null
}

/** Which queries an event makes stale. */
export function staleKeys(e: LiveEvent): (readonly unknown[])[] {
  const out: (readonly unknown[])[] = []
  if (e.type.startsWith('booking.')) {
    out.push(keys.bookings())
    if (e.business)
      out.push(
        keys.availabilityAll(e.business),
        keys.businessAll(e.business),
        keys.requests(e.business),
        keys.calendar(e.business),
        // visits, the next booking, reports
        keys.clients(e.business),
        // the switcher's request counts
        keys.workspaces(),
      )
  }
  // the reviews, the team's list included (under the same prefix), the rating on the page, the switcher's "Jogapsyz"
  if ((e.type === 'review.created' || e.type === 'review.deleted' || e.type === 'review.updated') && e.business)
    out.push(keys.reviewsAll(e.business), keys.businessAll(e.business), keys.workspaces())
  if (e.type === 'team.changed') {
    // a setup finished joins the switcher and the "Biznes" link
    out.push(keys.workspaces(), keys.invites(), keys.setup(), keys.me())
    // the calendar's columns are the team's, the page shows its specialists with their pictures, and the menu says who
    // does each service
    if (e.business) out.push(keys.team(e.business), keys.calendar(e.business), keys.businessAll(e.business), keys.menu(e.business))
  }
  // a client's record or notes: their pages, the calendar's alert markers, the requests' notes
  if (e.type === 'client.updated' && e.business) out.push(keys.clients(e.business), keys.calendar(e.business), keys.requests(e.business))
  // settings change the page, free times and who answers requests (the switcher's counts); a review result the banner
  if ((e.type === 'business.updated' || e.type === 'business.reviewed') && e.business)
    out.push(
      keys.settings(e.business),
      keys.businessAll(e.business),
      keys.availabilityAll(e.business),
      keys.calendar(e.business),
      keys.workspaces(),
      // a draft's name on the wizard's card
      keys.setup(),
      // the no-show limit decides who is phone-only
      keys.clients(e.business),
      // its name, category and prices on cards
      keys.searchAll(),
      keys.suggestAll(),
      keys.favoritesAll(),
    )
  return out
}

export function startEvents(
  client: Client,
  queryClient: QueryClient,
  opts: { intervalMs?: number; rereadMs?: number; reopenMs?: number; stream?: ((url: string) => EventStream) | null } = {},
): EventsHandle {
  const openStream = opts.stream === undefined ? browserStream : opts.stream
  const rereadMs = opts.rereadMs ?? 1_000
  const reopenMs = opts.reopenMs ?? 10_000
  let cursor: string | null = null
  let running: Promise<void> | null = null
  let again = false
  let stopped = false
  // the api said an event of the person's is held back (or more pages wait): read again, a little later each time
  let held = false
  let reread: ReturnType<typeof setTimeout> | undefined
  let rereadIn = rereadMs
  const userOf = () => queryClient.getQueryData<{ id: string } | null>(keys.me())?.id ?? null
  const signedIn = () => !!userOf()

  const tick = async () => {
    held = false
    if (!signedIn()) {
      // signed out: start over after the next login
      cursor = null
      return
    }
    try {
      // the starting point even in a hidden tab: one opened in the background then hears, when it's first looked at,
      // what changed after its screens loaded (the lists held for minutes, the switcher's, wouldn't read again)
      if (cursor === null) {
        cursor = (await call(client.v1.events.$get({ query: {} }))).cursor
        return
      }
      if (!focusManager.isFocused() || !onlineManager.isOnline()) return
      const page = await call(client.v1.events.$get({ query: { after: cursor } }))
      cursor = page.cursor
      held = page.held
      const stale = new Map<string, readonly unknown[]>()
      for (const e of page.items) for (const key of staleKeys(e)) stale.set(JSON.stringify(key), key)
      await Promise.all([...stale.values()].map((queryKey) => queryClient.invalidateQueries({ queryKey })))
    } catch (e) {
      // the session ended: start over and let `me` find out; network trouble: try again on the next tick
      if (isApiError(e, 'unauthorized')) {
        cursor = null
        void queryClient.invalidateQueries({ queryKey: keys.me() })
      }
    }
  }

  const poll = () => {
    if (stopped) return Promise.resolve()
    if (running) {
      // a change may have landed after this request left: look once more when it's back
      again = true
      return running
    }
    running = (async () => {
      try {
        do {
          again = false
          await tick()
        } while (again && !stopped)
      } finally {
        running = null
      }
      // held back: 1 s, 2 s, 4 s … up to 30 s; nothing held: back to 1 s
      if (!held) rereadIn = rereadMs
      else if (!reread && !stopped) {
        reread = setTimeout(() => {
          reread = undefined
          void poll()
        }, rereadIn)
        rereadIn = Math.min(rereadIn * 2, 30_000)
      }
    })()
    return running
  }

  // the push channel: open while someone is signed in and the tab is visible (a hidden tab reads nothing, and keeps no
  // connection); for the account signed in now; opened again after it closes for good, a little later each time
  let stream: EventStream | null = null
  let streamUser: string | null = null
  let reopen: ReturnType<typeof setTimeout> | undefined
  let reopenIn = reopenMs
  const closeStream = () => {
    clearTimeout(reopen)
    reopen = undefined
    stream?.close()
    stream = null
    streamUser = null
  }
  const connect = () => {
    const user = userOf()
    if (!openStream || stream || reopen || stopped || !user || !focusManager.isFocused()) return
    const s = openStream(client.v1.events.stream.$url().toString())
    stream = s
    streamUser = user
    // connected (again): whatever changed meanwhile
    s.addEventListener('ready', () => {
      reopenIn = reopenMs
      void poll()
    })
    s.addEventListener('changed', () => void poll())
    s.addEventListener('error', () => {
      // a dropped connection comes back by itself; a closed one (a refusal, the api restarting) is opened again later,
      // after asking who is signed in (an ended session signs the page out, and nothing opens again)
      if (s.readyState !== 2 || stream !== s) return
      stream = null
      streamUser = null
      void queryClient.invalidateQueries({ queryKey: keys.me() })
      reopen = setTimeout(() => {
        reopen = undefined
        connect()
      }, reopenIn)
      reopenIn = Math.min(reopenIn * 2, 5 * 60_000)
    })
  }

  const meHash = hashKey(keys.me())
  let lastUser = userOf()
  const unsubscribe = [
    // back on the tab: read, and open the stream again; away: close it
    focusManager.subscribe((focused) => {
      if (focused) {
        void poll()
        connect()
      } else if (stream) closeStream()
    }),
    // after each of the person's own changes
    queryClient.getMutationCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'success') void poll()
    }),
    // signed in (or as someone else) just now, or the session loaded: take the cursor and open the stream for that
    // account at once; signed out: close it
    queryClient.getQueryCache().subscribe((e) => {
      if (e.query.queryHash !== meHash) return
      const user = userOf()
      if (user === lastUser) return
      lastUser = user
      if (streamUser !== user) closeStream()
      if (user) {
        void poll()
        connect()
      }
    }),
  ]
  // the fallback while the stream is down or missed something
  const timer = setInterval(() => void poll(), opts.intervalMs ?? 60_000)
  void poll()
  connect()

  return {
    poll,
    stop() {
      stopped = true
      clearInterval(timer)
      clearTimeout(reread)
      closeStream()
      for (const off of unsubscribe) off()
    },
  }
}
