/**
 * A business's SMS limits (book chapter 10, P2 step 7): none from a business in review to a number its team typed in;
 * past so many a day or in 10 minutes an SMS waits, never dropped; the closing's notices are never held.
 */
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { signedInAdmin } from '../../../test/admin'
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
  const owner = async () => {
    const b = browser(t.app)
    await b.login(MAYSA)
    return b
  }
  const at = () => (start += 90)
  /** A phone booking the team types in, its SMS asked for; the jobs once its undo time is over. */
  async function phoneBooking(phone: string) {
    const made = await (
      await owner()
    ).req(`${W}/bookings`, {
      body: { source: 'phone', phone, serviceIds: [manicure], staffId: maral, date: '2026-10-27', start: at(), notifyClient: true },
    })
    expect(made.status, JSON.stringify(made.json)).toBe(201)
    t.clock.now += 20_000
    await runDueJobs(t.deps)
    return made.json.code as string
  }
  // what the jobs sent: a sign-in's code isn't one
  const sentTo = (phone: string) => t.sms.sent.filter((m) => m.to === phone && !/ code: /.test(m.text))
  /** The booking's first SMS job: done (with its note), or still waiting (`runAt`). */
  const firstJob = async (code: string) => {
    const [b] = await db.select().from(bookings).where(eq(bookings.code, code))
    const rows = (await db.select().from(jobs).where(eq(jobs.kind, 'booking.sms'))).filter((j) => j.payload.bookingId === b!.id)
    return rows.sort((x, y) => x.runAt.getTime() - y.runAt.getTime())[0]!
  }
  /** A limit's counter at `count`, as if that many went already. */
  const used = (key: string, count: number) =>
    db
      .insert(rateLimits)
      .values({ key, windowStart: new Date(t.clock.now), count })
      .onConflictDoUpdate({ target: rateLimits.key, set: { windowStart: new Date(t.clock.now), count } })
  const counted = async (key: string) => (await db.select().from(rateLimits).where(eq(rateLimits.key, key)))[0]?.count ?? 0

  it('a business that isn’t verified sends none to a number its team typed in; its online clients still hear theirs', async () => {
    await db.update(businesses).set({ verification: 'pending' }).where(eq(businesses.id, glowId))
    expect((await firstJob(await phoneBooking('+99365811001'))).error).toBe('dropped: the business is in review')
    expect(sentTo('+99365811001')).toEqual([])
    // a client who booked online while it was live, un-verified since (Q-275): still told it's confirmed
    await db.update(businesses).set({ verification: 'verified' }).where(eq(businesses.id, glowId))
    const client = browser(t.app)
    await client.login('+99365811002', 'Client')
    const asked = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: maral, date: '2026-10-27', start: at() },
    })
    await db.update(businesses).set({ verification: 'rejected' }).where(eq(businesses.id, glowId))
    expect((await (await owner()).req(`${W}/requests/${asked.json.code}/confirm`, { method: 'POST', body: {} })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(sentTo('+99365811002')).toHaveLength(1)
    await db.update(businesses).set({ verification: 'verified' }).where(eq(businesses.id, glowId))
  })

  it('past 30 in 10 minutes or 1000 a day an SMS waits for the window, then goes', async () => {
    await used(`sms:business:${glowId}:burst`, BUSINESS_SMS_PER_BURST)
    const code = await phoneBooking('+99365811003')
    expect(sentTo('+99365811003')).toEqual([])
    const waiting = await firstJob(code)
    expect(waiting).toMatchObject({ doneAt: null, attempts: 0 })
    expect(waiting.runAt.getTime()).toBeGreaterThan(t.clock.now)
    // the window, and the 10 minutes it's spread over
    t.clock.now += 20 * 60_000
    await runDueJobs(t.deps)
    expect(sentTo('+99365811003')).toHaveLength(1)
    await used(`sms:business:${glowId}:day`, BUSINESS_SMS_PER_DAY)
    await phoneBooking('+99365811004')
    expect(sentTo('+99365811004')).toEqual([])
    // the day, and the hour it's spread over
    t.clock.now += 25 * 3_600_000
    await runDueJobs(t.deps)
    expect(sentTo('+99365811004')).toHaveLength(1)
  })

  it('an SMS that says nothing doesn’t count; the closing’s notices are never held', async () => {
    // booked and cancelled before its first SMS: nothing goes, nothing counts
    const maysa = await owner()
    const made = await maysa.req(`${W}/bookings`, {
      body: {
        source: 'phone',
        phone: '+99365811005',
        serviceIds: [manicure],
        staffId: maral,
        date: '2026-10-27',
        start: at(),
        notifyClient: true,
      },
    })
    await maysa.req(`${W}/bookings/${made.json.code}/cancel`, { body: { reason: 'client_called' } })
    t.clock.now += 20_000
    await runDueJobs(t.deps)
    expect(await counted(`sms:business:${glowId}:burst`)).toBe(0)
    // the Ýeral team closes the business: its clients hear it, whatever the limits say
    await phoneBooking('+99365811006')
    expect(sentTo('+99365811006')).toHaveLength(1)
    await used(`sms:business:${glowId}:burst`, BUSINESS_SMS_PER_BURST)
    await used(`sms:business:${glowId}:day`, BUSINESS_SMS_PER_DAY)
    const team = await signedInAdmin(t, 'closer')
    expect((await team.req(`/v1/admin/businesses/${glowId}/close`, { body: { reason: 'The owner asked' } })).status).toBe(200)
    await runDueJobs(t.deps)
    expect(sentTo('+99365811006').at(-1)!.text).toMatch(/The business has closed/)
  })
})
