import { appointmentSlots } from '@yeral/domain/availability'
import { clientStats } from '@yeral/domain/clients'
import { staffDay, workingIntervals } from '@yeral/domain/hours'
import { addDays, diffDays, dow, today } from '@yeral/domain/time'
import { and, eq, gte, sql } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import type { Db } from '../client'
import * as t from '../schema'
import { seed, TABLES } from './index'
import { AYJEMAL_BOOKINGS, DEMO_DAY, GLOW_BOOKINGS, GLOW_CLIENTS, m, YOGA_TAKEN } from './demo-data'

const DAY = 86_400_000

/**
 * What must hold whatever weekday the demo lands on: Glow Studio's bookings from the demo day on fit their specialist's
 * working time, and the yoga seats taken (the design's "3 ýer galdy", "Doly" …) and Aýjemal's class are there.
 */
async function expectDemoWeek(db: Db, now: number) {
  const day = (date: string) => addDays(date, diffDays(today(now), DEMO_DAY))
  const [glow] = await db.select().from(t.businesses).where(eq(t.businesses.slug, 'glow-studio'))
  const team = await db.select().from(t.staff).where(eq(t.staff.businessId, glow!.id))
  const items = await db
    .select({ item: t.bookingItems })
    .from(t.bookingItems)
    .innerJoin(t.bookings, eq(t.bookings.id, t.bookingItems.bookingId))
    .where(and(eq(t.bookings.businessId, glow!.id), gte(t.bookings.date, today(now))))
  expect(items).toHaveLength(GLOW_BOOKINGS.length)
  for (const { item } of items) {
    const who = team.find((s) => s.id === item.staffId)!
    const work = staffDay(glow!, who, item.date)
    const at = `${who.name} ${item.date} ${item.start}–${item.end}`
    expect(work, at).not.toBeNull()
    expect(
      workingIntervals(work!).some((i) => i.start <= item.start && item.end <= i.end),
      at,
    ).toBe(true)
  }

  const [yoga] = await db.select().from(t.businesses).where(eq(t.businesses.slug, 'aydyn-yoga'))
  for (const [key, taken] of Object.entries(YOGA_TAKEN)) {
    const [date = '', time = ''] = key.split(' ')
    const rows = await db
      .select()
      .from(t.bookings)
      .where(and(eq(t.bookings.businessId, yoga!.id), eq(t.bookings.date, day(date)), eq(t.bookings.start, m(time))))
    expect(
      rows.reduce((n, r) => n + (r.seats ?? 0), 0),
      key,
    ).toBe(taken)
  }
  const mine = AYJEMAL_BOOKINGS.find((a) => a.type === 'class')!
  const [b] = await db.select().from(t.bookings).where(eq(t.bookings.code, mine.code))
  expect(b).toMatchObject({ date: day(mine.date), start: m(mine.from), status: 'confirmed' })
  expect(b!.sessionId).toBeTruthy()
}

describe('demo seed', () => {
  let db: Db
  let counts: Record<string, number>

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    counts = await seed(db, { demo: true, now: DEMO_NOW })
  })

  it('creates the catalogue and every demo business, verified', async () => {
    expect(counts).toMatchObject({ categories: 13, businesses: 14 })
    const pending = await db.select().from(t.businesses).where(eq(t.businesses.verification, 'pending'))
    expect(pending).toEqual([])
  })

  it('Glow Studio’s client list matches the design (visits and no-shows)', async () => {
    const [glow] = await db.select().from(t.businesses).where(eq(t.businesses.slug, 'glow-studio'))
    for (const c of GLOW_CLIENTS.filter((x) => x.key.startsWith('c'))) {
      const [client] = await db
        .select()
        .from(t.clients)
        .where(and(eq(t.clients.businessId, glow!.id), eq(t.clients.phone, c.phone)))
      const visits = await db.select().from(t.bookings).where(eq(t.bookings.clientId, client!.id))
      const stats = clientStats(visits.map((v) => ({ date: v.date, status: v.status, price: v.priceAmount ?? 0 })))
      expect(stats.visits, c.name).toBe(c.visits)
      expect(stats.noShows, c.name).toBe(c.noShows ?? 0)
    }
  })

  it('on the demo day, Aýjemal’s request YR-48213 holds Thursday 14:30 with Aýna', async () => {
    const [b] = await db.select().from(t.bookings).where(eq(t.bookings.code, 'YR-48213'))
    expect(b).toMatchObject({ date: '2026-10-15', start: 870, end: 930, status: 'pending', active: true })
    expect(b!.holdUntil!.getTime()).toBe(DEMO_NOW + 28 * 60_000)

    const [glow] = await db.select().from(t.businesses).where(eq(t.businesses.slug, 'glow-studio'))
    const [ayna] = await db
      .select()
      .from(t.staff)
      .where(and(eq(t.staff.businessId, glow!.id), eq(t.staff.name, 'Aýna')))
    const [s1] = (await db.select().from(t.services).where(eq(t.services.businessId, glow!.id))).filter(
      (s) => s.name.tk === 'Aýal saç kesimi',
    )
    const items = await db
      .select()
      .from(t.bookingItems)
      .where(and(eq(t.bookingItems.staffId, ayna!.id), eq(t.bookingItems.active, true)))
    const slots = appointmentSlots(
      {
        business: { hours: glow!.hours, exceptions: glow!.exceptions },
        rules: { leadMinutes: 60, windowDays: 30, bufferMinutes: 10, slotStep: 15 },
        staff: [
          {
            id: ayna!.id,
            serviceIds: [s1!.id],
            bookable: true,
            active: true,
            shift: ayna!.shift,
            breaks: ayna!.breaks,
            daysOff: ayna!.daysOff,
          },
        ],
        services: [{ id: s1!.id, durationMin: 60, bufferMin: null, online: true }],
        busy: items.map((i) => ({ staffId: ayna!.id, date: i.date, start: i.start, end: i.end + i.bufferAfter, bookingId: i.bookingId })),
        now: DEMO_NOW,
      },
      { date: '2026-10-15', serviceIds: [s1!.id], staffId: ayna!.id, by: 'client' },
    ).map((s) => s.start)
    // 60 min + 10 min buffer: the last start before the 13:30 break is 12:15; the request holds 14:30–15:40
    expect(slots).toContain(735)
    expect(slots).not.toContain(750)
    expect(slots).not.toContain(855)
    expect(slots).not.toContain(870)
    expect(slots).toContain(945)
  })

  it('Glow Studio’s demo week and the yoga seats are as designed', () => expectDemoWeek(db, DEMO_NOW))

  it('only requests hold a slot or wait for confirmation; table bookings sit for the business’s sitting time', async () => {
    const rows = await db
      .select({ b: t.bookings, sitting: t.businesses.tableSittingMinutes })
      .from(t.bookings)
      .innerJoin(t.businesses, eq(t.businesses.id, t.bookings.businessId))
    for (const { b } of rows) {
      expect(b.holdUntil !== null, b.code).toBe(b.status === 'pending')
      expect(b.confirmedAt === null, b.code).toBe(b.status === 'pending')
    }
    const tables = rows.filter((r) => r.b.type === 'table')
    expect(tables.length).toBeGreaterThan(0)
    for (const { b, sitting } of tables) expect(b.end, b.code).toBe(Math.min(1440, b.start + sitting))
  })

  it('wipe() covers every table in the database', async () => {
    const { rows } = await db.execute<{ tablename: string }>(sql`select tablename from pg_tables where schemaname = 'public'`)
    expect([...TABLES].sort()).toEqual(rows.map((r) => r.tablename).sort())
  })
})

describe('demo seed on other weekdays', () => {
  let db: Db
  beforeAll(async () => {
    ;({ db } = await testDatabase())
  })

  it.each([1, 2, 3, 4, 5, 6])('the demo day %i day(s) after the design’s Wednesday keeps the design’s week', async (shift) => {
    const now = DEMO_NOW + shift * DAY
    expect(dow(today(now))).not.toBe(dow(DEMO_DAY))
    await seed(db, { demo: true, now })
    await expectDemoWeek(db, now)
  })

  it('a seed that fails halfway leaves the database as it was', async () => {
    await seed(db, { demo: true, now: DEMO_NOW })
    await db.execute(sql`create function fail_insert() returns trigger language plpgsql as $$ begin raise exception 'seed broke'; end $$`)
    await db.execute(sql`create trigger fail_reviews before insert on reviews for each row execute function fail_insert()`)
    try {
      await expect(seed(db, { demo: true, now: DEMO_NOW + DAY })).rejects.toThrow()
    } finally {
      await db.execute(sql`drop trigger fail_reviews on reviews`)
      await db.execute(sql`drop function fail_insert()`)
    }
    expect(await db.select().from(t.businesses)).toHaveLength(14)
    const [request] = await db.select().from(t.bookings).where(eq(t.bookings.code, 'YR-48213'))
    expect(request?.date).toBe('2026-10-15')
  })
})
