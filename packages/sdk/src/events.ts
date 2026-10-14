/**
 * Live updates (systemPatterns.md "Data flow"): while a screen is open, poll `GET /v1/events?after=<cursor>` about every
 * 10 s, on window focus and after the person's own mutations (`poll()`), and invalidate what each event touches.
 * A push channel can replace this later without changing screens.
 */
import type { QueryClient } from '@tanstack/react-query'
import { call, isApiError, type Client } from './client'
import { keys } from './keys'

export interface EventsHandle {
  /** Poll now (after a mutation, on focus). */
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
    if (e.business) out.push(keys.availabilityAll(e.business), keys.businessAll(e.business))
  }
  if (e.type === 'review.created' && e.business) out.push(keys.reviews(e.business), keys.businessAll(e.business))
  return out
}

export function startEvents(client: Client, queryClient: QueryClient, opts: { intervalMs?: number } = {}): EventsHandle {
  let cursor: string | null = null
  let busy = false
  let stopped = false

  const poll = async () => {
    if (busy || stopped) return
    busy = true
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
      // signed out: start over after the next login; network trouble: try again on the next tick
      if (isApiError(e, 'unauthorized')) cursor = null
    } finally {
      busy = false
    }
  }

  const timer = setInterval(() => void poll(), opts.intervalMs ?? 10_000)
  const onFocus = () => void poll()
  if (typeof window !== 'undefined') window.addEventListener('focus', onFocus)
  void poll()

  return {
    poll,
    stop() {
      stopped = true
      clearInterval(timer)
      if (typeof window !== 'undefined') window.removeEventListener('focus', onFocus)
    },
  }
}
