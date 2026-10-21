/**
 * Live updates (systemPatterns.md "Data flow"): while a screen is open, poll `GET /v1/events?after=<cursor>` about every
 * 10 s, when the tab becomes visible again and after the person's own mutations, and invalidate what each event touches.
 * The endpoint needs a user, so polling waits until `me` (`sdk.me.get()`) says someone is signed in; hidden tabs and
 * offline devices skip their turn (TanStack's focus and online managers). A push channel can replace this later without
 * changing screens.
 */
import { focusManager, hashKey, onlineManager, type QueryClient } from '@tanstack/react-query'
import { call, isApiError, type Client } from './client'
import { keys } from './keys'

export interface EventsHandle {
  /** Poll now; asked for while a poll runs, it runs once more right after. */
  poll(): Promise<void>
  stop(): void
}

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
      )
  }
  // the reviews, the team's list included (under the same prefix), and the rating on the page
  if ((e.type === 'review.created' || e.type === 'review.deleted' || e.type === 'review.updated') && e.business)
    out.push(keys.reviewsAll(e.business), keys.businessAll(e.business))
  if (e.type === 'team.changed') {
    // a setup finished joins the switcher and the "Biznes" link
    out.push(keys.workspaces(), keys.invites(), keys.setup(), keys.me())
    // the calendar's columns are the team's, and the page shows its specialists with their pictures
    if (e.business) out.push(keys.team(e.business), keys.calendar(e.business), keys.businessAll(e.business))
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

export function startEvents(client: Client, queryClient: QueryClient, opts: { intervalMs?: number } = {}): EventsHandle {
  let cursor: string | null = null
  let running: Promise<void> | null = null
  let again = false
  let stopped = false
  const signedIn = () => !!queryClient.getQueryData(keys.me())

  const tick = async () => {
    if (!signedIn()) {
      // signed out: start over after the next login
      cursor = null
      return
    }
    if (!focusManager.isFocused() || !onlineManager.isOnline()) return
    try {
      if (cursor === null) {
        cursor = (await call(client.v1.events.$get({ query: {} }))).cursor
        return
      }
      const page = await call(client.v1.events.$get({ query: { after: cursor } }))
      cursor = page.cursor
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
    })()
    return running
  }

  const meHash = hashKey(keys.me())
  let wasSignedIn = signedIn()
  const unsubscribe = [
    // back on the tab
    focusManager.subscribe((focused) => {
      if (focused) void poll()
    }),
    // after each of the person's own changes
    queryClient.getMutationCache().subscribe((e) => {
      if (e.type === 'updated' && e.action.type === 'success') void poll()
    }),
    // signed in just now, or the session loaded: take the cursor at once
    queryClient.getQueryCache().subscribe((e) => {
      if (e.query.queryHash !== meHash) return
      if (signedIn() && !wasSignedIn) void poll()
      wasSignedIn = signedIn()
    }),
  ]
  const timer = setInterval(() => void poll(), opts.intervalMs ?? 10_000)
  void poll()

  return {
    poll,
    stop() {
      stopped = true
      clearInterval(timer)
      for (const off of unsubscribe) off()
    },
  }
}
