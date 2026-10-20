/** "Senenama" (book B-16, B-17): a day or a week as each reader may see it. */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const SELBI = '+99365884102' // administrator
const MARAL = '+99361440819' // specialist: nails
const W = '/v1/w/glow-studio'
const DAY = '2026-11-05' // a Thursday, inside the booking window

interface View {
  columns: { staffId: string; name: string; removed: boolean; days: { date: string; working: unknown; off: unknown }[] }[]
  bookings: {
    code: string
    status: string
    items: { staffId: string }[]
    internalStatusId: string | null
    holdUntil: number | null
    move: { date: string; start: number } | null
  }[]
  blocks: { staffId: string; start: number }[]
  summary: { date: string; count: number; requests: number; revenue: number | null }[]
  internalStatuses: { id: string }[]
}

describe('the calendar (book B-16, B-17)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let manicure: string
  let maralId: string
  let aynaId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    manicure = (await db.select().from(services).where(eq(services.businessId, glow!.id))).find((s) => s.name.en === 'Manicure')!.id
    const person = async (name: string) =>
      (
        await db
          .select()
          .from(staff)
          .where(and(eq(staff.businessId, glow!.id), eq(staff.name, name)))
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
  const view = async (b: ReturnType<typeof browser>, query = '') => (await b.req(`${W}/calendar?date=${DAY}${query}`)).json as View
  const book = async (b: ReturnType<typeof browser>, phone: string, start: number) => {
    const made = await b.req(`${W}/bookings`, {
      body: { source: 'phone', phone, serviceIds: [manicure], staffId: maralId, date: DAY, start, notifyClient: false },
    })
    expect(made.status).toBe(201)
    t.clock.now += 15_000
    return made.json.code as string
  }

  it('the owner sees every bookable column, the bookings and requests, the layers, the markers and the money', async () => {
    const maysa = await as(MAYSA)
    const code = await book(maysa, '+99365800801', 600)
    const gone = await book(maysa, '+99365800802', 720)
    await maysa.req(`${W}/bookings/${gone}/cancel`, { body: { reason: 'staff_away' } })
    // a client's request, and blocked time
    const client = await as('+99365800803', 'Client')
    const free = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${DAY}`)).json
      .slots as { start: number }[]
    const asked = free.find((s) => s.start >= 900)!.start
    const request = (
      await client.req('/v1/bookings', {
        body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: maralId, date: DAY, start: asked },
      })
    ).json.code as string
    await maysa.req(`${W}/calendar/blocks`, { body: { staffId: aynaId, date: DAY, start: 960, end: 1020, reason: 'Okuw' } })
    // an internal status, switched on and set
    const statuses = (await maysa.req(`${W}/settings/statuses`)).json.items as { id: string; preset: string }[]
    const arrived = statuses.find((s) => s.preset === 'arrived')!
    await maysa.req(`${W}/settings/statuses/${arrived.id}`, { method: 'PATCH', body: { enabled: true } })
    await maysa.req(`${W}/bookings/${code}/internal-status`, { method: 'PUT', body: { statusId: arrived.id } })

    const v = await view(maysa)
    expect(v.columns.map((c) => c.name)).toEqual(expect.arrayContaining(['Aýna', 'Maral']))
    // Selbi, an administrator who takes no bookings, has no column
    expect(v.columns.map((c) => c.name)).not.toContain('Selbi')
    expect(v.columns.find((c) => c.staffId === maralId)!.days).toEqual([
      { date: DAY, working: expect.any(Object), breaks: expect.any(Array), off: null },
    ])
    const codes = v.bookings.map((b) => b.code)
    expect(codes).toContain(code)
    expect(codes).toContain(request)
    // cancelled ones only when asked for
    expect(codes).not.toContain(gone)
    expect((await view(maysa, '&cancelled=true')).bookings.map((b) => b.code)).toContain(gone)
    expect(v.bookings.find((b) => b.code === code)).toMatchObject({
      status: 'confirmed',
      internalStatusId: arrived.id,
      items: [{ staffId: maralId }],
    })
    expect(v.bookings.find((b) => b.code === request)).toMatchObject({ status: 'pending', holdUntil: expect.any(Number) })
    expect(v.blocks).toEqual([expect.objectContaining({ staffId: aynaId, start: 960, reason: 'Okuw' })])
    expect(v.internalStatuses.map((s) => s.id)).toEqual([arrived.id])
    const [line] = v.summary
    expect(line).toMatchObject({ date: DAY, requests: expect.any(Number) })
    expect(line!.count).toBeGreaterThanOrEqual(2)
    expect(line!.revenue).toBeGreaterThan(0)
  })

  it('an administrator sees no money; a specialist only their own column, bookings and earnings', async () => {
    const admin = await view(await as(SELBI))
    expect(admin.summary[0]!.revenue).toBeNull()
    expect(admin.columns.length).toBeGreaterThan(1)

    const maral = await as(MARAL)
    const mine = await view(maral)
    expect(mine.columns.map((c) => c.staffId)).toEqual([maralId])
    expect(mine.bookings.every((b) => b.items.some((i) => i.staffId === maralId))).toBe(true)
    expect(mine.blocks).toEqual([])
    expect(mine.summary[0]!.revenue).toBeGreaterThan(0)
    // someone else's column is hidden from her
    expect((await maral.req(`${W}/calendar?date=${DAY}&staff=${aynaId}`)).status).toBe(403)
  })

  it('a week; one person; a day off shaded with its reason; a client’s waiting move as its ghost', async () => {
    const maysa = await as(MAYSA)
    const week = await view(maysa, '&days=7')
    expect(week.summary.map((s) => s.date)).toHaveLength(7)
    expect(week.columns[0]!.days).toHaveLength(7)
    const ayna = await view(maysa, `&staff=${aynaId}`)
    expect(ayna.columns.map((c) => c.staffId)).toEqual([aynaId])
    // Aýna takes the day off
    const schedule = (await maysa.req(`${W}/team/${aynaId}/schedule`)).json
    await maysa.req(`${W}/team/${aynaId}/schedule`, {
      method: 'PUT',
      body: { ...schedule, daysOff: [{ name: 'Leave', from: DAY, to: DAY, yearly: false }], affected: 'keep' },
    })
    expect((await view(maysa, `&staff=${aynaId}`)).columns[0]!.days[0]).toMatchObject({
      working: null,
      off: { kind: 'exception', name: 'Leave' },
    })
    // a client's confirmed booking with a move asked
    const client = await as('+99365800804', 'Mover')
    const free = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${DAY}`)).json
      .slots as { start: number }[]
    const [first, later] = [free[0]!.start, free.at(-1)!.start]
    const sent = (
      await client.req('/v1/bookings', {
        body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: maralId, date: DAY, start: first },
      })
    ).json.code as string
    await maysa.req(`${W}/requests/${sent}/confirm`, { body: {} })
    await client.req(`/v1/me/bookings/${sent}/reschedule`, { body: { date: DAY, start: later } })
    const moved = (await view(maysa)).bookings.find((b) => b.code === sent)!
    expect(moved).toMatchObject({ status: 'confirmed', move: { date: DAY, start: later } })
    // the move itself isn't a booking of its own, only the booking's ghost
    const moveCode = (moved.move as unknown as { code: string }).code
    expect((await view(maysa)).bookings.map((b) => b.code)).not.toContain(moveCode)
  })
})
