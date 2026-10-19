/** The phone-only switch and the no-show limit (book Q-127). */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, clients, rateLimits, services } from '../../db/schema'
import { seed } from '../../db/seed'
import { afterNoShow, noShowsSinceReset, setOnlineBlocked } from './online'

const THU = '2026-10-15'
const PHONE = '+99365444101'
const RULES = { blockAfterNoShows: 2 }

describe('phone-only after no-shows', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let b: ReturnType<typeof browser>
  let glowId: string
  let haircut: string

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    const [svc] = await db.select().from(services).where(eq(services.businessId, glowId)).limit(1)
    haircut = svc!.id
  })

  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
    b = browser(t.app)
    await b.login(PHONE, 'Läle')
  })

  /** Books the n-th free time on Thursday; the status says whether online booking is open to this client. */
  const book = async (n: number) => {
    const slots = (await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&date=${THU}`)).json.slots
    const res = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: null, date: THU, start: slots[n].start },
    })
    return res
  }
  const client = async () =>
    (
      await db
        .select()
        .from(clients)
        .where(and(eq(clients.businessId, glowId), eq(clients.phone, PHONE)))
    )[0]!
  let codes = 0
  /** A past visit the business marked "Gelmedi" at `at`. */
  const noShow = async (at: number) => {
    const c = await client()
    await db.insert(bookings).values({
      code: `YR-9${String(codes++).padStart(4, '0')}`,
      businessId: glowId,
      clientId: c.id,
      type: 'appointment',
      date: '2026-10-01',
      start: 600,
      end: 660,
      status: 'noshow',
      source: 'web',
      clientPhone: PHONE,
      complaintType: 'noshow',
      complaintAt: new Date(at),
    })
    return afterNoShow(db, c.id, RULES)
  }

  it('reaching the limit turns the switch on, and online booking closes', async () => {
    expect((await book(0)).status).toBe(201)
    expect(await noShow(DEMO_NOW - 3 * 86_400_000)).toBe(false)
    expect(await noShow(DEMO_NOW - 2 * 86_400_000)).toBe(true)
    expect((await client()).onlineBlocked).toBe(true)
    const refused = await book(1)
    expect(refused.json.error.code).toBe('online_blocked')
  })

  it('the business turns it off: online booking opens and the count starts from zero', async () => {
    const c = await client()
    await setOnlineBlocked(db, c.id, false, new Date(DEMO_NOW - 86_400_000))
    expect(await noShowsSinceReset(db, await client())).toBe(0)
    expect((await book(1)).status).toBe(201)
    // one new no-show is below the limit; the second reaches it again
    expect(await noShow(DEMO_NOW - 3_600_000)).toBe(false)
    expect((await book(2)).status).toBe(201)
    expect(await noShow(DEMO_NOW)).toBe(true)
    expect((await book(3)).json.error.code).toBe('online_blocked')
  })

  it('switched on by hand it blocks with no no-shows at all', async () => {
    const c = await client()
    await setOnlineBlocked(db, c.id, false, new Date(DEMO_NOW + 1000))
    expect((await book(3)).status).toBe(201)
    await setOnlineBlocked(db, c.id, true, new Date(DEMO_NOW + 2000))
    expect((await book(4)).json.error.code).toBe('online_blocked')
  })
})
