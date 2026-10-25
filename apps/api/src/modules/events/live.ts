/**
 * The push channel's nudges (systemPatterns.md "Live updates"): `emit` NOTIFYs `yeral_events` with an event's business
 * and user when its transaction commits; one LISTEN per api process hands each to `changed`, which nudges the open
 * streams (`GET /v1/events/stream`) of that user and of everyone on that business's team. A nudge carries nothing: the
 * screen reads `GET /v1/events` as before, so who sees what stays decided in one place.
 */
import { and, eq } from 'drizzle-orm'
import pg from 'pg'
import type { Queryable } from '../../db/client'
import { staff } from '../../db/schema'
import { EVENTS_CHANNEL } from '../../notify'
import type { Logger } from '../../ports/log'
import { signsIn } from '../team/members'

export interface Live {
  /** One of `userId`'s streams is open: `nudge` tells it something may have changed. Returns what closes it. */
  open(userId: string, nudge: () => void): () => void
  /** An event committed for this business and this user (either may be null). */
  changed(change: { businessId: string | null; userId: string | null }): Promise<void>
  /** Every open stream: the LISTEN was lost a while, so anything may have been missed. */
  nudgeAll(): void
}

export function createLive(db: Queryable): Live {
  const streams = new Map<string, Set<() => void>>()
  const nudge = (userId: string) => {
    for (const n of streams.get(userId) ?? []) n()
  }
  return {
    open(userId, n) {
      const own = streams.get(userId) ?? new Set()
      streams.set(userId, own.add(n))
      return () => {
        own.delete(n)
        if (!own.size) streams.delete(userId)
      }
    },
    async changed({ businessId, userId }) {
      // no stream open in this process: nobody to tell, nothing to ask
      if (!streams.size) return
      if (userId) nudge(userId)
      if (!businessId) return
      // the team as it is now: someone who just joined hears about it
      const team = await db
        .select({ userId: staff.userId })
        .from(staff)
        .where(and(eq(staff.businessId, businessId), signsIn))
      for (const member of team) if (member.userId && member.userId !== userId) nudge(member.userId)
    },
    nudgeAll() {
      for (const own of streams.values()) for (const n of own) n()
    },
  }
}

/** A NOTIFY's payload: `{ b, u }`, the business's and the user's ids or null; anything else is ignored. */
export function changeOf(payload: string | undefined): { businessId: string | null; userId: string | null } | null {
  try {
    const { b, u } = JSON.parse(payload ?? '') as { b?: unknown; u?: unknown }
    const id = (v: unknown) => (typeof v === 'string' ? v : null)
    return { businessId: id(b), userId: id(u) }
  } catch {
    return null
  }
}

/**
 * The api's one LISTEN, on a connection of its own (a pool's would go back and stop hearing). It comes back after a
 * drop, 5 s later, and then nudges every stream. Returns what stops it.
 */
export function listenForEvents(connectionString: string, live: Live, log: Logger): () => Promise<void> {
  let client: pg.Client | null = null
  let stopped = false
  let lost = false
  let retry: ReturnType<typeof setTimeout> | undefined

  const again = () => {
    if (stopped || retry) return
    retry = setTimeout(() => {
      retry = undefined
      void connect()
    }, 5_000)
  }
  const connect = async () => {
    const c = new pg.Client({ connectionString })
    c.on('notification', (message) => {
      const change = message.channel === EVENTS_CHANNEL ? changeOf(message.payload) : null
      if (change) void live.changed(change).catch((error: unknown) => log.warn('events nudge failed', { error: String(error) }))
    })
    c.on('error', (error) => {
      log.warn('events listen lost', { error: String(error) })
      lost = true
      client = null
      void c.end().catch(() => undefined)
      again()
    })
    try {
      await c.connect()
      await c.query(`LISTEN ${EVENTS_CHANNEL}`)
      client = c
      if (lost) live.nudgeAll()
      lost = false
    } catch (error) {
      log.warn('events listen failed', { error: String(error) })
      lost = true
      void c.end().catch(() => undefined)
      again()
    }
  }
  void connect()
  return async () => {
    stopped = true
    clearTimeout(retry)
    await client?.end().catch(() => undefined)
  }
}
