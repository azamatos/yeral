/** Blocked time (book B-18, Q-204): part of a day closed for one person, so nobody books it. */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, rateLimits, services, staff, staffBlocks } from '../../db/schema'
import { seed } from '../../db/seed'
import { assertStaffFree, loadHours, OutsideHours } from '../availability/context'

const MAYSA = '+99365102030' // owner of Glow Studio
const MARAL = '+99361440819' // specialist: nails
const W = '/v1/w/glow-studio'
const THU = '2026-11-19'
const FRI = '2026-11-20'

describe('blocked time (book B-18)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let manicure: string
  let maralId: string
  let aynaId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    manicure = (await db.select().from(services).where(eq(services.businessId, glowId))).find((s) => s.name.en === 'Manicure')!.id
    const person = async (name: string) =>
      (
        await db
          .select()
          .from(staff)
          .where(and(eq(staff.businessId, glowId), eq(staff.name, name)))
      )[0]!.id
    maralId = await person('Maral')
    aynaId = await person('Aýna')
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })
  const as = async (phone: string, name?: string) => {
    const b = browser(t.app)
    await b.login(phone, name)
    return b
  }
  const starts = async (b: ReturnType<typeof browser>, date: string) =>
    ((await b.req(`${W}/free-times?services=${manicure}&staff=${maralId}&date=${date}`)).json.slots as { start: number }[]).map(
      (s) => s.start,
    )
  const block = (b: ReturnType<typeof browser>, body: Record<string, unknown>) => b.req(`${W}/calendar/blocks`, { body })

  it('a block takes the time out of the free times; a booking or a move onto it is refused', async () => {
    const maysa = await as(MAYSA)
    expect(await starts(maysa, THU)).toContain(990)
    const made = await block(maysa, { staffId: maralId, date: THU, start: 990, end: 1050, reason: 'Okuw' })
    expect(made.status).toBe(201)
    expect(made.json.items).toEqual([
      { id: expect.any(String), staffId: maralId, date: THU, start: 990, end: 1050, reason: 'Okuw', seriesId: null },
    ])
    const free = await starts(maysa, THU)
    expect(free).not.toContain(990)
    expect(free).not.toContain(1020)
    // clients don't see it free either
    const client = await as('+99365800601', 'Client')
    const online = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${THU}`)).json
    expect((online.slots as { start: number }[]).map((s) => s.start)).not.toContain(990)
    const booked = await maysa.req(`${W}/bookings`, {
      body: { source: 'phone', phone: '+99365800602', serviceIds: [manicure], staffId: maralId, date: THU, start: 990 },
    })
    expect(booked.status).toBe(409)
    // a booking moved onto it says why
    const other = await maysa.req(`${W}/bookings`, {
      body: {
        source: 'phone',
        phone: '+99365800603',
        serviceIds: [manicure],
        staffId: maralId,
        date: THU,
        start: 600,
        notifyClient: false,
      },
    })
    t.clock.now += 15_000
    const moved = await maysa.req(`${W}/bookings/${other.json.code}/move`, { body: { date: THU, start: 1005 } })
    expect(moved.json.error).toMatchObject({
      code: 'cannot_move',
      details: { problem: 'blocked', staffId: maralId, busy: { start: 990, end: 1050 } },
    })
  })

  it('every week up to a date, taken away one or the rest of the series', async () => {
    const maysa = await as(MAYSA)
    const made = await block(maysa, { staffId: aynaId, date: FRI, start: 720, end: 780, reason: 'Lunch', repeatUntil: '2026-12-11' })
    const items = made.json.items as { id: string; date: string; seriesId: string }[]
    expect(items.map((b) => b.date)).toEqual([FRI, '2026-11-27', '2026-12-04', '2026-12-11'])
    expect(new Set(items.map((b) => b.seriesId)).size).toBe(1)
    expect((await maysa.req(`${W}/calendar/blocks/${items[0]!.id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await maysa.req(`${W}/calendar/blocks/${items[2]!.id}?scope=series`, { method: 'DELETE' })).status).toBe(204)
    const left = (await maysa.req(`${W}/calendar/blocks?from=${FRI}&to=2026-12-31`)).json.items as { date: string; staffId: string }[]
    expect(left.filter((b) => b.staffId === aynaId).map((b) => b.date)).toEqual(['2026-11-27'])
  })

  it('never over a booking; not in the past; a specialist blocks only their own time and sees only their own', async () => {
    const maysa = await as(MAYSA)
    const code = (
      await maysa.req(`${W}/bookings`, {
        body: {
          source: 'phone',
          phone: '+99365800604',
          serviceIds: [manicure],
          staffId: maralId,
          date: FRI,
          start: 840,
          notifyClient: false,
        },
      })
    ).json.code as string
    const over = await block(maysa, { staffId: maralId, date: FRI, start: 870, end: 930 })
    expect(over.json.error).toMatchObject({ code: 'block_over_bookings', details: { bookings: [{ code, date: FRI, start: 840 }] } })
    // a weekly one that meets it a week on
    const later = await block(maysa, { staffId: maralId, date: '2026-11-13', start: 870, end: 930, repeatUntil: FRI })
    expect(later.json.error.code).toBe('block_over_bookings')
    expect((await block(maysa, { staffId: maralId, date: '2026-10-01', start: 600, end: 660 })).json.error.details.issues).toEqual([
      { path: ['date'], code: 'past' },
    ])
    expect((await block(maysa, { staffId: maralId, date: FRI, start: 700, end: 650 })).status).toBe(400)

    const maral = await as(MARAL)
    expect((await block(maral, { staffId: maralId, date: FRI, start: 600, end: 630, reason: 'Errand' })).status).toBe(201)
    expect((await block(maral, { staffId: aynaId, date: FRI, start: 600, end: 630 })).status).toBe(403)
    const seen = (await maral.req(`${W}/calendar/blocks?from=${THU}&to=2026-12-31`)).json.items as { staffId: string }[]
    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every((b) => b.staffId === maralId)).toBe(true)
  })

  it('a booking being made checks the person’s blocked time under the business’s lock', async () => {
    const hours = await loadHours(db, glowId)
    const [b] = await db
      .select()
      .from(staffBlocks)
      .where(and(eq(staffBlocks.staffId, maralId), eq(staffBlocks.date, THU)))
    await expect(assertStaffFree(db, hours, THU, [{ staffId: maralId, start: b!.start + 15, end: b!.start + 45 }])).rejects.toBeInstanceOf(
      OutsideHours,
    )
    await expect(assertStaffFree(db, hours, THU, [{ staffId: maralId, start: b!.end, end: b!.end + 30 }])).resolves.toBeUndefined()
  })
})
