/** The end-to-end flows' hook: time passes for one booking, and the real jobs do the rest (`E2E_HOOKS`). */
import { addDays, today } from '@yeral/domain/time'
import { and, eq, gt, gte } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses } from '../../db/schema'
import { seed } from '../../db/seed'

describe('e2e hook: time passes for one booking', () => {
  let db: Db
  let salon: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    salon = (await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio')))[0]!.id
  })
  const elapse = (app: ReturnType<typeof testApp>['app'], code: string) =>
    app.request(`/v1/e2e/bookings/${code}/elapse`, { method: 'POST' })
  const rowOf = async (id: string) => (await db.select().from(bookings).where(eq(bookings.id, id)))[0]!

  it('is not there unless the hooks are on', async () => {
    const res = await elapse(testApp(db).app, 'YR-000000')
    expect(res.status).toBe(404)
  })

  it('a waiting request runs out now: cancelled by the system with offered times, as the expiry job does', async () => {
    const [pending] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.businessId, salon), eq(bookings.status, 'pending'), gt(bookings.holdUntil, new Date(DEMO_NOW))))
    expect(pending, 'the seed has a request still waiting').toBeDefined()
    const res = await elapse(testApp(db, { e2eHooks: true }).app, pending!.code)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'cancelled' })
    const row = await rowOf(pending!.id)
    expect(row.cancelledBy).toBe('system')
    expect(row.expiredAlternatives?.length).toBeGreaterThan(0)
    expect(row.expiredAlternatives?.length).toBeLessThanOrEqual(3)
  })

  it('a confirmed visit becomes a day earlier and completes, as the completion job does; anything else is refused', async () => {
    const [confirmed] = await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.businessId, salon),
          eq(bookings.status, 'confirmed'),
          gte(bookings.date, '2026-10-14'),
          gt(bookings.start, 11 * 60 + 20),
        ),
      )
    expect(confirmed, 'the seed has a visit ahead').toBeDefined()
    const t = testApp(db, { e2eHooks: true })
    const res = await elapse(t.app, confirmed!.code)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'completed' })
    const row = await rowOf(confirmed!.id)
    expect(row.date < confirmed!.date).toBe(true)
    expect(row.start).toBe(confirmed!.start)
    // done already: nothing more passes for it
    expect((await elapse(t.app, confirmed!.code)).status).toBe(409)
    expect((await elapse(t.app, 'YR-000000')).status).toBe(404)
  })

  it('a visit booked days ahead goes back past today, not just a day before its own date, so it completes', async () => {
    const [confirmed] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.businessId, salon), eq(bookings.status, 'confirmed'), gt(bookings.start, 11 * 60 + 20)))
    expect(confirmed, 'the seed has another visit ahead').toBeDefined()
    const ahead = addDays(today(DEMO_NOW), 3)
    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ date: ahead }).where(eq(bookings.id, confirmed!.id))
      await tx.update(bookingItems).set({ date: ahead }).where(eq(bookingItems.bookingId, confirmed!.id))
    })
    const res = await elapse(testApp(db, { e2eHooks: true }).app, confirmed!.code)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'completed' })
    const row = await rowOf(confirmed!.id)
    expect(row.date < today(DEMO_NOW)).toBe(true)
    expect(row.start).toBe(confirmed!.start)
  })
})
