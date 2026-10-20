/** The business's own bookings: free times as the team books them, by phone and walk-in, and the undo (book B-23–B-25). */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses, clients, jobs, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MAYSA = '+99365102030' // owner of Glow Studio
const SELBI = '+99365884102' // administrator
const AYNA = '+99365312210' // specialist: hair
const MARAL = '+99361440819' // specialist: nails
const BOOKINGS = '/v1/w/glow-studio/bookings'
const FREE = '/v1/w/glow-studio/free-times'
const TODAY = '2026-10-14' // DEMO_NOW: Wednesday 11:20 at the business
const SAT = '2026-10-17'
const MON = '2026-10-19'
/** 11:15: the step that holds 11:20 with Glow's 15-minute steps. */
const NOW_STEP = 11 * 60 + 15
const UNDO_MS = 10_000
/** The first SMS goes 5 seconds after the undo can't come any more (B-24). */
const SMS_AFTER_MS = 15_000

interface Free {
  nearest: { date: string; start: number; end: number; staffId: string }[]
  date: string
  slots: { start: number; end: number; staffIds: string[] }[]
  days: { date: string; state: string }[]
}

describe('the business’s own bookings (book B-23, B-24, B-25)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let manicure: string
  let haircut: string
  let maralId: string
  let aynaId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const service = async (en: string) => {
      const rows = await db.select().from(services).where(eq(services.businessId, glow!.id))
      return rows.find((s) => s.name.en === en)!.id
    }
    manicure = await service('Manicure')
    haircut = await service("Women's haircut")
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
  const freeTimes = async (b: ReturnType<typeof browser>, query: string) => (await b.req(`${FREE}?${query}`)).json as Free
  /** Maral's free manicure starts on a day, the n-th from the end (tests take different ones). */
  const maralFree = async (b: ReturnType<typeof browser>, date: string, n = 0) => {
    const { slots } = await freeTimes(b, `services=${manicure}&staff=${maralId}&date=${date}`)
    return slots[Math.max(0, slots.length - 1 - n)]!.start
  }
  const book = (b: ReturnType<typeof browser>, body: Record<string, unknown>) =>
    b.req(BOOKINGS, { body: { source: 'phone', serviceIds: [manicure], staffId: maralId, date: SAT, ...body } })
  const rowOf = async (code: string) => (await db.select().from(bookings).where(eq(bookings.code, code)))[0]
  const smsTo = (phone: string) => t.sms.sent.filter((s) => s.to === phone && !/code/.test(s.text))

  it('free times as the team books them: the nearest four with their specialist, a day’s starts, the 14-day strip', async () => {
    const maysa = await as(MAYSA)
    const free = await freeTimes(maysa, `services=${manicure}`)
    expect(free.nearest).toHaveLength(4)
    for (const n of free.nearest) expect(n.staffId).toBe(maralId)
    const at = free.nearest.map((n) => `${n.date} ${String(n.start).padStart(4, '0')}`)
    expect(at).toEqual([...at].sort())
    expect(new Set(at).size).toBe(4)
    // never before the step that holds now: no back-dated bookings (§26 E3)
    expect(free.nearest[0]!.date >= TODAY).toBe(true)
    if (free.nearest[0]!.date === TODAY) expect(free.nearest[0]!.start).toBeGreaterThanOrEqual(NOW_STEP)
    expect(free.date).toBe(TODAY)
    for (const s of free.slots) {
      expect(s.start).toBeGreaterThanOrEqual(NOW_STEP)
      expect(s.end - s.start).toBe(60)
      expect(s.staffIds).toEqual([maralId])
    }
    expect(free.days).toHaveLength(14)
    expect(free.days[0]!.date).toBe(TODAY)
    for (const d of free.days) expect(['open', 'full']).toContain(d.state)
    // days further than the strip: one open, and Glow's stock-taking day, closed
    expect((await freeTimes(maysa, `services=${manicure}&date=2026-11-20`)).slots.length).toBeGreaterThan(0)
    expect((await freeTimes(maysa, `services=${manicure}&date=2026-11-02`)).slots).toEqual([])
  })

  it('a specialist sees and books only their own times; services someone doesn’t do are refused', async () => {
    const ayna = await as(AYNA)
    const own = await freeTimes(ayna, `services=${haircut}`)
    for (const n of own.nearest) expect(n.staffId).toBe(aynaId)
    expect((await ayna.req(`${FREE}?services=${manicure}&staff=${maralId}`)).status).toBe(403)
    const cannot = await (await as(MAYSA)).req(`${FREE}?services=${manicure}&staff=${aynaId}`)
    expect(cannot.status).toBe(400)
    expect(cannot.json.error.details.issues).toEqual([{ path: ['staff'], code: 'cannot_do' }])
    expect((await book(ayna, { phone: '+99365800100', start: await maralFree(await as(MAYSA), SAT, 9) })).status).toBe(403)
    const start = (await freeTimes(ayna, `services=${haircut}&date=${SAT}`)).slots.at(-1)!.start
    const mine = await book(ayna, { phone: '+99365800100', serviceIds: [haircut], staffId: aynaId, start })
    expect(mine.status).toBe(201)
    // someone not on the team
    const stranger = await as('+99365800199')
    expect((await stranger.req(`${FREE}?services=${manicure}`)).status).toBe(404)
    expect((await book(stranger, { phone: '+99365800100', start })).status).toBe(404)
  })

  it('a phone booking for a new number: confirmed at once, the client added with the name, the SMS after the undo time', async () => {
    const maysa = await as(MAYSA)
    const start = await maralFree(maysa, SAT, 0)
    const made = await book(maysa, { phone: '+993 65 80 01 01', name: 'Ogulgerek', start, note: 'Prefers the window seat' })
    expect(made.status).toBe(201)
    expect(made.json).toEqual({ code: expect.any(String), undoUntil: DEMO_NOW + UNDO_MS })
    const row = await rowOf(made.json.code)
    expect(row).toMatchObject({
      status: 'confirmed',
      source: 'phone',
      clientName: 'Ogulgerek',
      clientPhone: '+99365800101',
      userId: null,
      notifyClient: true,
      internalNote: 'Prefers the window seat',
      priceType: 'fixed',
      priceAmount: 70,
      date: SAT,
      start,
      end: start + 60,
    })
    const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, row!.id))
    expect(items).toMatchObject([{ serviceId: manicure, staffId: maralId, start, end: start + 60, bufferAfter: 10 }])
    const [record] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.businessId, row!.businessId), eq(clients.phone, '+99365800101')))
    expect(record).toMatchObject({ name: 'Ogulgerek', userId: null })
    expect(row!.clientId).toBe(record!.id)
    // the time is taken
    expect((await freeTimes(maysa, `services=${manicure}&date=${SAT}`)).slots.map((s) => s.start)).not.toContain(start)
    // the SMS waits until the booking can't be undone (B-24), then tells the date, time and address
    await runDueJobs(t.deps)
    expect(smsTo('+99365800101')).toEqual([])
    // the undo time is over, and an undo sent at its last moment has had time to arrive
    t.clock.now += UNDO_MS
    await runDueJobs(t.deps)
    expect(smsTo('+99365800101')).toEqual([])
    t.clock.now += SMS_AFTER_MS - UNDO_MS
    await runDueJobs(t.deps)
    expect(smsTo('+99365800101').map((s) => s.text)).toEqual([expect.stringMatching(/booked.*Glow Studio.*Bitarap Türkmenistan/)])
  })

  it('a known number: its client record and account are used, and the SMS switch off sends no confirmation', async () => {
    const client = await as('+99365800102', 'Gözel')
    const selbi = await as(SELBI)
    const made = await book(selbi, { phone: '+99365800102', start: await maralFree(selbi, SAT, 2), notifyClient: false })
    expect(made.status).toBe(201)
    const row = await rowOf(made.json.code)
    // the account's name never reaches the business: a number alone mustn't tell it who holds it
    expect(row).toMatchObject({ clientName: null, userId: expect.any(String), notifyClient: false })
    const [added] = await db.select().from(clients).where(eq(clients.id, row!.clientId!))
    expect(added).toMatchObject({ name: null, userId: row!.userId })
    // in the client's own bookings at once, confirmed from the start: never a request they sent
    const mine = (await client.req('/v1/me/bookings?tab=upcoming')).json.items as { code: string }[]
    expect(mine.map((b) => b.code)).toContain(made.json.code)
    const detail = (await client.req(`/v1/me/bookings/${made.json.code}`)).json
    expect(detail).toMatchObject({ status: 'confirmed', source: 'phone', timeline: [{ event: 'confirmed', at: DEMO_NOW }] })
    // a record not linked yet is linked by the next booking, as an online booking links it
    await db.update(clients).set({ userId: null }).where(eq(clients.id, added!.id))
    expect((await book(selbi, { phone: '+99365800102', start: await maralFree(selbi, SAT, 3), notifyClient: false })).status).toBe(201)
    expect((await db.select().from(clients).where(eq(clients.id, added!.id)))[0]!.userId).toBe(row!.userId)
    t.clock.now += UNDO_MS
    await runDueJobs(t.deps)
    expect(smsTo('+99365800102')).toEqual([])
    // Gülälek is on the client list: her record keeps its name, no second one
    const known = await book(selbi, { phone: '+99365447019', name: 'G.', start: await maralFree(selbi, SAT, 4) })
    expect(known.status).toBe(201)
    const records = await db
      .select()
      .from(clients)
      .where(and(eq(clients.businessId, row!.businessId), eq(clients.phone, '+99365447019')))
    expect(records.map((r) => r.name)).toEqual(['Gülälek Nurmuhammedowa'])
    expect((await rowOf(known.json.code))!.clientId).toBe(records[0]!.id)
  })

  it('a walk-in starts today from the step that holds now, never earlier, and sends no SMS by default (B-25)', async () => {
    const maysa = await as(MAYSA)
    const today = await freeTimes(maysa, `services=${manicure}&staff=${maralId}`)
    const first = today.slots[0]!.start
    expect(first).toBeGreaterThanOrEqual(NOW_STEP)
    const early = await book(maysa, { source: 'walkin', phone: '+99365800103', date: TODAY, start: NOW_STEP - 15 })
    expect(early.status).toBe(400)
    expect(early.json.error.details.issues).toEqual([{ path: ['start'], code: 'past' }])
    const later = await book(maysa, { source: 'walkin', phone: '+99365800103', date: SAT, start: await maralFree(maysa, SAT, 6) })
    expect(later.status).toBe(400)
    expect(later.json.error.details.issues).toEqual([{ path: ['date'], code: 'not_today' }])
    const made = await book(maysa, { source: 'walkin', phone: '+99365800103', date: TODAY, start: first })
    expect(made.status).toBe(201)
    expect(await rowOf(made.json.code)).toMatchObject({ status: 'confirmed', source: 'walkin', notifyClient: false, clientName: null })
    t.clock.now += UNDO_MS
    await runDueJobs(t.deps)
    expect(smsTo('+99365800103')).toEqual([])
  })

  it('a taken time is refused with the nearest free ones; a phone number must be complete', async () => {
    const maysa = await as(MAYSA)
    const start = await maralFree(maysa, SAT, 8)
    expect((await book(maysa, { phone: '+99365800104', start })).status).toBe(201)
    const again = await book(maysa, { phone: '+99365800105', start })
    expect(again.status).toBe(409)
    expect(again.json.error.code).toBe('slot_taken')
    expect(again.json.error.details.alternatives.length).toBeGreaterThan(0)
    for (const a of again.json.error.details.alternatives as { start: number }[]) expect(a.start).not.toBe(start)
    expect((await book(maysa, { phone: '+993 65 80 01', start })).status).toBe(400)
    // a start off the business's 15-minute steps is wrong input, not a taken time
    const offStep = await book(maysa, { phone: '+99365800104', start: start + 5 })
    expect(offStep.status).toBe(400)
    expect(offStep.json.error.details.issues).toEqual([{ path: ['start'], code: 'off_step' }])
    const unknown = await book(maysa, { phone: '+99365800104', serviceIds: [manicure, haircut], start })
    expect(unknown.status).toBe(400)
    expect(unknown.json.error.details.issues).toEqual([{ path: ['staffId'], code: 'cannot_do' }])
  })

  it('undo deletes the booking and the client it added; no SMS goes; after the undo time it’s refused (B-24)', async () => {
    const maysa = await as(MAYSA)
    const maral = await as(MARAL)
    const cursor = (await maral.req('/v1/events')).json.cursor as string
    const start = await maralFree(maysa, SAT, 10)
    const made = await book(maysa, { phone: '+99365800106', name: 'Typo', start })
    const code = made.json.code as string
    expect((await maysa.req(`${BOOKINGS}/${code}/undo`, { method: 'POST' })).status).toBe(204)
    // Maral sees her own bookings only: the row is gone, yet her calendar hears the undo
    const heard = await eventsAfter(maral, cursor, (items) => items.some((e) => e.type === 'booking.cancelled' && e.bookingCode === code))
    expect(
      (heard.json.items as { type: string; bookingCode: string }[]).filter((e) => e.bookingCode === code).map((e) => e.type),
    ).toContain('booking.cancelled')
    expect(await rowOf(code)).toBeUndefined()
    expect(await db.select().from(clients).where(eq(clients.phone, '+99365800106'))).toEqual([])
    expect((await freeTimes(maysa, `services=${manicure}&staff=${maralId}&date=${SAT}`)).slots.map((s) => s.start)).toContain(start)
    t.clock.now += UNDO_MS
    await runDueJobs(t.deps)
    expect(smsTo('+99365800106')).toEqual([])
    // Gülälek's record stays: it was there before
    const known = await book(maysa, { phone: '+99365447019', start })
    expect((await maysa.req(`${BOOKINGS}/${known.json.code}/undo`, { method: 'POST' })).status).toBe(204)
    expect((await db.select().from(clients).where(eq(clients.phone, '+99365447019'))).length).toBeGreaterThan(0)
    // too late
    const kept = await book(maysa, { phone: '+99365800107', start })
    t.clock.now += UNDO_MS
    const late = await maysa.req(`${BOOKINGS}/${kept.json.code}/undo`, { method: 'POST' })
    expect(late.status).toBe(409)
    expect(late.json.error.code).toBe('undo_expired')
    expect((await maysa.req(`${BOOKINGS}/YR-10000/undo`, { method: 'POST' })).status).toBe(404)
  })

  it('a landline gets no SMS: the job settles unsent', async () => {
    const maysa = await as(MAYSA)
    const made = await book(maysa, { phone: '+99312456700', date: MON, start: await maralFree(maysa, MON) })
    expect(made.status).toBe(201)
    t.clock.now += SMS_AFTER_MS
    await runDueJobs(t.deps)
    expect(t.sms.sent.filter((s) => s.to === '+99312456700')).toEqual([])
    const row = await rowOf(made.json.code)
    const queued = (await db.select().from(jobs)).filter((j) => j.payload.bookingId === row!.id && j.payload.kind === 'booked')
    expect(queued).toMatchObject([{ doneAt: expect.any(Date), error: expect.stringMatching(/not a mobile/) }])
  })

  it('undo takes back the name its booking gave a nameless client record (B-24)', async () => {
    const maysa = await as(MAYSA)
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    // on the list without a name
    await db.insert(clients).values({ businessId: glow!.id, phone: '+99365800110' })
    const start = await maralFree(maysa, MON, 3)
    const made = await book(maysa, { phone: '+99365800110', name: 'Typo', date: MON, start })
    const record = async () => (await db.select().from(clients).where(eq(clients.phone, '+99365800110')))[0]!
    expect(await record()).toMatchObject({ name: 'Typo' })
    expect((await maysa.req(`${BOOKINGS}/${made.json.code}/undo`, { method: 'POST' })).status).toBe(204)
    expect(await record()).toMatchObject({ name: null, nameSetBy: null })
  })
})
