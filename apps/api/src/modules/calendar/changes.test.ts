/** The business moves and cancels a confirmed booking (book B-26, B-27). */
import { epochOf } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses, jobs, rateLimits, services, staff, staffServices } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // specialist: hair
const MARAL = '+99361440819' // specialist: nails
const W = '/v1/w/glow-studio'
const TODAY = '2026-10-14' // DEMO_NOW: Wednesday 11:20 at the business
const TUE = '2026-10-20'
const THU = '2026-10-22'
const FRI = '2026-10-23'
const SAT = '2026-10-24'
const MON = '2026-10-26'
const TUE2 = '2026-10-27'
const WED2 = '2026-10-28'
const THU2 = '2026-10-29'
const WED3 = '2026-11-11'
const THU3 = '2026-11-12'
const FRI3 = '2026-11-13'
const SAT3 = '2026-11-14'
const TOMORROW = '2026-10-15'

describe('the business moves and cancels bookings (book B-26, B-27)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let manicure: string
  let maralId: string
  let aynaId: string
  let jerenId: string
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
    jerenId = await person('Jeren')
    // Jeren does manicures too, so a booking can move to her column
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
  /** A booking the team enters with Maral, quietly (no SMS of its own), its undo time over. */
  const book = async (b: ReturnType<typeof browser>, phone: string, date: string, start: number) => {
    const made = await b.req(`${W}/bookings`, {
      body: { source: 'phone', phone, serviceIds: [manicure], staffId: maralId, date, start, notifyClient: false },
    })
    expect(made.status).toBe(201)
    // past "Yzyna al" and the SMS after it: the client knows of it from here on
    t.clock.now += 15_000
    return made.json.code as string
  }
  const move = (b: ReturnType<typeof browser>, code: string, body: Record<string, unknown>) => b.req(`${W}/bookings/${code}/move`, { body })
  const cancel = (b: ReturnType<typeof browser>, code: string, body: Record<string, unknown>) =>
    b.req(`${W}/bookings/${code}/cancel`, { body })
  const rowOf = async (code: string) => (await db.select().from(bookings).where(eq(bookings.code, code)))[0]!
  const itemsOf = async (code: string) =>
    db
      .select()
      .from(bookingItems)
      .where(eq(bookingItems.bookingId, (await rowOf(code)).id))
  const smsTo = (phone: string) => t.sms.sent.filter((s) => s.to === phone && !/code/.test(s.text)).map((s) => s.text)

  it('moves a booking to another time and another specialist; the client hears it unless the team says not to', async () => {
    const maysa = await as(MAYSA)
    const maral = await as(MARAL)
    const code = await book(maysa, '+99365800201', TUE, 600)
    expect((await move(maysa, code, { date: TUE, start: 720, notifyClient: true })).status).toBe(204)
    expect(await rowOf(code)).toMatchObject({ date: TUE, start: 720, end: 780, status: 'confirmed' })
    expect(await itemsOf(code)).toMatchObject([{ date: TUE, start: 720, end: 780, staffId: maralId, bufferAfter: 10 }])
    await runDueJobs(t.deps)
    expect(smsTo('+99365800201')).toEqual([expect.stringMatching(/Glow Studio moved your booking to .*12:00/)])

    // to Jeren's column, quietly: Maral's own calendar still hears that it left her
    const cursor = (await maral.req('/v1/events')).json.cursor as string
    expect((await move(maysa, code, { date: THU, start: 780, staffId: jerenId, notifyClient: false })).status).toBe(204)
    expect(await itemsOf(code)).toMatchObject([{ date: THU, start: 780, end: 840, staffId: jerenId, staffName: 'Jeren' }])
    const heard = await eventsAfter(maral, cursor, (items) => items.some((e) => e.bookingCode === code))
    expect(
      (heard.json.items as { type: string; bookingCode: string }[]).filter((e) => e.bookingCode === code).map((e) => e.type),
    ).toContain('booking.moved')
    await runDueJobs(t.deps)
    expect(smsTo('+99365800201')).toHaveLength(1)
    // Maral's 12:00 on Tuesday is free again
    const free = (await maysa.req(`${W}/free-times?services=${manicure}&staff=${maralId}&date=${TUE}`)).json.slots as { start: number }[]
    expect(free.map((s) => s.start)).toContain(720)
  })

  it('a move that doesn’t fit says why: the service, a day off, the hours, another booking, the buffer', async () => {
    const maysa = await as(MAYSA)
    const code = await book(maysa, '+99365800202', FRI, 600)
    await book(maysa, '+99365800203', FRI, 900)
    const refused = async (body: Record<string, unknown>) => {
      const res = await move(maysa, code, { date: FRI, ...body })
      expect(res.status).toBe(409)
      expect(res.json.error.code).toBe('cannot_move')
      return res.json.error.details as { problem: string; staffId: string }
    }
    expect(await refused({ start: 720, staffId: aynaId })).toEqual({ problem: 'staff_cannot_do', staffId: aynaId })
    // Glow's stock-taking day
    expect(await refused({ date: '2026-11-02', start: 720 })).toEqual({ problem: 'staff_off', staffId: maralId })
    expect(await refused({ start: 1170 })).toEqual({ problem: 'outside_hours', staffId: maralId })
    expect(await refused({ start: 870 })).toEqual({ problem: 'overlap', staffId: maralId })
    // the visit would end at 15:00 as the other starts; its 10 minutes after don't fit
    expect(await refused({ start: 840 })).toEqual({ problem: 'buffer', staffId: maralId })
    // into the past, and off the 15-minute steps
    const past = await move(maysa, code, { date: TODAY, start: 600 })
    expect(past.status).toBe(400)
    expect(past.json.error.details.issues).toEqual([{ path: ['start'], code: 'past' }])
    expect((await move(maysa, code, { date: FRI, start: 725 })).json.error.details.issues).toEqual([{ path: ['start'], code: 'off_step' }])
    expect((await rowOf(code)).start).toBe(600)
  })

  it('a specialist moves their own bookings only, and only to themself; requests and started visits stay put', async () => {
    const maysa = await as(MAYSA)
    const maral = await as(MARAL)
    const code = await book(maysa, '+99365800204', SAT, 600)
    expect((await move(maral, code, { date: SAT, start: 660 })).status).toBe(204)
    expect((await move(maral, code, { date: SAT, start: 720, staffId: jerenId })).status).toBe(403)
    expect((await move(await as(AYNA), code, { date: SAT, start: 720 })).status).toBe(404)
    expect((await cancel(await as(AYNA), code, { reason: 'staff_away' })).status).toBe(404)

    // a client's request is answered, not moved
    const client = await as('+99365800205', 'Client')
    const slots = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${SAT}`)).json
      .slots as {
      start: number
    }[]
    const request = await client.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'glow-studio',
        serviceIds: [manicure],
        staffId: maralId,
        date: SAT,
        start: slots.at(-1)!.start,
      },
    })
    expect(request.json.status).toBe('pending')
    const asked = await move(maysa, request.json.code, { date: SAT, start: 600 })
    expect(asked.status).toBe(409)
    expect(asked.json.error.code).toBe('invalid_status')
    expect((await cancel(maysa, request.json.code, { reason: 'staff_away' })).json.error.code).toBe('invalid_status')

    // once confirmed, a move the client asked for is answered first
    expect((await maysa.req(`${W}/requests/${request.json.code}/confirm`, { method: 'POST' })).status).toBe(204)
    const later = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${THU}`)).json
      .slots as { start: number }[]
    const asks = await client.req(`/v1/me/bookings/${request.json.code}/reschedule`, { body: { date: THU, start: later.at(-1)!.start } })
    expect(asks.status).toBeLessThan(300)
    const waiting = await move(maysa, request.json.code, { date: SAT, start: 600 })
    expect(waiting.status).toBe(409)
    expect(waiting.json.error.code).toBe('move_waiting')

    // a visit that has started
    const today = (await maysa.req(`${W}/free-times?services=${manicure}&staff=${maralId}`)).json.slots as { start: number }[]
    const now = await book(maysa, '+99365800206', TODAY, today.at(-1)!.start)
    t.clock.now = epochOf(TODAY, today.at(-1)!.start) + 60_000
    const started = await move(maysa, now, { date: SAT, start: 1080 })
    expect(started.status).toBe(409)
    expect(started.json.error.code).toBe('already_started')
    expect((await cancel(maysa, now, { reason: 'staff_away' })).json.error.code).toBe('already_started')
  })

  it('a cancel with the business’s reason: the client sees it and hears it, and the time frees up', async () => {
    const maysa = await as(MAYSA)
    const client = await as('+99365800207', 'Leýli')
    const code = await book(maysa, '+99365800207', THU, 600)
    expect((await cancel(maysa, code, { reason: 'staff_away' })).status).toBe(204)
    expect(await rowOf(code)).toMatchObject({
      status: 'cancelled',
      cancelledBy: 'business',
      businessCancelReason: 'staff_away',
      cancelReason: null,
    })
    // a code the app words, the client's own words none
    expect((await client.req(`/v1/me/bookings/${code}?lang=en`)).json).toMatchObject({
      status: 'cancelled',
      cancelledBy: 'business',
      cancelReason: null,
      businessCancel: { reason: 'staff_away', text: null },
    })
    await runDueJobs(t.deps)
    expect(smsTo('+99365800207')).toEqual([expect.stringMatching(/Glow Studio cancelled your booking .*The specialist can't come in/)])
    const free = (await maysa.req(`${W}/free-times?services=${manicure}&staff=${maralId}&date=${THU}`)).json.slots as { start: number }[]
    expect(free.map((s) => s.start)).toContain(600)
    // a second cancel
    expect((await cancel(maysa, code, { reason: 'staff_away' })).json.error.code).toBe('invalid_status')

    // "Other reason" needs the words, which the client reads
    const other = await book(maysa, '+99365800207', THU, 720)
    expect((await cancel(maysa, other, { reason: 'other' })).status).toBe(400)
    expect((await cancel(maysa, other, { reason: 'other', text: 'The power is off' })).status).toBe(204)
    expect((await client.req(`/v1/me/bookings/${other}`)).json).toMatchObject({
      cancelReason: null,
      businessCancel: { reason: 'other', text: 'The power is off' },
    })
  })

  it('“The client called to cancel” is the client’s own cancel: no reason shown, no undo, a short SMS', async () => {
    const maysa = await as(MAYSA)
    const client = await as('+99365800208', 'Ogulnabat')
    const code = await book(maysa, '+99365800208', THU, 840)
    expect((await cancel(maysa, code, { reason: 'client_called' })).status).toBe(204)
    expect(await rowOf(code)).toMatchObject({ status: 'cancelled', cancelledBy: 'client', businessCancelReason: 'client_called' })
    const detail = (await client.req(`/v1/me/bookings/${code}`)).json
    expect(detail).toMatchObject({ status: 'cancelled', cancelledBy: 'client', cancelReason: null, businessCancel: null })
    expect(detail.actions.restore).toBe(false)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800208')).toEqual([expect.stringMatching(/your booking at Glow Studio .* is cancelled, as you asked/)])
  })

  it('cancelling a booking with a move waiting withdraws the move', async () => {
    const maysa = await as(MAYSA)
    const client = await as('+99365800209', 'Client')
    const slots = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${FRI}`)).json
      .slots as {
      start: number
    }[]
    const made = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: maralId, date: FRI, start: slots[0]!.start },
    })
    await maysa.req(`${W}/requests/${made.json.code}/confirm`, { method: 'POST' })
    const later = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${SAT}`)).json
      .slots as { start: number }[]
    await client.req(`/v1/me/bookings/${made.json.code}/reschedule`, { body: { date: SAT, start: later[0]!.start } })
    expect((await cancel(maysa, made.json.code, { reason: 'staff_away' })).status).toBe(204)
    const original = await rowOf(made.json.code)
    const [asked] = await db.select().from(bookings).where(eq(bookings.rescheduleOf, original.id))
    expect(asked).toMatchObject({ status: 'cancelled', cancelledBy: 'business' })
  })

  it('each change is told, a move back included; nothing changed tells nothing; a new specialist alone says who', async () => {
    const maysa = await as(MAYSA)
    const code = await book(maysa, '+99365800210', MON, 600)
    // the jobs run between the changes, as they do every minute (a time already left again isn't told)
    const moved = async (body: Record<string, unknown>) => {
      expect((await move(maysa, code, { date: MON, notifyClient: true, ...body })).status).toBe(204)
      await runDueJobs(t.deps)
    }
    await moved({ start: 720 })
    await moved({ start: 600 })
    // back to 12:00, a time it had: still told
    await moved({ start: 720 })
    // dropped on its own place
    await moved({ start: 720 })
    await moved({ start: 720, staffId: jerenId })
    expect(smsTo('+99365800210')).toEqual([
      expect.stringMatching(/moved your booking to .*12:00/),
      expect.stringMatching(/moved your booking to .*10:00/),
      expect.stringMatching(/moved your booking to .*12:00/),
      expect.stringMatching(/your booking on .*12:00 is now with Jeren/),
    ])
    // the booking's own setting by default: this one was saved quietly
    expect((await move(maysa, code, { date: MON, start: 780 })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800210')).toHaveLength(4)
  })

  it('a booking the client hasn’t heard of yet: a move tells the new time once the undo is over, a cancel tells nothing', async () => {
    const maysa = await as(MAYSA)
    const made = await maysa.req(`${W}/bookings`, {
      body: { source: 'phone', phone: '+99365800211', serviceIds: [manicure], staffId: maralId, date: TUE2, start: 600 },
    })
    expect((await move(maysa, made.json.code, { date: TUE2, start: 720 })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800211')).toEqual([])
    t.clock.now += 15_000
    await runDueJobs(t.deps)
    expect(smsTo('+99365800211')).toEqual([expect.stringMatching(/you're booked: Glow Studio, .*12:00/)])
    const other = await maysa.req(`${W}/bookings`, {
      body: { source: 'phone', phone: '+99365800212', serviceIds: [manicure], staffId: maralId, date: TUE2, start: 900 },
    })
    expect((await cancel(maysa, other.json.code, { reason: 'staff_away' })).status).toBe(204)
    t.clock.now += 10_000
    await runDueJobs(t.deps)
    expect(smsTo('+99365800212')).toEqual([])
  })

  it('a booking whose specialist left needs one; a client’s move whose answer time ran out doesn’t hold it up', async () => {
    const maysa = await as(MAYSA)
    const orphan = await book(maysa, '+99365800213', WED2, 600)
    await db
      .update(bookingItems)
      .set({ staffId: null })
      .where(eq(bookingItems.bookingId, (await rowOf(orphan)).id))
    const pick = await move(maysa, orphan, { date: WED2, start: 660 })
    expect(pick.status).toBe(400)
    expect(pick.json.error.details.issues).toEqual([{ path: ['staffId'], code: 'required' }])
    expect((await move(maysa, orphan, { date: WED2, start: 660, staffId: jerenId })).status).toBe(204)
    expect(await itemsOf(orphan)).toMatchObject([{ staffId: jerenId, start: 660 }])

    // the client asks for a new time; nobody answers within the 30 minutes, and the jobs haven't run yet
    const client = await as('+99365800214', 'Client')
    const slots = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${WED2}`)).json
      .slots as { start: number }[]
    const made = await client.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'glow-studio',
        serviceIds: [manicure],
        staffId: maralId,
        date: WED2,
        start: slots.at(-1)!.start,
      },
    })
    await maysa.req(`${W}/requests/${made.json.code}/confirm`, { method: 'POST' })
    const later = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${THU2}`)).json
      .slots as { start: number }[]
    await client.req(`/v1/me/bookings/${made.json.code}/reschedule`, { body: { date: THU2, start: later[0]!.start } })
    t.clock.now += 31 * 60_000
    expect((await move(maysa, made.json.code, { date: WED2, start: 900 })).status).toBe(204)
    const [asked] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.rescheduleOf, (await rowOf(made.json.code)).id))
    expect(asked).toMatchObject({ status: 'cancelled', cancelledBy: 'system' })
    // the booking took the team's time; the refused move isn't held against it
    expect(await rowOf(made.json.code)).toMatchObject({ date: WED2, start: 900, moveRefused: null })
  })

  it('one first SMS: a change before it goes is told in it; changes before a change SMS goes are told once, or not at all', async () => {
    const maysa = await as(MAYSA)
    const jobsOf = async (code: string) => {
      const id = (await rowOf(code)).id
      return (await db.select().from(jobs))
        .filter((j) => j.payload.bookingId === id && !String(j.payload.kind).startsWith('reminder'))
        .sort((a, b) => a.id - b.id)
    }
    const enter = async (phone: string, start: number) =>
      (
        await maysa.req(`${W}/bookings`, {
          body: { source: 'phone', phone, serviceIds: [manicure], staffId: maralId, date: WED3, start },
        })
      ).json.code as string

    // to Jeren's column inside the undo window: one "booked", 5 seconds after the undo time
    const first = await enter('+99365800220', 600)
    expect((await jobsOf(first)).map((j) => [j.payload.kind, j.runAt.getTime()])).toEqual([['booked', t.clock.now + 15_000]])
    expect((await move(maysa, first, { date: WED3, start: 600, staffId: jerenId })).status).toBe(204)
    t.clock.now += 15_000
    await runDueJobs(t.deps)
    // agreed with Maral on the phone: the SMS names Jeren
    expect(smsTo('+99365800220')).toEqual([expect.stringMatching(/you're booked: Glow Studio, .*10:00, with Jeren,/)])

    // moved 12 seconds after saving, the confirmation not sent yet: it tells the new time, and nothing says "moved"
    const second = await enter('+99365800221', 840)
    t.clock.now += 12_000
    expect((await move(maysa, second, { date: WED3, start: 900 })).status).toBe(204)
    t.clock.now += 10_000
    await runDueJobs(t.deps)
    expect(smsTo('+99365800221')).toEqual([expect.stringMatching(/you're booked: Glow Studio, .*15:00/)])

    // told already: Maral, Jeren and back before the jobs run tells nothing; two moves tell the last
    const third = await book(maysa, '+99365800222', WED3, 1020)
    expect((await move(maysa, third, { date: WED3, start: 1020, staffId: jerenId, notifyClient: true })).status).toBe(204)
    expect((await move(maysa, third, { date: WED3, start: 1020, staffId: maralId, notifyClient: true })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800222')).toEqual([])
    expect((await move(maysa, third, { date: WED3, start: 720, notifyClient: true })).status).toBe(204)
    expect((await move(maysa, third, { date: WED3, start: 780, notifyClient: true })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800222')).toEqual([expect.stringMatching(/moved your booking to .*13:00/)])
    // the first change's news found the booking back as the client knew it; the second asked for none more
    expect((await jobsOf(third)).map((j) => j.error)).toEqual(['dropped: the client knows the booking as it is', null])
    expect((await rowOf(third)).told).toMatchObject({ date: WED3, start: 780, staff: maralId })

    // moved with the client told, then given to Jeren without telling, before the jobs run: the SMS says both
    const fourth = await book(maysa, '+99365800223', WED3, 1080)
    const firstMove = await move(maysa, fourth, { date: WED3, start: 1020, notifyClient: true })
    expect(firstMove.status, JSON.stringify(firstMove.json)).toBe(204)
    expect((await move(maysa, fourth, { date: WED3, start: 1020, staffId: jerenId, notifyClient: false })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800223')).toEqual([expect.stringMatching(/moved your booking to .*17:00, with Jeren/)])
  })

  it('a phone booking cancelled before its confirmation went tells nothing; one the client chose online and that moved says so', async () => {
    const maysa = await as(MAYSA)
    // the client learned of it on the phone; its "booked" hadn't gone at 12 seconds
    const made = await maysa.req(`${W}/bookings`, {
      body: { source: 'phone', phone: '+99365800224', serviceIds: [manicure], staffId: maralId, date: THU3, start: 600 },
    })
    t.clock.now += 12_000
    expect((await cancel(maysa, made.json.code, { reason: 'staff_away' })).status).toBe(204)
    t.clock.now += 60_000
    await runDueJobs(t.deps)
    expect(smsTo('+99365800224')).toEqual([])

    // asked online for 13:00, confirmed, then moved to 14:00 before the confirmation went: told as the move
    const client = await as('+99365800225', 'Client')
    const request = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: maralId, date: THU3, start: 780 },
    })
    expect(request.json.status).toBe('pending')
    await maysa.req(`${W}/requests/${request.json.code}/confirm`, { method: 'POST' })
    expect((await move(maysa, request.json.code, { date: THU3, start: 840 })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800225')).toEqual([expect.stringMatching(/moved your booking to .*14:00/)])
  })

  it('what the client knows: missing on older bookings, kept by reminders, named by a cancel; a quiet booking waits its undo', async () => {
    const maysa = await as(MAYSA)
    // a booking from before it was kept: its move is told
    const older = await book(maysa, '+99365800226', FRI3, 600)
    await db.update(bookings).set({ told: null }).where(eq(bookings.code, older))
    expect((await move(maysa, older, { date: FRI3, start: 720, notifyClient: true })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800226')).toEqual([expect.stringMatching(/moved your booking to .*12:00/)])

    // entered quietly and given to Jeren with the SMS on, inside the undo window: nothing until it can't be undone
    const quiet = (
      await maysa.req(`${W}/bookings`, {
        body: {
          source: 'phone',
          phone: '+99365800227',
          serviceIds: [manicure],
          staffId: maralId,
          date: FRI3,
          start: 900,
          notifyClient: false,
        },
      })
    ).json.code as string
    expect((await move(maysa, quiet, { date: FRI3, start: 900, staffId: jerenId, notifyClient: true })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800227')).toEqual([])
    t.clock.now += 15_000
    await runDueJobs(t.deps)
    expect(smsTo('+99365800227')).toEqual([expect.stringMatching(/your booking on .*15:00 is now with Jeren/)])
    // the same, undone: nothing at all
    const undone = (
      await maysa.req(`${W}/bookings`, {
        body: {
          source: 'phone',
          phone: '+99365800228',
          serviceIds: [manicure],
          staffId: maralId,
          date: FRI3,
          start: 1020,
          notifyClient: false,
        },
      })
    ).json.code as string
    expect((await move(maysa, undone, { date: FRI3, start: 1020, staffId: jerenId, notifyClient: true })).status).toBe(204)
    expect((await maysa.req(`${W}/bookings/${undone}/undo`, { method: 'POST' })).status).toBe(204)
    t.clock.now += 15_000
    await runDueJobs(t.deps)
    expect(smsTo('+99365800228')).toEqual([])

    // told 10:00; moved to 15:00 (its SMS waiting) and cancelled: the cancel names the time the client knows
    const known = await book(maysa, '+99365800229', SAT3, 600)
    expect((await move(maysa, known, { date: SAT3, start: 900, notifyClient: true })).status).toBe(204)
    expect((await cancel(maysa, known, { reason: 'staff_away' })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800229')).toEqual([expect.stringMatching(/cancelled your booking on .* 10:00:/)])
  })

  it('a reminder tells the time too: a quiet move, its reminder, then a move back is told', async () => {
    const maysa = await as(MAYSA)
    // tomorrow 11:00, told; moved to 12:00 without telling
    const code = await book(maysa, '+99365800230', TOMORROW, 660)
    expect((await move(maysa, code, { date: TOMORROW, start: 720, notifyClient: false })).status).toBe(204)
    // the evening reminder and the 2-hour one, by tomorrow at 10:00, say 12:00
    t.clock.now = epochOf(TOMORROW, 600)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800230')).toEqual([
      expect.stringMatching(/Reminder: tomorrow at 12:00/),
      expect.stringMatching(/Reminder: today at 12:00/),
    ])
    expect((await rowOf(code)).told).toMatchObject({ date: TOMORROW, start: 720 })
    // back to 11:00, told
    expect((await move(maysa, code, { date: TOMORROW, start: 660, notifyClient: true })).status).toBe(204)
    await runDueJobs(t.deps)
    expect(smsTo('+99365800230').at(-1)).toMatch(/moved your booking to .*11:00/)
  })
})
