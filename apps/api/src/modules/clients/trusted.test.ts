/**
 * "Trusted on Ýeral" (design v0.7 · D, book F-246): the account's standing (`GET /v1/me/trusted`), the mark on the
 * business's row, card, request and Tag filter, and "Confirm trusted clients at once".
 */
import { addDays, today } from '@yeral/domain/time'
import { and, eq, inArray } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, bookings, businesses, clients, rateLimits, services, users } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const PHONE = '+99365777001'
const W = '/v1/w/glow-studio'
const TODAY = today(DEMO_NOW)

describe('trusted client (design v0.7 · D)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let barberId: string
  let haircut: string
  let userId: string
  let clientId: string
  let seq = 0

  /** A booking of the account's, at Glow (on its client row) or elsewhere, on a late hour nobody else books. */
  async function booking(x: { at: 'glow' | 'barber'; date: string; status: 'completed' | 'noshow'; complaint?: 'late' }) {
    const code = `YR-78${String(++seq).padStart(4, '0')}`
    const [row] = await db
      .insert(bookings)
      .values({
        code,
        businessId: x.at === 'glow' ? glowId : barberId,
        type: 'appointment',
        clientId: x.at === 'glow' ? clientId : null,
        userId,
        clientName: 'Trusted Test',
        clientPhone: PHONE,
        date: x.date,
        start: 1380,
        end: 1410,
        status: x.status,
        source: 'web',
        priceType: 'fixed',
        priceAmount: 100,
        ...(x.complaint ? { complaintType: x.complaint, complaintAt: new Date(DEMO_NOW - 3_600_000) } : {}),
      })
      .returning()
    return row!
  }

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [barber] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    glowId = glow!.id
    barberId = barber!.id
    const menu = await db.select().from(services).where(eq(services.businessId, glowId))
    haircut = menu.find((s) => s.name.en === "Women's haircut")!.id
    t = testApp(db)
    const b = browser(t.app)
    await b.login(PHONE, 'Trusted Test')
    const [user] = await db.select().from(users).where(eq(users.phone, PHONE))
    userId = user!.id
    const [row] = await db
      .insert(clients)
      .values({ businessId: glowId, phone: PHONE, name: 'Trusted Test', userId, source: 'yeral' })
      .returning()
    clientId = row!.id
  })
  // the account and the owner, signed in once a test (five codes an hour)
  let me: ReturnType<typeof browser>
  let maysa: ReturnType<typeof browser>
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
    me = browser(t.app)
    await me.login(PHONE)
    maysa = browser(t.app)
    await maysa.login(MAYSA)
  })

  const standing = async () => (await me.req('/v1/me/trusted')).json
  const row = async () => {
    const page = (await maysa.req(`${W}/clients?q=65777`)).json
    return { row: page.items[0], auto: page.auto, filtered: (await maysa.req(`${W}/clients?q=65777&auto=trusted`)).json }
  }

  it('five completed visits on Ýeral, at any business, earn the mark; the business sees only the mark', async () => {
    expect(await standing()).toEqual({ state: 'almost', visits: 0, pausedSince: null })
    expect((await row()).row).toMatchObject({ trusted: false })

    for (const days of [120, 90, 60]) await booking({ at: 'glow', date: addDays(TODAY, -days), status: 'completed' })
    await booking({ at: 'barber', date: addDays(TODAY, -30), status: 'completed' })
    expect(await standing()).toEqual({ state: 'almost', visits: 4, pausedSince: null })
    expect((await row()).row).toMatchObject({ trusted: false, visits: 3 })

    await booking({ at: 'barber', date: addDays(TODAY, -20), status: 'completed' })
    expect(await standing()).toEqual({ state: 'trusted', visits: 5, pausedSince: null })
    const seen = await row()
    // the row carries the mark and Glow's own three visits, never the two elsewhere
    expect(seen.row).toMatchObject({ trusted: true, visits: 3 })
    // the Tag filter's "Automatic" group: Trusted with its count, and the filter keeps only them
    expect(seen.auto).toEqual({ trusted: 1 })
    expect(seen.filtered.items.map((r: { id: string }) => r.id)).toEqual([clientId])
    expect(seen.filtered.total).toBe(1)
    expect((await maysa.req(`${W}/clients/${clientId}`)).json).toMatchObject({ trusted: true, stats: { visits: 3 } })
    // the mark together with a team tag: either keeps a client (one Tag filter)
    expect((await maysa.req(`${W}/clients?q=65777&auto=trusted&tag=nobody`)).json.total).toBe(1)
    expect((await maysa.req(`${W}/clients?q=65777&tag=nobody`)).json.total).toBe(0)
  })

  it('a no-show anywhere pauses it at once; five visits after it bring it back; a report pauses it too', async () => {
    const missed = await booking({ at: 'barber', date: addDays(TODAY, -10), status: 'noshow' })
    expect(await standing()).toEqual({ state: 'paused', visits: 0, pausedSince: addDays(TODAY, -10) })
    const paused = await row()
    expect(paused.row).toMatchObject({ trusted: false })
    expect(paused.auto).toEqual({ trusted: 0 })
    expect(paused.filtered.total).toBe(0)

    for (const days of [9, 8, 7, 6]) await booking({ at: 'glow', date: addDays(TODAY, -days), status: 'completed' })
    expect(await standing()).toEqual({ state: 'paused', visits: 4, pausedSince: addDays(TODAY, -10) })
    await booking({ at: 'barber', date: addDays(TODAY, -5), status: 'completed' })
    expect(await standing()).toEqual({ state: 'trusted', visits: 5, pausedSince: null })
    expect((await row()).row).toMatchObject({ trusted: true })

    // a report (late, rude, other) on a visit counts like a no-show
    const reported = await booking({ at: 'glow', date: addDays(TODAY, -2), status: 'completed', complaint: 'late' })
    expect(await standing()).toEqual({ state: 'paused', visits: 0, pausedSince: addDays(TODAY, -2) })
    // taken back, the mark comes back: nothing is stored
    await db.update(bookings).set({ complaintType: null, complaintAt: null }).where(eq(bookings.id, reported.id))
    expect(await standing()).toMatchObject({ state: 'trusted', visits: 6 })

    // the visits long before: a strike 12 months old is forgotten and every visit counts; one a day younger still
    // counts and nothing after it does
    await db
      .update(bookings)
      .set({ date: addDays(TODAY, -400) })
      .where(and(eq(bookings.userId, userId), eq(bookings.status, 'completed')))
    await db
      .update(bookings)
      .set({ date: addDays(TODAY, -365) })
      .where(eq(bookings.id, missed.id))
    expect(await standing()).toEqual({ state: 'trusted', visits: 11, pausedSince: null })
    await db
      .update(bookings)
      .set({ date: addDays(TODAY, -364) })
      .where(eq(bookings.id, missed.id))
    expect(await standing()).toEqual({ state: 'paused', visits: 0, pausedSince: addDays(TODAY, -364) })
    await db.delete(bookings).where(eq(bookings.id, missed.id))
    expect(await standing()).toEqual({ state: 'trusted', visits: 11, pausedSince: null })
  })

  it('"Confirm trusted clients at once": off, a trusted client’s request waits (the request shows the mark); on, it is confirmed at once', async () => {
    const date = addDays(TODAY, 20)
    const send = (start: number) =>
      me.req('/v1/bookings', { body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: null, date, start } })
    try {
      const waiting = await send(600)
      expect(waiting.status, JSON.stringify(waiting.json)).toBe(201)
      expect(waiting.json).toMatchObject({ status: 'pending' })
      const requests = (await maysa.req(`${W}/requests`)).json.items as { code: string; client: { trusted: boolean } }[]
      expect(requests.find((r) => r.code === waiting.json.code)?.client).toMatchObject({ trusted: true })

      await db.update(bookingRules).set({ confirmTrustedAtOnce: true }).where(eq(bookingRules.businessId, glowId))
      const atOnce = await send(720)
      expect(atOnce.status, JSON.stringify(atOnce.json)).toBe(201)
      expect(atOnce.json).toMatchObject({ status: 'confirmed' })
      // the other rules stand: the same time again is taken
      expect((await send(720)).json.error.code).toBe('slot_taken')

      // a client without the mark still waits
      await booking({ at: 'barber', date: addDays(TODAY, -3), status: 'noshow' })
      expect(await standing()).toMatchObject({ state: 'paused' })
      expect((await send(840)).json).toMatchObject({ status: 'pending' })
    } finally {
      await db.update(bookingRules).set({ confirmTrustedAtOnce: false }).where(eq(bookingRules.businessId, glowId))
      await db.delete(bookings).where(and(eq(bookings.userId, userId), inArray(bookings.date, [date])))
    }
  })
})
