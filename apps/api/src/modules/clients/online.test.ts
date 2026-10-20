/** The phone-only switch and the no-show limit (book Q-127). */
import { addDays } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, bookings, businesses, clients, rateLimits, services } from '../../db/schema'
import { seed } from '../../db/seed'
import { noShowsSinceReset, setNoShowLimit, setOnlineBlocked } from './online'

const THU = '2026-10-15'
const DAY = 86_400_000
const RULES = { blockAfterNoShows: 2 }

describe('phone-only after no-shows', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let haircut: string
  let codes = 0

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
  })

  /** A signed-in client with one booking at Glow Studio, so the business has them on its list. */
  async function newClient(phone: string) {
    const b = browser(t.app)
    await b.login(phone, 'Läle')
    /** Books the first free time in the two weeks from Thursday: 201, or the reason it's refused. */
    const book = async () => {
      for (let date = THU; date < addDays(THU, 14); date = addDays(date, 1)) {
        const slots = (await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&date=${date}`)).json.slots
        if (!slots.length) continue
        return b.req('/v1/bookings', {
          body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: null, date, start: slots[0].start },
        })
      }
      throw new Error('no free haircut at Glow Studio in two weeks')
    }
    expect((await book()).status).toBe(201)
    const row = async () =>
      (
        await db
          .select()
          .from(clients)
          .where(and(eq(clients.businessId, glowId), eq(clients.phone, phone)))
      )[0]!
    /** A past visit the business marked "Gelmedi" at `at` (with a complaint, or only by the status change). */
    const noShow = async (at: number, by: 'complaint' | 'status' = 'complaint') => {
      const [made] = await db
        .insert(bookings)
        .values({
          // six digits: random booking codes have five, so the demo seed can't take one of these
          code: `YR-9${String(codes++).padStart(5, '0')}`,
          businessId: glowId,
          clientId: (await row()).id,
          type: 'appointment',
          date: '2026-10-01',
          start: 600,
          end: 660,
          status: 'noshow',
          source: 'web',
          clientPhone: phone,
          completedAt: new Date(at),
          ...(by === 'complaint' ? { complaintType: 'noshow' as const, complaintAt: new Date(at) } : {}),
        })
        .returning()
      return made!
    }
    return { book, row, noShow }
  }

  it('the no-shows reach the limit: online booking closes; removing a wrong one lifts it (book Q-207)', async () => {
    const c = await newClient('+99365444101')
    await c.noShow(DEMO_NOW - 3 * DAY)
    expect((await c.book()).status).toBe(201)
    const second = await c.noShow(DEMO_NOW - 2 * DAY)
    expect((await c.book()).json.error.code).toBe('online_blocked')
    await db.update(bookings).set({ status: 'completed' }).where(eq(bookings.id, second.id))
    expect((await c.book()).status).toBe(201)
  })

  it('turned off, the count starts from zero, and closes again at the limit', async () => {
    const c = await newClient('+99365444102')
    await c.noShow(DEMO_NOW - 3 * DAY)
    await c.noShow(DEMO_NOW - 2 * DAY)
    expect((await c.book()).json.error.code).toBe('online_blocked')
    await setOnlineBlocked(db, (await c.row()).id, false, RULES, new Date(DEMO_NOW - DAY))
    expect(await noShowsSinceReset(db, (await c.row()).id)).toBe(0)
    expect((await c.book()).status).toBe(201)
    await c.noShow(DEMO_NOW - 3_600_000)
    expect((await c.book()).status).toBe(201)
    await c.noShow(DEMO_NOW)
    expect((await c.book()).json.error.code).toBe('online_blocked')
  })

  it('saving "off" for a client who isn’t blocked keeps their no-shows', async () => {
    const c = await newClient('+99365444103')
    await c.noShow(DEMO_NOW - 2 * DAY)
    await setOnlineBlocked(db, (await c.row()).id, false, RULES, new Date(DEMO_NOW - DAY))
    expect((await c.row()).noShowsSince).toBeNull()
    await c.noShow(DEMO_NOW)
    expect((await c.book()).json.error.code).toBe('online_blocked')
  })

  it('a limit of 0 lifts a block that came from the count; one set by hand stays', async () => {
    const counted = await newClient('+99365444104')
    await counted.noShow(DEMO_NOW - 2 * DAY)
    await counted.noShow(DEMO_NOW - DAY)
    const byHand = await newClient('+99365444105')
    await setOnlineBlocked(db, (await byHand.row()).id, true, RULES, new Date(DEMO_NOW))
    expect((await counted.book()).json.error.code).toBe('online_blocked')
    await db.update(bookingRules).set({ blockAfterNoShows: 0 }).where(eq(bookingRules.businessId, glowId))
    try {
      expect((await counted.book()).status).toBe(201)
      expect((await byHand.book()).json.error.code).toBe('online_blocked')
    } finally {
      await db.update(bookingRules).set({ blockAfterNoShows: 2 }).where(eq(bookingRules.businessId, glowId))
    }
  })

  it('a no-show counts from when it was marked, not from a complaint added later', async () => {
    const c = await newClient('+99365444106')
    const old = await c.noShow(DEMO_NOW - 3 * DAY, 'status')
    await c.noShow(DEMO_NOW - 3 * DAY, 'status')
    await setOnlineBlocked(db, (await c.row()).id, false, RULES, new Date(DEMO_NOW - 2 * DAY))
    expect(await noShowsSinceReset(db, (await c.row()).id)).toBe(0)
    // a complaint filed on the old one afterwards doesn't bring it back
    await db
      .update(bookings)
      .set({ complaintType: 'late', complaintAt: new Date(DEMO_NOW - DAY) })
      .where(eq(bookings.id, old.id))
    expect(await noShowsSinceReset(db, (await c.row()).id)).toBe(0)
    await c.noShow(DEMO_NOW - 3_600_000, 'status')
    await c.noShow(DEMO_NOW, 'status')
    expect((await c.book()).json.error.code).toBe('online_blocked')
  })

  it('"on" saved for a client the count blocks stays the count’s: removing a no-show lifts it', async () => {
    const c = await newClient('+99365444107')
    await c.noShow(DEMO_NOW - 2 * DAY)
    const second = await c.noShow(DEMO_NOW - DAY)
    await setOnlineBlocked(db, (await c.row()).id, true, RULES, new Date(DEMO_NOW))
    expect((await c.row()).onlineBlocked).toBe(false)
    await db.update(bookings).set({ status: 'completed' }).where(eq(bookings.id, second.id))
    expect((await c.book()).status).toBe(201)
  })

  it('"off" for a block set only by hand keeps the no-shows below the limit', async () => {
    const c = await newClient('+99365444108')
    await c.noShow(DEMO_NOW - 2 * DAY)
    await setOnlineBlocked(db, (await c.row()).id, true, RULES, new Date(DEMO_NOW - DAY))
    expect((await c.book()).json.error.code).toBe('online_blocked')
    await setOnlineBlocked(db, (await c.row()).id, false, RULES, new Date(DEMO_NOW - 3_600_000))
    expect((await c.row()).noShowsSince).toBeNull()
    expect((await c.book()).status).toBe(201)
    await c.noShow(DEMO_NOW)
    expect((await c.book()).json.error.code).toBe('online_blocked')
  })

  it('"off" works from the current row: a hand block set meanwhile is cleared too', async () => {
    const c = await newClient('+99365444109')
    const id = (await c.row()).id
    await setOnlineBlocked(db, id, true, RULES, new Date(DEMO_NOW - DAY))
    await setOnlineBlocked(db, id, false, RULES, new Date(DEMO_NOW))
    expect((await c.row()).onlineBlocked).toBe(false)
    expect((await c.book()).status).toBe(201)
  })

  it('a lowered limit counts only no-shows from that day; a raised one lifts at once (plan review, 19.10.2026)', async () => {
    const c = await newClient('+99365444111')
    await c.noShow(DEMO_NOW - 3 * DAY)
    await c.noShow(DEMO_NOW - 2 * DAY)
    // the limit was 3: two old no-shows don't block
    await setNoShowLimit(db, glowId, 3, new Date(DEMO_NOW - 4 * DAY))
    expect((await c.book()).status).toBe(201)
    // lowered to 2 today: the old two don't count against it
    await setNoShowLimit(db, glowId, 2, new Date(DEMO_NOW - DAY))
    try {
      expect((await c.book()).status).toBe(201)
      await c.noShow(DEMO_NOW - 3_600_000)
      expect((await c.book()).status).toBe(201)
      await c.noShow(DEMO_NOW)
      expect((await c.book()).json.error.code).toBe('online_blocked')
      // raised again: lifted at once
      await setNoShowLimit(db, glowId, 3, new Date(DEMO_NOW))
      expect((await c.book()).status).toBe(201)
    } finally {
      await db.update(bookingRules).set({ blockAfterNoShows: 2, noShowsCountFrom: null }).where(eq(bookingRules.businessId, glowId))
    }
  })
})
