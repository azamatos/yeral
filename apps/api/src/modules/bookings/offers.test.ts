/** Offered times name one specialist (book Q-159), go past with the lead time (Q-264); none free after an expiry (Q-252). */
import { epochOf } from '@yeral/domain/time'
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, bookings, businesses, rateLimits, services, staff, staffServices } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MIN = 60_000
const THU = '2026-10-15'
const FRI = '2026-10-16'

interface Offer {
  date: string
  start: number
  staff: { id: string; name: string } | null
  state: string
}

describe('offered times', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let haircut: string
  const who: Record<string, string> = {}

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    for (const s of await db.select().from(staff)) who[s.name] ??= s.id
    const [svc] = await db
      .select()
      .from(services)
      .where(eq(services.name, { tk: 'Aýal saç kesimi', ru: 'Женская стрижка', en: "Women's haircut" }))
    haircut = svc!.id
    // Maral cuts hair too: two specialists for the service
    await db.insert(staffServices).values({ staffId: who.Maral!, serviceId: haircut })
  })

  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })

  /** One of Aýna's free starts on Thursday, a different one per test: the n-th, counted from the end of the day. */
  const aynaFree = async (b: ReturnType<typeof browser>, n: number, date = THU) => {
    const res = await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&staff=${who['Aýna']}&date=${date}`)
    const starts = (res.json.slots as { start: number }[]).map((x) => x.start)
    return starts[starts.length - 1 - n]!
  }
  const request = async (phone: string, n: number, date = THU) => {
    const b = browser(t.app)
    await b.login(phone, 'Client')
    const start = await aynaFree(b, n, date)
    const staffId = who['Aýna']!
    const made = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId, date, start },
    })
    expect(made.status).toBe(201)
    return { b, code: made.json.code as string }
  }
  const offersOf = async (b: ReturnType<typeof browser>, code: string) =>
    (await b.req(`/v1/me/bookings/${code}`)).json.expiredAlternatives as Offer[]

  it('each offered time names one specialist, the one asked for when free', async () => {
    const { b, code } = await request('+99365444001', 0)
    t.clock.now += 31 * MIN
    await runDueJobs(t.deps)
    const offers = await offersOf(b, code)
    expect(offers).toHaveLength(3)
    for (const o of offers) expect(o).toMatchObject({ staff: { name: expect.any(String) }, state: 'free' })
    expect(offers.map((o) => o.staff?.name)).toContain('Aýna')
    const [row] = await db.select().from(bookings).where(eq(bookings.code, code))
    for (const o of row!.expiredAlternatives) expect(o.staffId).toBeTruthy()
  })

  it('an offer whose specialist is busy now shows as taken, and taking it books nobody else', async () => {
    const { b, code } = await request('+99365444002', 2)
    t.clock.now += 31 * MIN
    await runDueJobs(t.deps)
    const [first] = await offersOf(b, code)
    // someone else books that specialist at that time; the other one stays free
    const other = browser(t.app)
    await other.login('+99365444003', 'Other')
    const took = await other.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'glow-studio',
        serviceIds: [haircut],
        staffId: first!.staff!.id,
        date: first!.date,
        start: first!.start,
      },
    })
    expect(took.status).toBe(201)
    // the other specialist is free then: the old fallback would have booked them
    const otherId = first!.staff!.name === 'Aýna' ? who.Maral : who['Aýna']
    const free = await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&staff=${otherId}&date=${first!.date}`)
    expect(free.json.slots.map((x: { start: number }) => x.start)).toContain(first!.start)
    expect((await offersOf(b, code))[0]?.state).toBe('taken')
    const tried = await b.req(`/v1/me/bookings/${code}/accept-alternative`, { body: { source: 'expired', index: 0 } })
    expect(tried.status).toBe(409)
    expect(tried.json.error.code).toBe('slot_taken')
  })

  it('once one is taken the others go, and the row names the new booking', async () => {
    const { b, code } = await request('+99365444004', 4)
    t.clock.now += 31 * MIN
    await runDueJobs(t.deps)
    const taken = await b.req(`/v1/me/bookings/${code}/accept-alternative`, { body: { source: 'expired', index: 1 } })
    expect(taken.status).toBeLessThan(300)
    const detail = (await b.req(`/v1/me/bookings/${code}`)).json
    expect(detail.offerTakenBy).toBe(taken.json.code)
    expect(detail.expiredAlternatives).toEqual([])
  })

  it('an offered time is past once it starts earlier than now plus the lead time (book Q-264)', async () => {
    const { b, code } = await request('+99365444005', 6)
    t.clock.now += 31 * MIN
    await runDueJobs(t.deps)
    const [first] = await offersOf(b, code)
    // Glow Studio's lead time is the default hour: one minute inside it
    t.clock.now = epochOf(first!.date, first!.start) - 59 * MIN
    expect((await offersOf(b, code))[0]?.state).toBe('past')
    // taking it says so, not "just taken"
    const tried = await b.req(`/v1/me/bookings/${code}/accept-alternative`, { body: { source: 'expired', index: 0 } })
    expect(tried.json.error.code).toBe('offer_past')
  })

  it('a paused business shows no free times and no move: the client calls instead (book Q-154)', async () => {
    const { b, code } = await request('+99365444007', 10)
    t.clock.now += 31 * MIN
    await runDueJobs(t.deps)
    expect(await offersOf(b, code)).toHaveLength(3)
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    await db.update(bookingRules).set({ onlineEnabled: false }).where(eq(bookingRules.businessId, glow!.id))
    try {
      const detail = (await b.req(`/v1/me/bookings/${code}`)).json
      expect(detail).toMatchObject({ bookOnline: false, expiredAlternatives: [] })
      expect(detail.actions.reschedule).toBe(false)
    } finally {
      await db.update(bookingRules).set({ onlineEnabled: true }).where(eq(bookingRules.businessId, glow!.id))
    }
  })

  it('services nobody does alone still get times, split between people and naming nobody', async () => {
    const [massage] = await db
      .select()
      .from(services)
      .where(eq(services.name, { tk: 'Arka massažy', ru: 'Массаж спины', en: 'Back massage' }))
    const pair = [haircut, massage!.id]
    const c = browser(t.app)
    await c.login('+99365444008', 'Client')
    const slots = (await c.req(`/v1/businesses/glow-studio/availability?services=${pair.join(',')}&staff=any&date=${THU}`)).json.slots
    const made = await c.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: pair, staffId: null, date: THU, start: slots.at(-1).start },
    })
    expect(made.status).toBe(201)
    t.clock.now += 31 * MIN
    await runDueJobs(t.deps)
    const offers = await offersOf(c, made.json.code)
    expect(offers.length).toBeGreaterThan(0)
    for (const o of offers) expect(o).toMatchObject({ staff: null, state: 'free' })
  })

  const tabs = async (b: ReturnType<typeof browser>) => {
    const codes = async (tab: string) => ((await b.req(`/v1/me/bookings?tab=${tab}`)).json.items as { code: string }[]).map((i) => i.code)
    return { upcoming: await codes('upcoming'), past: await codes('past') }
  }

  it('an expired request stays on top of upcoming while an offered time is ahead (book C-26, C-40)', async () => {
    const { b, code } = await request('+99365444009', 0, FRI)
    t.clock.now += 31 * MIN
    await runDueJobs(t.deps)
    const offers = await offersOf(b, code)
    expect(offers.length).toBeGreaterThan(0)
    // a newer request, earlier in the day: still below the one with offered times
    const free = await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&staff=${who['Aýna']}&date=${FRI}`)
    const sooner = (free.json.slots as { start: number }[])[0]!.start
    expect(sooner).toBeLessThan((await b.req(`/v1/me/bookings/${code}`)).json.start)
    const made = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: who['Aýna'], date: FRI, start: sooner },
    })
    expect(made.status).toBe(201)
    expect(await tabs(b)).toEqual({ upcoming: [code, made.json.code], past: [] })
    // every offered time inside the lead time: the row goes to past
    t.clock.now = Math.max(...offers.map((o) => epochOf(o.date, o.start))) - 59 * MIN
    const now = await tabs(b)
    expect(now.upcoming).not.toContain(code)
    expect(now.past).toContain(code)
  })

  it('a declined request stays on top of upcoming until one of its offered times is taken (book C-25, C-40)', async () => {
    const { b, code } = await request('+99365444010', 2, FRI)
    const start = await aynaFree(b, 4, FRI)
    await db
      .update(bookings)
      .set({
        status: 'cancelled',
        cancelledBy: 'business',
        cancelledAt: new Date(t.clock.now),
        declineReason: 'slot_busy',
        declineAlternatives: [{ date: FRI, start, end: start + 60, staffId: who['Aýna']! }],
      })
      .where(eq(bookings.code, code))
    expect(await tabs(b)).toEqual({ upcoming: [code], past: [] })
    const taken = await b.req(`/v1/me/bookings/${code}/accept-alternative`, { body: { source: 'decline', index: 0 } })
    expect(taken.status).toBeLessThan(300)
    expect(await tabs(b)).toEqual({ upcoming: [taken.json.code], past: [code] })
  })

  it('with nothing free the expiry SMS asks for another time (book Q-252)', async () => {
    const { b, code } = await request('+99365444006', 8)
    await db.update(services).set({ online: false }).where(eq(services.id, haircut))
    try {
      t.clock.now += 31 * MIN
      await runDueJobs(t.deps)
      expect(await offersOf(b, code)).toEqual([])
      expect(t.sms.sent.filter((s) => s.to === '+99365444006').at(-1)?.text).toMatch(
        /^Ýeral: Glow Studio didn't answer in time\. Pick another time: localhost:3001\/l\/[\w-]{20,}$/,
      )
    } finally {
      await db.update(services).set({ online: true }).where(eq(services.id, haircut))
    }
  })
})
