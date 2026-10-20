/** A specialist away or leaving (book B-47, B-50): their schedule, and their bookings ahead moved, kept or cancelled. */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses, rateLimits, services, staff, staffServices } from '../../db/schema'
import { seed } from '../../db/seed'
import { assertStaffFree, loadHours, OutsideHours } from '../availability/context'
import { runDueJobs } from '../jobs/run'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // a specialist there
const W = '/v1/w/glow-studio'
const THU = '2026-11-12'
const FRI = '2026-11-13'
const SAT = '2026-11-14'
const FRI2 = '2026-11-20'
const SAT2 = '2026-11-21'

describe('a specialist away or leaving (book B-47, B-50)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let manicure: string
  let jerenId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    manicure = (await db.select().from(services).where(eq(services.businessId, glowId))).find((s) => s.name.en === 'Manicure')!.id
    const [jeren] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, glowId), eq(staff.name, 'Jeren')))
    jerenId = jeren!.id
    // Jeren does manicures too, so a manicure can go to her
    await db.insert(staffServices).values({ staffId: jerenId, serviceId: manicure })
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
  /** A new specialist without the app who does manicures. */
  const hire = async (maysa: ReturnType<typeof browser>, phone: string, name: string) => {
    const made = await maysa.req(`${W}/team/phone-only`, { body: { phone, name, serviceIds: [manicure] } })
    expect(made.status).toBe(201)
    return made.json.id as string
  }
  /** A booking the team enters, quietly, its undo time over. */
  const book = async (maysa: ReturnType<typeof browser>, phone: string, staffId: string, date: string, start: number) => {
    const made = await maysa.req(`${W}/bookings`, {
      body: { source: 'phone', phone, serviceIds: [manicure], staffId, date, start, notifyClient: false },
    })
    expect(made.status).toBe(201)
    t.clock.now += 15_000
    return made.json.code as string
  }
  const whoOn = async (code: string) => {
    const [b] = await db.select().from(bookings).where(eq(bookings.code, code))
    const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, b!.id))
    return { status: b!.status, reason: b!.businessCancelReason, offers: b!.declineAlternatives, staff: items.map((i) => i.staffName) }
  }
  const smsTo = (phone: string) => t.sms.sent.filter((s) => s.to === phone).map((s) => s.text)
  const schedule = (maysa: ReturnType<typeof browser>, id: string, body: Record<string, unknown>) =>
    maysa.req(`${W}/team/${id}/schedule`, { method: 'PUT', body })
  const businessWeek = { shift: null, breaks: Array(7).fill(null), daysOff: [] }

  it('removing someone with bookings ahead asks first; moved to a colleague, the client hears who does it now', async () => {
    const maysa = await as(MAYSA)
    const selbi = await hire(maysa, '+99365800501', 'Selbi')
    const moved = await book(maysa, '+99365800502', selbi, THU, 600)
    const busyThen = await book(maysa, '+99365800503', selbi, THU, 720)
    const kept = await book(maysa, '+99365800504', selbi, FRI, 600)
    // Jeren is busy at 12:00 and on Friday at 10:00
    await book(maysa, '+99365800505', jerenId, THU, 720)
    await book(maysa, '+99365800506', jerenId, FRI, 600)

    const asked = await maysa.req(`${W}/team/${selbi}/remove`, { body: {} })
    expect(asked.status).toBe(409)
    expect(asked.json.error).toMatchObject({ code: 'bookings_affected', details: { count: 3, byStaff: [{ staffId: selbi, count: 3 }] } })
    const listed = asked.json.error.details.bookings as { code: string; colleagues: { staffId: string }[] }[]
    expect(listed.map((b) => b.code)).toEqual([moved, busyThen, kept])
    expect(listed[0]!.colleagues.map((c) => c.staffId)).toContain(jerenId)
    // nothing changed yet
    expect((await whoOn(moved)).staff).toEqual(['Selbi'])

    const done = await maysa.req(`${W}/team/${selbi}/remove`, {
      body: { affected: 'move', to: jerenId, rows: [{ code: kept, affected: 'keep' }] },
    })
    expect(done.json).toEqual({ moved: 1, kept: 1, cancelled: 1 })
    expect(await whoOn(moved)).toMatchObject({ status: 'confirmed', staff: ['Jeren'] })
    // Jeren was busy then: cancelled with 3 other times
    expect(await whoOn(busyThen)).toMatchObject({ status: 'cancelled', reason: 'staff_away' })
    expect((await whoOn(busyThen)).offers).toHaveLength(3)
    expect(await whoOn(kept)).toMatchObject({ status: 'confirmed', staff: ['Selbi'] })
    // the time the moved booking just took with Jeren isn't offered to the one cancelled
    expect((await whoOn(busyThen)).offers).not.toContainEqual(expect.objectContaining({ date: THU, start: 600, staffId: jerenId }))
    await runDueJobs(t.deps)
    expect(smsTo('+99365800502')).toEqual([expect.stringMatching(/your booking on .+ is now with Jeren/)])
    expect(smsTo('+99365800503')).toEqual([expect.stringMatching(/cancelled your booking .*: The specialist can't come in\. Free times: /)])
    expect(smsTo('+99365800504')).toEqual([])
    // gone from the team, off the client site
    expect((await db.select().from(staff).where(eq(staff.id, selbi)))[0]).toMatchObject({ status: 'removed', bookable: false })
  })

  it('cancel offers each client other times; the owner can’t be removed; only the owner removes', async () => {
    const maysa = await as(MAYSA)
    const lale = await hire(maysa, '+99365800511', 'Läle')
    const code = await book(maysa, '+99365800512', lale, SAT, 600)
    expect((await (await as(AYNA)).req(`${W}/team/${lale}/remove`, { body: { affected: 'cancel' } })).status).toBe(403)
    expect((await maysa.req(`${W}/team/${lale}/remove`, { body: { affected: 'cancel' } })).json).toEqual({
      moved: 0,
      kept: 0,
      cancelled: 1,
    })
    expect(await whoOn(code)).toMatchObject({ status: 'cancelled', reason: 'staff_away' })
    // moving needs a colleague on the team
    const gul = await hire(maysa, '+99365800513', 'Gül')
    await book(maysa, '+99365800514', gul, SAT, 720)
    const bad = await maysa.req(`${W}/team/${gul}/remove`, { body: { affected: 'move', to: lale } })
    expect(bad.json.error).toMatchObject({ code: 'validation_error', details: { issues: [{ path: ['to'], code: 'not_found' }] } })
    const [owner] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, glowId), eq(staff.level, 'owner')))
    expect((await maysa.req(`${W}/team/${owner!.id}/remove`, { body: { affected: 'keep' } })).status).toBe(403)
  })

  it('the schedule: the owner saves it, an administrator reads it, a specialist doesn’t see it', async () => {
    const maysa = await as(MAYSA)
    const nur = await hire(maysa, '+99365800521', 'Nur')
    expect((await maysa.req(`${W}/team/${nur}/schedule`)).json).toEqual(businessWeek)
    const own = {
      shift: [null, ...Array.from({ length: 6 }, () => ({ open: 600, close: 1080 }))],
      breaks: [null, null, { start: 840, end: 880 }, { start: 810, end: 850 }, null, null, null],
      daysOff: [{ name: 'Birthday', from: '2026-12-01', to: '2026-12-01', yearly: true }],
    }
    const saved = await schedule(maysa, nur, own)
    expect(saved.status).toBe(200)
    expect(saved.json).toEqual({ ...own, moved: 0, kept: 0, cancelled: 0 })
    expect((await maysa.req(`${W}/team/${nur}/schedule`)).json).toEqual(own)
    expect((await (await as(AYNA)).req(`${W}/team/${nur}/schedule`)).status).toBe(403)
    expect((await (await as(AYNA)).req(`${W}/team/${nur}/schedule`, { method: 'PUT', body: own })).status).toBe(403)
    // what the domain refuses: a day that closes before it opens, a break outside the shift, a day off over already
    const broken = await schedule(maysa, nur, {
      shift: [{ open: 900, close: 600 }, ...own.shift.slice(1)],
      breaks: [null, { start: 300, end: 330 }, ...own.breaks.slice(2)],
      daysOff: [{ name: 'Gone', from: '2026-10-01', to: '2026-10-02', yearly: false }],
    })
    expect(broken.json.error.details.issues).toEqual([
      { path: ['shift', 0], code: 'invalid' },
      { path: ['breaks', 1], code: 'invalid' },
      { path: ['daysOff', 0, 'to'], code: 'past' },
    ])
    // one that ended, saved before, drops out quietly: the problem after it keeps its own place
    await db
      .update(staff)
      .set({ daysOff: [{ name: 'Ended', from: '2026-10-01', to: '2026-10-02', yearly: false, hours: null }] })
      .where(eq(staff.id, nur))
    const second = await schedule(maysa, nur, {
      ...own,
      daysOff: [
        { name: 'Ended', from: '2026-10-01', to: '2026-10-02', yearly: false },
        { name: 'Backwards', from: '2026-12-05', to: '2026-12-01', yearly: false },
      ],
    })
    expect(second.json.error.details.issues).toEqual([{ path: ['daysOff', 1, 'to'], code: 'invalid' }])
    await schedule(maysa, nur, own)
  })

  it('a day off over bookings asks first; moved to whoever is free, else other times; or kept, with nothing new booked', async () => {
    const maysa = await as(MAYSA)
    const ogul = await hire(maysa, '+99365800531', 'Ogul')
    const first = await book(maysa, '+99365800532', ogul, FRI2, 600)
    const second = await book(maysa, '+99365800533', ogul, FRI2, 720)
    // everyone else who does manicures is busy at 12:00: the first moves, the second can't
    const others = await db
      .select({ id: staff.id })
      .from(staff)
      .innerJoin(staffServices, eq(staffServices.staffId, staff.id))
      .where(and(eq(staff.businessId, glowId), eq(staff.status, 'active'), eq(staffServices.serviceId, manicure)))
    for (const [i, o] of others.filter((o) => o.id !== ogul).entries()) await book(maysa, `+9936580054${i}`, o.id, FRI2, 720)
    const off = { ...businessWeek, daysOff: [{ name: 'Holiday', from: FRI2, to: FRI2, yearly: false }] }
    const asked = await schedule(maysa, ogul, off)
    expect(asked.json.error).toMatchObject({ code: 'bookings_affected', details: { count: 2 } })
    expect((await maysa.req(`${W}/team/${ogul}/schedule`)).json.daysOff).toEqual([])

    expect((await schedule(maysa, ogul, { ...off, affected: 'move' })).json).toMatchObject({ moved: 1, kept: 0, cancelled: 1 })
    expect(await whoOn(first)).toMatchObject({ status: 'confirmed' })
    expect((await whoOn(first)).staff).not.toEqual(['Ogul'])
    expect(await whoOn(second)).toMatchObject({ status: 'cancelled', reason: 'staff_away' })

    // kept: they stay, and the day takes nothing new
    const kept = await book(maysa, '+99365800535', ogul, SAT2, 600)
    const saturday = { ...businessWeek, daysOff: [...off.daysOff, { name: 'Trip', from: SAT2, to: SAT2, yearly: false }] }
    expect((await schedule(maysa, ogul, { ...saturday, affected: 'keep' })).json).toMatchObject({ moved: 0, kept: 1, cancelled: 0 })
    expect(await whoOn(kept)).toMatchObject({ status: 'confirmed', staff: ['Ogul'] })
    const refused = await maysa.req(`${W}/bookings`, {
      body: { source: 'phone', phone: '+99365800536', serviceIds: [manicure], staffId: ogul, date: SAT2, start: 720 },
    })
    expect(refused.status).toBe(409)
    // saved again with no change to Saturday: the kept booking isn't asked about
    expect(
      (await schedule(maysa, ogul, { ...saturday, breaks: [null, null, null, { start: 780, end: 800 }, null, null, null] })).status,
    ).toBe(200)
  })

  it('a client’s move onto a day the specialist took off since is refused when confirmed', async () => {
    const maysa = await as(MAYSA)
    const nur = (
      await db
        .select()
        .from(staff)
        .where(and(eq(staff.businessId, glowId), eq(staff.name, 'Nur')))
    )[0]!.id
    const client = await as('+99365800551', 'Client')
    const sent = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: nur, date: '2026-10-27', start: 660 },
    })
    expect((await maysa.req(`${W}/requests/${sent.json.code}/confirm`, { body: {} })).status).toBe(204)
    const asked = await client.req(`/v1/me/bookings/${sent.json.code}/reschedule`, { body: { date: '2026-10-28', start: 660 } })
    expect(asked.status).toBe(200)
    const move = (
      await db
        .select()
        .from(bookings)
        .where(eq(bookings.rescheduleOf, (await db.select().from(bookings).where(eq(bookings.code, sent.json.code)))[0]!.id))
    )[0]!
    // the waiting move isn't asked about: it's answered on its own
    const saved = await schedule(maysa, nur, {
      ...(await maysa.req(`${W}/team/${nur}/schedule`)).json,
      daysOff: [{ name: 'Leave', from: '2026-10-28', to: '2026-10-28', yearly: false }],
    })
    expect(saved.status).toBe(200)
    const confirmed = await maysa.req(`${W}/requests/${move.code}/confirm`, { body: {} })
    expect(confirmed.json.error).toMatchObject({ code: 'cannot_move', details: { problem: 'staff_off', staffId: nur } })
  })

  it('a booking being made checks the specialist’s day as it stands, under the business’s lock', async () => {
    const maysa = await as(MAYSA)
    const mahri = await hire(maysa, '+99365800541', 'Mähri')
    await schedule(maysa, mahri, { ...businessWeek, daysOff: [{ name: 'Leave', from: THU, to: THU, yearly: false }] })
    const hours = await loadHours(db, glowId)
    await expect(assertStaffFree(db, hours, THU, [{ staffId: mahri, start: 600, end: 660 }])).rejects.toBeInstanceOf(OutsideHours)
    await expect(assertStaffFree(db, hours, FRI, [{ staffId: mahri, start: 600, end: 660 }])).resolves.toBeUndefined()
    // gone from the team: nothing more for them
    await maysa.req(`${W}/team/${mahri}/remove`, { body: { affected: 'keep' } })
    await expect(assertStaffFree(db, hours, FRI, [{ staffId: mahri, start: 600, end: 660 }])).rejects.toBeInstanceOf(OutsideHours)
  })
})
