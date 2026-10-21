/** A business's SMS limits (book chapter 10, P2 step 7): none while in review, so many to numbers its team typed in. */
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, jobs, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'
import { BUSINESS_SMS_PER_BURST, BUSINESS_SMS_PER_DAY, runDueJobs } from './run'

const MAYSA = '+99365102030' // owner of Glow Studio
const W = '/v1/w/glow-studio'

describe('a business’s SMS limits', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let manicure: string
  let maral: string
  let start = 510
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    manicure = (await db.select().from(services).where(eq(services.businessId, glowId))).find((s) => s.name.en === 'Manicure')!.id
    maral = (await db.select().from(staff).where(eq(staff.businessId, glowId))).find((s) => s.name === 'Maral')!.id
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })
  /** A phone booking the team types in, its SMS asked for; the jobs once its undo time is over. */
  async function phoneBooking(phone: string) {
    const maysa = browser(t.app)
    await maysa.login(MAYSA)
    const made = await maysa.req(`${W}/bookings`, {
      body: {
        source: 'phone',
        phone,
        serviceIds: [manicure],
        staffId: maral,
        date: '2026-10-27',
        start: (start += 90),
        notifyClient: true,
      },
    })
    expect(made.status, JSON.stringify(made.json)).toBe(201)
    t.clock.now += 20_000
    await runDueJobs(t.deps)
    return made.json.code as string
  }
  const sentTo = (phone: string) => t.sms.sent.filter((m) => m.to === phone)
  /** How the booking's first SMS was settled. */
  const noteOf = async (code: string) => {
    const [b] = await db.select().from(bookings).where(eq(bookings.code, code))
    const rows = await db.select().from(jobs).where(eq(jobs.kind, 'booking.sms'))
    // the news that went (or didn't); its reminders wait for their day
    return rows.find((j) => j.payload.bookingId === b!.id && j.doneAt)?.error ?? null
  }
  /** A limit's counter at `count`, as if that many went already. */
  const used = (key: string, count: number) =>
    db
      .insert(rateLimits)
      .values({ key, windowStart: new Date(t.clock.now), count })
      .onConflictDoUpdate({ target: rateLimits.key, set: { windowStart: new Date(t.clock.now), count } })

  it('a business in review sends nobody an SMS', async () => {
    await db.update(businesses).set({ verification: 'pending' }).where(eq(businesses.id, glowId))
    expect(await noteOf(await phoneBooking('+99365811001'))).toBe('dropped: the business is in review')
    expect(sentTo('+99365811001')).toEqual([])
    await db.update(businesses).set({ verification: 'verified' }).where(eq(businesses.id, glowId))
    await phoneBooking('+99365811002')
    expect(sentTo('+99365811002')).toHaveLength(1)
  })

  it('so many in 10 minutes and a day to numbers the team typed in', async () => {
    await used(`sms:business:${glowId}:burst`, BUSINESS_SMS_PER_BURST)
    expect(await noteOf(await phoneBooking('+99365811003'))).toBe("dropped: the business's SMS limit")
    expect(sentTo('+99365811003')).toEqual([])
    // 10 minutes on, the burst is over
    t.clock.now += 10 * 60_000
    await phoneBooking('+99365811004')
    expect(sentTo('+99365811004')).toHaveLength(1)
    await used(`sms:business:${glowId}:day`, BUSINESS_SMS_PER_DAY)
    await phoneBooking('+99365811005')
    expect(sentTo('+99365811005')).toEqual([])
  })
})
