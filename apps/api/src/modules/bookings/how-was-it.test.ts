/** "How was it?" (book F-243): the latest completed visit still open to a review asks once; a review or a tap ends it. */
import { addDays, today } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, events, rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'

describe('how was it (book F-243)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })

  it('asks about the latest completed visit without a review; closing or reviewing it moves on; none past 30 days', async () => {
    const b = browser(t.app)
    const { me } = await b.login('+99365222301', 'Dowlet')
    expect((await b.req('/v1/me/how-was-it?lang=en')).json).toEqual({ visit: null })
    const [barber] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    const visit = (code: string, daysAgo: number, over: Partial<typeof bookings.$inferInsert> = {}) => ({
      code,
      businessId: barber!.id,
      type: 'appointment' as const,
      date: addDays(today(t.clock.now), -daysAgo),
      start: 600,
      end: 660,
      status: 'completed' as const,
      completedAt: new Date(t.clock.now - daysAgo * 86_400_000),
      source: 'web' as const,
      clientPhone: '+99365222301',
      clientName: 'Dowlet',
      userId: me.id,
      ...over,
    })
    await db.insert(bookings).values([
      visit('YR-99530301', 3),
      visit('YR-99530302', 1),
      // ended, still confirmed until the job marks it: it counts as completed
      visit('YR-99530305', 2, { status: 'confirmed', completedAt: null }),
      // inside the query's window, a day past the review's 30 days
      visit('YR-99530304', 31),
      visit('YR-99530303', 40),
      // ahead: nothing to ask yet, and closing it does nothing
      visit('YR-99530306', -2, { status: 'confirmed', completedAt: null }),
    ])
    const asked = async () => (await b.req('/v1/me/how-was-it?lang=en')).json.visit?.code ?? null
    const close = async (code: string) => (await b.req(`/v1/me/bookings/${code}/how-was-it/close`, { method: 'POST' })).status
    // the latest first
    expect((await b.req('/v1/me/how-was-it?lang=en')).json.visit).toMatchObject({ code: 'YR-99530302', business: { slug: 'barber-loft' } })
    // closed for good: the one before it asks; closing again does nothing more; the person's other screens hear it once
    expect(await close('YR-99530302')).toBe(204)
    expect(await close('YR-99530302')).toBe(204)
    const heard = await db
      .select()
      .from(events)
      .where(and(eq(events.userId, me.id), eq(events.bookingCode, 'YR-99530302')))
    expect(heard).toEqual([expect.objectContaining({ type: 'booking.updated', businessId: null, bookingId: null })])
    expect(await asked()).toBe('YR-99530305')
    expect(await close('YR-99530305')).toBe(204)
    expect(await asked()).toBe('YR-99530301')
    // a visit ahead isn't closed: it asks once it's over
    expect(await close('YR-99530306')).toBe(204)
    const [ahead] = await db.select().from(bookings).where(eq(bookings.code, 'YR-99530306'))
    expect(ahead!.howWasItClosedAt).toBeNull()
    // a review ends it too; the 31- and 40-day-old visits are past the review window
    expect((await b.req('/v1/me/bookings/YR-99530301/review', { body: { rating: 5 } })).status).toBe(200)
    expect((await b.req('/v1/me/how-was-it?lang=en')).json).toEqual({ visit: null })
    // someone else's visit isn't theirs to close
    const other = browser(t.app)
    await other.login('+99365222302', 'Other')
    expect((await other.req('/v1/me/bookings/YR-99530303/how-was-it/close', { method: 'POST' })).status).toBe(404)
    expect((await browser(t.app).req('/v1/me/how-was-it?lang=en')).status).toBe(401)
  })
})
