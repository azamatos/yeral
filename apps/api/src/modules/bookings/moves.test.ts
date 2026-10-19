/** Moving a confirmed appointment (book Q-165, Q-263; ROUND6 A3, A5). */
import { epochOf } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, bookings, businesses, rateLimits, services, staff, staffServices } from '../../db/schema'
import { seed } from '../../db/seed'
import { confirmBooking } from './confirm'

const FRI = '2026-10-16'
const SAT = '2026-10-17'

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

  /** A confirmed haircut with Aýna at the first of her free starts on `date` that has an hour free after it. */
  async function confirmed(phone: string, date: string) {
    const b = browser(t.app)
    await b.login(phone, 'Client')
    const free = await starts(b, date, who['Aýna']!)
    const start = free.find((m) => free.includes(m + 30) && free.includes(m + 60))!
    const made = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: who['Aýna'], date, start },
    })
    expect(made.status).toBe(201)
    const [row] = await db.select().from(bookings).where(eq(bookings.code, made.json.code))
    await db.transaction((tx) => confirmBooking(tx, t.deps, row!))
    return { b, code: made.json.code as string, start, id: row!.id }
  }

  it('a new time may overlap the current one with the same specialist (book Q-165)', async () => {
    const { b, code, start } = await confirmed('+99365444201', FRI)
    // without move mode her own booking hides the half hour after it; in move mode it's free
    expect(await starts(b, FRI, who['Aýna']!)).not.toContain(start + 30)
    expect(await starts(b, FRI, who['Aýna']!, code)).toContain(start + 30)
    const asked = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: FRI, start: start + 30 } })
    expect(asked.status).toBe(200)
    expect(asked.json).toMatchObject({ status: 'confirmed', start, reschedule: { date: FRI, start: start + 30 } })
  })

  it('at an instant business an overlapping move happens at once', async () => {
    await rules({ confirmMode: 'instant' })
    try {
      const { b, code, start } = await confirmed('+99365444202', FRI)
      const moved = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: FRI, start: start + 30 } })
      expect(moved.json).toMatchObject({ status: 'confirmed', date: FRI, start: start + 30, reschedule: null })
    } finally {
      await rules({ confirmMode: 'manual' })
    }
  })

  it('no silent swap: with the specialist busy at the new time, the move is refused (ROUND6 A5)', async () => {
    const { b, code } = await confirmed('+99365444203', SAT)
    // someone takes Aýna's time on Friday that Maral has free too
    const aynaFree = await starts(b, FRI, who['Aýna']!)
    const maralFree = await starts(b, FRI, who.Maral!)
    const both = aynaFree.find((m) => maralFree.includes(m))!
    const other = browser(t.app)
    await other.login('+99365444204', 'Other')
    const took = await other.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: who['Aýna'], date: FRI, start: both },
    })
    expect(took.status).toBe(201)
    const refused = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: FRI, start: both } })
    expect(refused.json.error?.code).toBe('slot_taken')
    // asked for «Islendik hünärmen», anyone free will do
    const anyone = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: FRI, start: both, staffId: null } })
    expect(anyone.status).toBe(200)
  })

  it('a waiting move never waits past the original visit (book Q-263)', async () => {
    await rules({ holdMinutes: 120, cancelWindowMinutes: null })
    try {
      const { b, code, start } = await confirmed('+99365444205', FRI)
      // an hour before the visit, ask to move to Saturday: the two-hour hold would outlive the visit
      t.clock.now = epochOf(FRI, start) - 60 * 60_000
      const satStart = (await starts(b, SAT, who['Aýna']!))[0]!
      expect((await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: SAT, start: satStart } })).status).toBe(200)
      const [orig] = await db.select().from(bookings).where(eq(bookings.code, code))
      const [request] = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.rescheduleOf, orig!.id), eq(bookings.status, 'pending')))
      expect(request!.holdUntil!.getTime()).toBe(epochOf(FRI, start))
    } finally {
      await rules({ holdMinutes: 30, cancelWindowMinutes: 120 })
    }
  })

  it('a second move can be asked while one waits, and replaces it (ROUND6 A3)', async () => {
    const { b, code, start } = await confirmed('+99365444206', FRI)
    await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: FRI, start: start + 30 } })
    const waiting = (await b.req(`/v1/me/bookings/${code}`)).json
    expect(waiting.actions.reschedule).toBe(true)
    const second = await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: FRI, start: start + 60 } })
    expect(second.json.reschedule).toMatchObject({ start: start + 60 })
  })
})
