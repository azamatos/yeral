/** Offered times name one specialist (book Q-159), go past with the lead time (Q-264); none free after an expiry (Q-252). */
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, rateLimits, services, staff, staffServices } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MIN = 60_000
const THU = '2026-10-15'

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
  const aynaFree = async (b: ReturnType<typeof browser>, n: number) => {
    const res = await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&staff=${who['Aýna']}&date=${THU}`)
    const starts = (res.json.slots as { start: number }[]).map((x) => x.start)
    return starts[starts.length - 1 - n]!
  }
  const request = async (phone: string, n: number) => {
    const b = browser(t.app)
    await b.login(phone, 'Client')
    const start = await aynaFree(b, n)
    const staffId = who['Aýna']!
    const made = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId, date: THU, start },
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
    const [row] = await db.select().from(bookings).where(eq(bookings.code, code))
    const startsAt = new Date(`${first!.date}T00:00:00+05:00`).getTime() + first!.start * MIN
    t.clock.now = startsAt - 59 * MIN
    expect(row!.expiredAlternatives[0]?.start).toBe(first!.start)
    expect((await offersOf(b, code))[0]?.state).toBe('past')
  })

  it('with nothing free the expiry SMS asks for another time (book Q-252)', async () => {
    const { b, code } = await request('+99365444006', 8)
    await db.update(services).set({ online: false }).where(eq(services.id, haircut))
    try {
      t.clock.now += 31 * MIN
      await runDueJobs(t.deps)
      expect(await offersOf(b, code)).toEqual([])
      expect(t.sms.sent.filter((s) => s.to === '+99365444006').at(-1)?.text).toMatch(
        /^Ýeral: Glow Studio didn't answer in time\. Pick another time: localhost:3001\/b\/YR-\d+$/,
      )
    } finally {
      await db.update(services).set({ online: true }).where(eq(services.id, haircut))
    }
  })
})
