/**
 * The push channel's nudges (ADR 0028; systemPatterns.md "Live updates"): `emit` NOTIFYs `yeral_events` with an event's
 * business and user when its transaction commits; one LISTEN per api process hands each to `changed`, which nudges the
 * open streams (`GET /v1/events/stream`) of that user and of everyone on that business's team. A nudge carries nothing:
 * the screen reads `GET /v1/events` as before, so who sees what stays decided in one place.
 */
import { and, inArray } from 'drizzle-orm'
import pg from 'pg'
import type { Queryable } from '../../db/client'
import { staff } from '../../db/schema'
import { EVENTS_CHANNEL } from '../../notify'
import type { Logger } from '../../ports/log'
import { signsIn } from '../team/members'

/** Streams one account may keep open at once: a new one past it ends the oldest (each holds a connection). */
export const STREAMS_PER_USER = 10

export interface Live {
  /**
   * One of `userId`'s streams is open: `nudge` tells it something may have changed, `end` closes it (the account's
   * oldest, past `STREAMS_PER_USER`). Returns what forgets it.
   */
  open(userId: string, nudge: () => void, end: () => void): () => void
  /** An event committed for this business and this user (either may be null); NOTIFYs close together go as one. */
  changed(change: { businessId: string | null; userId: string | null }): Promise<void>
  /** Every open stream: the LISTEN was down a while, so anything may have been missed. */
  nudgeAll(): void
}

type Stream = { nudge: () => void; end: () => void }

export function createLive(db: Queryable, { batchMs = 50 }: { batchMs?: number } = {}): Live {
  // by account, oldest first
  const streams = new Map<string, Stream[]>()
  const nudge = (userId: string) => {
    for (const s of streams.get(userId) ?? []) s.nudge()
  }
  // NOTIFYs of the next few milliseconds, asked about together (a jobs tick expiring many requests sends many)
  let users = new Set<string>()
  let teams = new Set<string>()
  let flushing: Promise<void> | null = null
  const flush = async () => {
    const [u, t] = [users, teams]
    users = new Set()
    teams = new Set()
    flushing = null
    for (const id of u) nudge(id)
    const open = [...streams.keys()]
    if (!t.size || !open.length) return
    // the teams as they are now (someone who just joined hears it), only those with a stream open here
    const members = await db
      .selectDistinct({ userId: staff.userId })
      .from(staff)
      .where(and(inArray(staff.businessId, [...t]), signsIn, inArray(staff.userId, open)))
    for (const m of members) if (m.userId && !u.has(m.userId)) nudge(m.userId)
  }
  return {
    open(userId, n, end) {
      const own = streams.get(userId) ?? []
      const stream = { nudge: n, end }
      streams.set(userId, [...own, stream])
      if (own.length >= STREAMS_PER_USER) own[0]!.end()
      return () => {
        const left = (streams.get(userId) ?? []).filter((s) => s !== stream)
        if (left.length) streams.set(userId, left)
        else streams.delete(userId)
      }
    },
    changed({ businessId, userId }) {
      // no stream open in this process: nobody to tell, nothing to ask
      if (!streams.size) return Promise.resolve()
      if (userId) users.add(userId)
      if (businessId) teams.add(businessId)
      flushing ??= new Promise((resolve) => setTimeout(resolve, batchMs)).then(flush)
      return flushing
    },
    nudgeAll() {
      for (const own of streams.values()) for (const s of own) s.nudge()
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
 * The api's one LISTEN, on a connection of its own (a pool's would go back and stop hearing). Every 30 s it asks the
 * database something, so a connection that died without a word is noticed; after a drop it comes back 5 s later. Each
 * time it's (back) up it nudges every stream, which may have missed something meanwhile. Returns what stops it.
 */
export function listenForEvents(connectionString: string, live: Live, log: Logger): () => Promise<void> {
  let client: pg.Client | null = null
  let stopped = false
  let retry: ReturnType<typeof setTimeout> | undefined

  const drop = (c: pg.Client, error: unknown) => {
    if (client !== c) return
    log.warn('events listen lost', { error: String(error) })
    client = null
    void c.end().catch(() => undefined)
    again()
  }
  const again = () => {
    if (stopped || retry) return
    retry = setTimeout(() => {
      retry = undefined
      void connect()
    }, 5_000)
  }
  const connect = async () => {
    const c = new pg.Client({ connectionString, keepAlive: true, connectionTimeoutMillis: 10_000, query_timeout: 10_000 })
    c.on('notification', (message) => {
      const change = message.channel === EVENTS_CHANNEL ? changeOf(message.payload) : null
      if (change) void live.changed(change).catch((error: unknown) => log.warn('events nudge failed', { error: String(error) }))
    })
    c.on('error', (error) => drop(c, error))
    try {
      await c.connect()
      await c.query(`LISTEN ${EVENTS_CHANNEL}`)
    } catch (error) {
      log.warn('events listen failed', { error: String(error) })
      void c.end().catch(() => undefined)
      return again()
    }
    if (stopped) return void c.end().catch(() => undefined)
    client = c
    live.nudgeAll()
  }
  const health = setInterval(() => {
    const c = client
    if (c) void c.query('select 1').catch((error: unknown) => drop(c, error))
  }, 30_000)
  void connect()
  return async () => {
    stopped = true
    clearTimeout(retry)
    clearInterval(health)
    const c = client
    client = null
    await c?.end().catch(() => undefined)
  }
}
