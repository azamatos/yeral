/** Moving a confirmed appointment (book Q-165, Q-263; ROUND6 A3, A5). */
import { addDays, epochOf } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, bookings, businesses, rateLimits, services, staff, staffServices, users } from '../../db/schema'
import { seed } from '../../db/seed'
import { rescheduleBooking } from './actions'
import { confirmBooking } from './confirm'
import { StaleBooking } from './repo'

const FRI = '2026-10-16'
const SAT = '2026-10-17'
// a day the other tests leave alone
const LATER = '2026-10-21'

describe('moves', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let haircut: string
  const who: Record<string, string> = {}

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    for (const s of await db.select().from(staff)) who[s.name] ??= s.id
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    const [svc] = await db
      .select()
      .from(services)
      .where(eq(services.name, { tk: 'Aýal saç kesimi', ru: 'Женская стрижка', en: "Women's haircut" }))
    haircut = svc!.id
    // Maral cuts hair too: someone else is free when Aýna isn't
    await db.insert(staffServices).values({ staffId: who.Maral!, serviceId: haircut })
  })

  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })

  const rules = (set: Partial<typeof bookingRules.$inferInsert>) =>
    db.update(bookingRules).set(set).where(eq(bookingRules.businessId, glowId))
  const starts = async (b: ReturnType<typeof browser>, date: string, staffId: string, move?: string) =>
    (
      await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&staff=${staffId}&date=${date}${move ? `&move=${move}` : ''}`)
    ).json.slots.map((x: { start: number }) => x.start) as number[]

  /** A confirmed haircut with Aýna at her first free start, from `from` on, that has an hour free after it. */
  async function confirmed(phone: string, from: string) {
    const b = browser(t.app)
    await b.login(phone, 'Client')
    let date = from
    let start: number | undefined
    for (; start === undefined && date < addDays(from, 10); start === undefined && (date = addDays(date, 1))) {
      const free = await starts(b, date, who['Aýna']!)
      start = free.find((m) => free.includes(m + 30) && free.includes(m + 60))
    }
    if (start === undefined) throw new Error('Aýna has no free hour and a half in ten days')
    const made = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: who['Aýna'], date, start },
    })
    expect(made.status).toBe(201)
    const [row] = await db.select().from(bookings).where(eq(bookings.code, made.json.code))
    await db.transaction((tx) => confirmBooking(tx, t.deps, row!))
    return { b, code: made.json.code as string, date, start, id: row!.id }
  }

  it('a new time may overlap the current one with the same specialist (book Q-165)', async () => {
    const { b, code, date, start } = await confirmed('+99365444201', FRI)
    // without move mode her own booking hides the half hour after it; in move mode it's free
    expect(await starts(b, date, who['Aýna']!)).not.toContain(start + 30)
    expect(await starts(b, date, who['Aýna']!, code)).toContain(start + 30)
    const asked = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } })
    expect(asked.status).toBe(200)
    expect(asked.json).toMatchObject({ status: 'confirmed', date, start, reschedule: { date, start: start + 30 } })
  })

  it('at an instant business an overlapping move happens at once', async () => {
    await rules({ confirmMode: 'instant' })
    try {
      const { b, code, date, start } = await confirmed('+99365444202', FRI)
      const moved = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } })
      expect(moved.json).toMatchObject({ status: 'confirmed', date, start: start + 30, reschedule: null })
    } finally {
      await rules({ confirmMode: 'manual' })
    }
  })

  it('no silent swap: with the specialist busy at the new time, the move is refused (ROUND6 A5)', async () => {
    const { b, code } = await confirmed('+99365444203', SAT)
    // someone takes a time of Aýna's that Maral has free too
    const aynaFree = await starts(b, LATER, who['Aýna']!)
    const maralFree = await starts(b, LATER, who.Maral!)
    const both = aynaFree.find((m) => maralFree.includes(m))!
    const other = browser(t.app)
    await other.login('+99365444204', 'Other')
    const took = await other.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: who['Aýna'], date: LATER, start: both },
    })
    expect(took.status).toBe(201)
    const refused = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: LATER, start: both } })
    expect(refused.json.error?.code).toBe('slot_taken')
    // asked for «Islendik hünärmen», anyone free will do
    const anyone = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: LATER, start: both, staffId: null } })
    expect(anyone.status).toBe(200)
  })

  it('a waiting move never waits past the original visit (book Q-263)', async () => {
    await rules({ holdMinutes: 120, cancelWindowMinutes: null })
    try {
      const { b, code, date, start } = await confirmed('+99365444205', FRI)
      // an hour before the visit, ask to move to the next day: the two-hour hold would outlive the visit
      t.clock.now = epochOf(date, start) - 60 * 60_000
      const next = addDays(date, 1)
      const nextStart = (await starts(b, next, who['Aýna']!))[0]!
      expect((await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: next, start: nextStart } })).status).toBe(200)
      const [orig] = await db.select().from(bookings).where(eq(bookings.code, code))
      const [request] = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.rescheduleOf, orig!.id), eq(bookings.status, 'pending')))
      expect(request!.holdUntil!.getTime()).toBe(epochOf(date, start))
    } finally {
      await rules({ holdMinutes: 30, cancelWindowMinutes: 120 })
    }
  })

  it('two moves asked at once leave one waiting move', async () => {
    const { b, code, date, start, id } = await confirmed('+99365444207', FRI)
    const both = await Promise.all([
      b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } }),
      b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } }),
    ])
    // one after the other: the second replaces the first
    expect(both.map((r) => r.status)).toEqual([200, 200])
    const waiting = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.rescheduleOf, id), eq(bookings.status, 'pending')))
    expect(waiting).toHaveLength(1)
  })

  it('move mode counts a waiting move as free too, and refuses a booking that can’t move', async () => {
    const { b, code, date, start } = await confirmed('+99365444208', FRI)
    await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } })
    // the waiting move holds start+30 … start+90: in move mode those times are free again
    expect(await starts(b, date, who['Aýna']!, code)).toContain(start + 60)
    // a request still waiting for the business can't be moved
    const free = await starts(b, SAT, who['Aýna']!)
    const pending = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: who['Aýna'], date: SAT, start: free[0] },
    })
    const refused = await b.req(
      `/v1/businesses/glow-studio/availability?services=${haircut}&staff=any&date=${SAT}&move=${pending.json.code}`,
    )
    expect(refused.json.error.code).toBe('invalid_status')
    const specialists = await b.req(`/v1/businesses/glow-studio/specialists/availability?services=${haircut}&move=${code}`)
    expect(specialists.status).toBe(200)
  })

  it('a specialist who no longer does the service isn’t swapped: the client picks another', async () => {
    const { b, code, date, start } = await confirmed('+99365444209', FRI)
    await db.delete(staffServices).where(and(eq(staffServices.staffId, who['Aýna']!), eq(staffServices.serviceId, haircut)))
    try {
      const refused = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } })
      expect(refused.json.error.code).toBe('not_found')
    } finally {
      await db.insert(staffServices).values({ staffId: who['Aýna']!, serviceId: haircut })
    }
  })

  it('a replaced move can’t be brought back with "Yzyna al"', async () => {
    const { b, code, date, start, id } = await confirmed('+99365444210', FRI)
    await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } })
    const [first] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.rescheduleOf, id), eq(bookings.status, 'pending')))
    await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 60 } })
    const restored = await b.req(`/v1/me/bookings/${first!.code}/restore`, { method: 'POST' })
    expect(restored.json.error.code).toBe('invalid_status')
  })

  it('a move from a copy read before a cancel is refused: the booking is read again under its lock', async () => {
    const { b, code, date, start } = await confirmed('+99365444211', FRI)
    const [stale] = await db.select().from(bookings).where(eq(bookings.code, code))
    const [user] = await db.select().from(users).where(eq(users.phone, '+99365444211'))
    expect((await b.req(`/v1/me/bookings/${code}/cancel`, { body: {} })).status).toBe(200)
    await expect(rescheduleBooking(t.deps, user!, stale!, { date, start: start + 30 })).rejects.toMatchObject({ code: 'invalid_status' })
    const moves = await db.select().from(bookings).where(eq(bookings.rescheduleOf, stale!.id))
    expect(moves).toEqual([])
  })

  it('asking for its own time keeps the booking as it is and withdraws a waiting move', async () => {
    const { b, code, date, start, id } = await confirmed('+99365444212', FRI)
    // move mode lists the booking's own time
    expect(await starts(b, date, who['Aýna']!, code)).toContain(start)
    await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } })
    const same = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start } })
    expect(same.status).toBe(200)
    expect(same.json).toMatchObject({ date, start, reschedule: null })
    const waiting = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.rescheduleOf, id), eq(bookings.status, 'pending')))
    expect(waiting).toEqual([])
  })

  it('a double tap at an instant business moves once and answers both', async () => {
    await rules({ confirmMode: 'instant' })
    try {
      const { b, code, date, start } = await confirmed('+99365444214', FRI)
      const both = await Promise.all([
        b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } }),
        b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } }),
      ])
      expect(both.map((r) => r.status)).toEqual([200, 200])
      expect((await b.req(`/v1/me/bookings/${code}`)).json).toMatchObject({ start: start + 30, reschedule: null })
    } finally {
      await rules({ confirmMode: 'manual' })
    }
  })

  it('a replaced move can’t be confirmed, and offers no "Yzyna al"', async () => {
    const { b, code, date, start, id } = await confirmed('+99365444213', FRI)
    await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } })
    const [first] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.rescheduleOf, id), eq(bookings.status, 'pending')))
    await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 60 } })
    await expect(db.transaction((tx) => confirmBooking(tx, t.deps, first!))).rejects.toBeInstanceOf(StaleBooking)
    expect((await b.req(`/v1/me/bookings/${first!.code}`)).json.actions.restore).toBe(false)
    expect((await b.req(`/v1/me/bookings/${code}`)).json.start).toBe(start)
  })

  it('a second move can be asked while one waits, and replaces it (ROUND6 A3)', async () => {
    const { b, code, date, start } = await confirmed('+99365444206', FRI)
    await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 30 } })
    const waiting = (await b.req(`/v1/me/bookings/${code}`)).json
    expect(waiting.actions.reschedule).toBe(true)
    const second = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date, start: start + 60 } })
    expect(second.json.reschedule).toMatchObject({ start: start + 60 })
  })
})
