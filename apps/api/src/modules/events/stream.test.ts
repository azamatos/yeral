import { eq } from 'drizzle-orm'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { DEMO_NOW, ORIGIN, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import { urlFor } from '../../../test/env'
import type { Db } from '../../db/client'
import { businesses, users } from '../../db/schema'
import { seed } from '../../db/seed'
import { emit, EVENTS_CHANNEL } from '../../notify'
import { nullLogger } from '../../ports/log'
import { changeOf, createLive, listenForEvents } from './live'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // specialist at Glow Studio

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('the push channel (GET /v1/events/stream)', () => {
  let db: Db
  let name: string
  let glow: string
  const userOf = async (phone: string) => (await db.select({ id: users.id }).from(users).where(eq(users.phone, phone)))[0]!.id

  beforeAll(async () => {
    ;({ db, name } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    glow = (await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.slug, 'glow-studio')))[0]!.id
  })

  it('an event NOTIFYs its business and user when its transaction commits, and never when it rolls back', async () => {
    const listener = new pg.Client({ connectionString: urlFor(name) })
    await listener.connect()
    await listener.query(`LISTEN ${EVENTS_CHANNEL}`)
    const heard: (string | undefined)[] = []
    listener.on('notification', (m) => heard.push(m.payload))
    try {
      await db.transaction(async (tx) => {
        await emit(tx, { type: 'business.updated', businessId: glow })
        await pause(50)
        // not before the commit
        expect(heard).toEqual([])
      })
      await vi.waitFor(() => expect(heard.map(changeOf)).toEqual([{ businessId: glow, userId: null }]))
      await db
        .transaction(async (tx) => {
          await emit(tx, { type: 'business.updated', businessId: glow })
          tx.rollback()
        })
        .catch(() => undefined)
      await pause(100)
      expect(heard).toHaveLength(1)
    } finally {
      await listener.end()
    }
  })

  it('a change nudges the open streams of its user and of the business’s team, and no one else’s', async () => {
    const live = createLive(db, { batchMs: 5 })
    const [owner, specialist, client] = [await userOf(MAYSA), await userOf(AYNA), crypto.randomUUID()]
    const nudged: string[] = []
    const closers = [owner, specialist, client].map((id) =>
      live.open(
        id,
        () => nudged.push(id),
        () => undefined,
      ),
    )
    await live.changed({ businessId: glow, userId: null })
    expect(nudged.sort()).toEqual([owner, specialist].sort())
    nudged.length = 0
    await live.changed({ businessId: null, userId: client })
    expect(nudged).toEqual([client])
    nudged.length = 0
    // a stream closed hears nothing; the LISTEN back after a drop nudges every one still open
    closers[2]!()
    await live.changed({ businessId: null, userId: client })
    live.nudgeAll()
    expect(nudged.sort()).toEqual([owner, specialist].sort())
    for (const close of closers) close()
  })

  it('NOTIFYs close together are asked about once; an account past its streams ends its oldest', async () => {
    const live = createLive(db, { batchMs: 5 })
    const owner = await userOf(MAYSA)
    const nudged: number[] = []
    const ended: number[] = []
    const closers = Array.from({ length: 11 }, (_, i) =>
      live.open(
        owner,
        () => nudged.push(i),
        () => ended.push(i),
      ),
    )
    expect(ended).toEqual([0])
    await Promise.all([live.changed({ businessId: glow, userId: null }), live.changed({ businessId: glow, userId: owner })])
    // each stream once
    expect(nudged.sort((a, b) => a - b)).toEqual(Array.from({ length: 11 }, (_, i) => i))
    for (const close of closers) close()
  })

  it('a committed event behind an older transaction still running is held, and says so, until that one ends', async () => {
    const t = testApp(db)
    const b = browser(t.app)
    await b.login(MAYSA)
    const { cursor } = (await b.req('/v1/events')).json as { cursor: string }
    const older = new pg.Client({ connectionString: urlFor(name) })
    await older.connect()
    try {
      // a transaction with an id, still running
      await older.query('begin')
      await older.query('select pg_current_xact_id()')
      await emit(db, { type: 'business.updated', businessId: glow })
      const waiting = (await b.req(`/v1/events?after=${cursor}`)).json as { items: unknown[]; held: boolean }
      expect(waiting).toMatchObject({ items: [], held: true })
      await older.query('commit')
      await vi.waitFor(
        async () => {
          const shown = (await b.req(`/v1/events?after=${cursor}`)).json as { items: { type: string }[]; held: boolean }
          expect(shown.items.map((e) => e.type)).toContain('business.updated')
        },
        { timeout: 5_000, interval: 100 },
      )
    } finally {
      await older.end()
    }
  })

  it('a NOTIFY’s payload that isn’t ours is ignored', () => {
    expect(changeOf('{"b":"x","u":null}')).toEqual({ businessId: 'x', userId: null })
    expect(changeOf('not json')).toBeNull()
    expect(changeOf(undefined)).toBeNull()
    expect(changeOf('{"b":5}')).toEqual({ businessId: null, userId: null })
  })

  describe('the stream', () => {
    const t = () => testApp(db)
    let app: ReturnType<typeof testApp>
    let stopListening: () => Promise<void>
    beforeAll(() => {
      app = t()
      stopListening = listenForEvents(urlFor(name), app.deps.live, nullLogger)
    })
    afterAll(() => stopListening())

    it('needs someone signed in', async () => {
      expect((await browser(app.app).req('/v1/events/stream')).status).toBe(401)
    })

    it('says ready at once, then changed when an event of theirs commits; nothing slows or compresses it', async () => {
      const b = browser(app.app)
      await b.login(MAYSA)
      const res = await app.app.request('/v1/events/stream', { headers: { Origin: ORIGIN, Cookie: b.cookie } })
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/event-stream')
      expect(res.headers.get('cache-control')).toBe('no-cache, no-transform')
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      const until = async (text: string) => {
        let read = ''
        while (!read.includes(text)) {
          const { done, value } = await reader.read()
          if (done) throw new Error(`the stream ended before «${text}»: ${read}`)
          read += decoder.decode(value)
        }
        return read
      }
      // the team's event, through the database's NOTIFY and the api's LISTEN (which connects meanwhile: sent again)
      const sent: Promise<void>[] = []
      let ticker: ReturnType<typeof setInterval> | undefined
      try {
        expect(await until('\n\n')).toMatch(/^event: ready\n/)
        ticker = setInterval(() => sent.push(emit(db, { type: 'business.updated', businessId: glow })), 200)
        expect(await until('event: changed')).toMatch(/event: changed\n/)
      } finally {
        clearInterval(ticker)
        await Promise.all(sent)
        await reader.cancel()
      }
    })
  })
})
