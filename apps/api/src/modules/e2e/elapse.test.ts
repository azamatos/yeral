/** The end-to-end flows' hook: time passes for one booking, and the real jobs do the rest (`E2E_HOOKS`). */
import { NOSHOW_MARK_HOURS } from '@yeral/domain/lifecycle'
import { addDays, epochOf, nowMin, today } from '@yeral/domain/time'
import { and, eq, gt, gte, inArray, isNotNull, sql } from 'drizzle-orm'
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
          gte(bookings.date, today(DEMO_NOW)),
          gt(bookings.start, nowMin(DEMO_NOW)),
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
      .where(and(eq(bookings.businessId, salon), eq(bookings.status, 'confirmed'), gt(bookings.start, nowMin(DEMO_NOW))))
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

  it('a visit whose time of day has passed ends today: a day back could be past the no-show window', async () => {
    const [confirmed] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.businessId, salon), eq(bookings.status, 'confirmed')))
    expect(confirmed, 'the seed has one more visit').toBeDefined()
    const ahead = addDays(today(DEMO_NOW), 5)
    // just after midnight: nobody's day has anything there
    const earlier = confirmed!.start - 5
    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({ date: ahead, start: confirmed!.start - earlier, end: confirmed!.end - earlier })
        .where(eq(bookings.id, confirmed!.id))
      await tx
        .update(bookingItems)
        .set({ date: ahead, start: sql`${bookingItems.start} - ${earlier}`, end: sql`${bookingItems.end} - ${earlier}` })
        .where(eq(bookingItems.bookingId, confirmed!.id))
    })
    const res = await elapse(testApp(db, { e2eHooks: true }).app, confirmed!.code)
    expect(await res.json()).toEqual({ status: 'completed' })
    expect((await rowOf(confirmed!.id)).date).toBe(today(DEMO_NOW))
  })
})

describe('e2e hook: a visit ends inside the no-show window at any hour (book B-28)', () => {
  let db: Db
  /** Confirmed appointments with a specialist, each case takes its own. */
  let pool: { id: string; code: string; staffId: string }[]
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const salon = (await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio')))[0]!.id
    pool = await db
      .selectDistinctOn([bookings.id], { id: bookings.id, code: bookings.code, staffId: sql<string>`${bookingItems.staffId}` })
      .from(bookings)
      .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.businessId, salon),
          eq(bookings.status, 'confirmed'),
          eq(bookings.type, 'appointment'),
          isNotNull(bookingItems.staffId),
        ),
      )
    expect(pool.length, 'the seed has confirmed visits enough').toBeGreaterThanOrEqual(8)
    // all ahead of every case's clock: the completion job a case runs mustn't take the next case's visits
    for (const [i, b] of pool.entries()) await place(b.id, addDays(today(DEMO_NOW), 500 + i), START, END, b.staffId)
  })

  /** A booking at a time on a day, all its items with one specialist (a day well past the seed's, nothing else there). */
  const place = (id: string, date: string, start: number, end: number, staffId: string) =>
    db.transaction(async (tx) => {
      await tx.update(bookings).set({ date, start, end }).where(eq(bookings.id, id))
      await tx.update(bookingItems).set({ date, start, end, staffId }).where(eq(bookingItems.bookingId, id))
    })

  // the visit CI's flow booked: 10:15–12:00, two days ahead, the first free time
  const START = 10 * 60 + 15
  const END = 12 * 60
  const MIN = 60_000

  /**
   * The visit two days after the clock's day, `taken` days back at its time held by another of its specialist's visits
   * that hasn't been completed yet; then the hook at `at` minutes of that day.
   */
  async function elapseAt(n: number, at: number, taken: number | null) {
    const day = addDays(today(DEMO_NOW), 100 + n * 10)
    const visit = pool[n * 2]!
    await place(visit.id, addDays(day, 2), START, END, visit.staffId)
    if (taken !== null) await place(pool[n * 2 + 1]!.id, addDays(day, -taken), START, END, visit.staffId)
    const now = epochOf(day, at)
    const res = await testApp(db, { e2eHooks: true, now }).app.request(`/v1/e2e/bookings/${visit.code}/elapse`, {
      method: 'POST',
    })
    expect(await res.json()).toEqual({ status: 'completed' })
    const row = (await db.select().from(bookings).where(eq(bookings.id, visit.id)))[0]!
    const items = await db
      .select()
      .from(bookingItems)
      .where(inArray(bookingItems.bookingId, [visit.id]))
    const endedAgo = now - epochOf(row.date, row.end)
    // ended by now, and a no-show still to be reported: within the window, with time to spare
    expect(endedAgo).toBeGreaterThanOrEqual(0)
    expect(endedAgo).toBeLessThan((NOSHOW_MARK_HOURS - 1) * 60 * MIN)
    expect(row.end - row.start).toBe(END - START)
    for (const item of items) expect([item.date, item.start, item.end]).toEqual([row.date, row.start, row.end])
    return { day, row }
  }

  it('a visit whose time of day is later today ends at that time yesterday, under a day ago', async () => {
    const { day, row } = await elapseAt(0, 9 * 60, null)
    expect([row.date, row.start]).toEqual([addDays(day, -1), START])
  })

  it('a visit whose time of day has passed today ends today at that time', async () => {
    const { day, row } = await elapseAt(1, 12 * 60 + 4, null)
    expect([row.date, row.start]).toEqual([day, START])
  })

  it('a visit later today with its slot yesterday taken ends at another time, not two days back', async () => {
    const { day, row } = await elapseAt(2, 9 * 60, 1)
    expect(row.date >= addDays(day, -1)).toBe(true)
    expect([row.date, row.start]).not.toEqual([addDays(day, -1), START])
  })

  it('a visit whose time has passed, its slot today taken, ends at another time, not a day and more back (CI, 12:04)', async () => {
    const { day, row } = await elapseAt(3, 12 * 60 + 4, 0)
    expect([row.date, row.start]).not.toEqual([addDays(day, -1), START])
  })
})
