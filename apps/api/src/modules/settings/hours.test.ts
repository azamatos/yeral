/** Opening hours and special days (book B-39, B-40): bookings left outside are kept or cancelled with offered times (Q-211). */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MAYSA = '+99365102030' // owner of Glow Studio
const SELBI = '+99365884102' // administrator
const AYNA = '+99365312210' // specialist
const W = '/v1/w/glow-studio'
const HOURS = `${W}/settings/hours`
const THU = '2026-10-22'
const THU2 = '2026-11-05'
const FRI2 = '2026-11-06'
const MON3 = '2026-11-09'
const WED2 = '2026-10-28'
const SAT = '2026-10-24'
const MON2 = '2026-11-09'
const TUE2 = '2026-11-10'
const FRI = '2026-10-30'

interface Hours {
  hours: ({ open: number; close: number; break: { start: number; end: number } | null } | null)[]
  specialDays: { name: string; from: string; to: string; yearly: boolean; hours: { open: number; close: number } | null }[]
}

describe('opening hours and special days (book B-39, B-40)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let manicure: string
  let maralId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    manicure = (await db.select().from(services).where(eq(services.businessId, glow!.id))).find((s) => s.name.en === 'Manicure')!.id
    maralId = (
      await db
        .select()
        .from(staff)
        .where(and(eq(staff.businessId, glow!.id), eq(staff.name, 'Maral')))
    )[0]!.id
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
  /** A booking the team enters with Maral; quiet unless `notify`, its undo time over unless `fresh`. */
  const book = async (
    b: ReturnType<typeof browser>,
    phone: string,
    date: string,
    start: number,
    opts: { fresh?: boolean; notify?: boolean } = {},
  ) => {
    const made = await b.req(`${W}/bookings`, {
      body: { source: 'phone', phone, serviceIds: [manicure], staffId: maralId, date, start, notifyClient: opts.notify ?? false },
    })
    expect(made.status, JSON.stringify(made.json)).toBe(201)
    // past "Yzyna al" and the SMS after it, unless `fresh`
    if (!opts.fresh) t.clock.now += 15_000
    return made.json.code as string
  }
  const rowOf = async (code: string) => (await db.select().from(bookings).where(eq(bookings.code, code)))[0]!
  const save = (b: ReturnType<typeof browser>, body: Hours & { affected?: string }) => b.req(HOURS, { method: 'PUT', body })
  const smsTo = (phone: string) => t.sms.sent.filter((s) => s.to === phone && !/code/.test(s.text)).map((s) => s.text)

  it('the owner and an administrator read and save them; each is checked; a specialist can’t', async () => {
    const maysa = await as(MAYSA)
    const now = (await maysa.req(HOURS)).json as Hours
    expect(now.hours).toHaveLength(7)
    expect(now.hours[0]).toEqual({ open: 540, close: 1200, break: null })
    expect(now.specialDays.map((d) => d.name)).toContain('Nowruz')
    expect((await (await as(AYNA)).req(HOURS)).status).toBe(403)
    // the same again: saved, nothing affected
    expect((await save(await as(SELBI), now)).json).toEqual({ ...now, cancelled: 0 })

    const bad = await save(maysa, {
      hours: now.hours.map((d, i) => (i === 0 ? { open: 600, close: 540, break: null } : d)),
      specialDays: [
        ...now.specialDays,
        { name: 'Gone', from: '2026-10-01', to: '2026-10-01', yearly: false, hours: null },
        { name: 'Backwards', from: '2026-12-02', to: '2026-12-01', yearly: false, hours: null },
      ],
    })
    expect(bad.status).toBe(400)
    const n = now.specialDays.length
    expect(bad.json.error.details.issues).toEqual([
      { path: ['hours', 0], code: 'invalid' },
      { path: ['specialDays', n, 'to'], code: 'past' },
      { path: ['specialDays', n + 1, 'to'], code: 'invalid' },
    ])
    // other hours till noon the next day run into Saturday's 09:00 opening (Q-105)
    const night = await save(maysa, {
      ...now,
      specialDays: [...now.specialDays, { name: 'Long night', from: FRI, to: FRI, yearly: false, hours: { open: 720, close: 2160 } }],
    })
    expect(night.json.error.details.issues).toEqual([{ path: ['specialDays', n, 'hours'], code: 'overlaps_next_day' }])
    // the pickers run in 30-minute steps (Q-128)
    expect(
      (await save(maysa, { ...now, hours: now.hours.map((d, i) => (i === 0 ? { open: 555, close: 1200, break: null } : d)) })).status,
    ).toBe(400)
  })

  it('a special day over bookings: listed first; cancelled, each client gets 3 times under its name and takes one', async () => {
    const maysa = await as(MAYSA)
    const client = await as('+99365800301', 'Leýli')
    const first = await book(maysa, '+99365800301', THU, 600)
    const second = await book(maysa, '+99365800302', THU, 720)
    const was = (await maysa.req(HOURS)).json as Hours
    const repairs = { ...was, specialDays: [...was.specialDays, { name: 'Repairs', from: THU, to: THU, yearly: false, hours: null }] }

    const asked = await save(maysa, repairs)
    expect(asked.status).toBe(409)
    expect(asked.json.error.code).toBe('bookings_affected')
    expect(asked.json.error.details).toMatchObject({
      count: 2,
      byStaff: [{ staffId: maralId, name: 'Maral', count: 2 }],
      bookings: [
        { code: first, date: THU, start: 600, staff: ['Maral'] },
        { code: second, date: THU, start: 720, staff: ['Maral'] },
      ],
    })
    // nothing saved yet
    expect(((await maysa.req(HOURS)).json as Hours).specialDays.map((d) => d.name)).not.toContain('Repairs')
    expect((await rowOf(first)).status).toBe('confirmed')

    const done = await save(maysa, { ...repairs, affected: 'cancel' })
    expect(done.status).toBe(200)
    expect(done.json.cancelled).toBe(2)
    const row = await rowOf(first)
    expect(row).toMatchObject({ status: 'cancelled', cancelledBy: 'business', businessCancelReason: 'closed', cancelReason: 'Repairs' })
    expect(row.declineAlternatives).toHaveLength(3)
    for (const o of row.declineAlternatives) expect(o).toMatchObject({ staffId: maralId })
    for (const o of row.declineAlternatives) expect(o.date).not.toBe(THU)

    const detail = (await client.req(`/v1/me/bookings/${first}`)).json
    expect(detail).toMatchObject({
      status: 'cancelled',
      cancelledBy: 'business',
      cancelReason: null,
      businessCancel: { reason: 'closed', text: 'Repairs' },
      decline: null,
    })
    expect(detail.cancelOffers).toHaveLength(3)
    expect(detail.cancelOffers[0]).toMatchObject({ state: 'free', staff: { id: maralId } })
    await runDueJobs(t.deps)
    expect(smsTo('+99365800301')).toEqual([expect.stringMatching(/Glow Studio cancelled your booking .*: Repairs\. Free times: .+ — /)])

    // one tap: confirmed at the offered time; they're the cancel's offers, not a decline's
    const declined = await client.req(`/v1/me/bookings/${first}/accept-alternative`, { body: { source: 'decline', index: 0 } })
    expect(declined.json.error.code).toBe('invalid_status')
    const taken = await client.req(`/v1/me/bookings/${first}/accept-alternative`, { body: { source: 'cancel', index: 0 } })
    expect(taken.json).toMatchObject({
      status: 'confirmed',
      date: row.declineAlternatives[0]!.date,
      start: row.declineAlternatives[0]!.start,
    })
    // clients see the day closed by its name
    const days = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${THU}`)).json
      .days as {
      date: string
      state: string
      closedReason: string | null
    }[]
    expect(days.find((d) => d.date === THU)).toMatchObject({ state: 'closed', closedReason: 'Repairs' })
  })

  it('kept bookings stay and aren’t asked about again; new hours over a booking say the hours changed', async () => {
    const maysa = await as(MAYSA)
    const kept = await book(maysa, '+99365800303', WED2, 600)
    const was = (await maysa.req(HOURS)).json as Hours
    // Wednesday opens at 12:00 now
    const later = { ...was, hours: was.hours.map((d, i) => (i === 2 ? { open: 720, close: 1200, break: null } : d)) }
    // every Wednesday: today's demo bookings before 12:00 too
    const listed = (await save(maysa, later)).json.error.details as { bookings: { code: string }[] }
    expect(listed.bookings.map((b) => b.code)).toContain(kept)
    expect((await save(maysa, { ...later, affected: 'keep' })).json.cancelled).toBe(0)
    expect((await rowOf(kept)).status).toBe('confirmed')
    // saved again with a change elsewhere: the kept booking isn't asked about
    const again = {
      ...later,
      specialDays: [...later.specialDays, { name: 'Far away', from: '2027-02-01', to: '2027-02-01', yearly: false, hours: null }],
    }
    expect((await save(maysa, again)).status).toBe(200)

    // a break over a booking: cancelled for the new hours
    const lunch = await book(maysa, '+99365800304', WED2, 780)
    const withBreak = {
      ...again,
      hours: again.hours.map((d, i) => (i === 2 ? { open: 720, close: 1200, break: { start: 780, end: 840 } } : d)),
    }
    expect((await save(maysa, { ...withBreak, affected: 'cancel' })).json.cancelled).toBeGreaterThanOrEqual(1)
    expect(await rowOf(lunch)).toMatchObject({ status: 'cancelled', businessCancelReason: 'hours', cancelReason: null })
    await runDueJobs(t.deps)
    expect(smsTo('+99365800304')).toEqual([expect.stringMatching(/cancelled your booking .*: The opening hours changed\./)])
    // back as it was
    expect((await save(maysa, { ...was, affected: 'keep' })).status).toBe(200)
  })

  it('a day off under way may change; one that ended is dropped; a kept booking is asked about when its day closes', async () => {
    const maysa = await as(MAYSA)
    const was = (await maysa.req(HOURS)).json as Hours
    // stored as they were saved: one ended on Monday, one under way since Monday
    await db
      .update(businesses)
      .set({
        exceptions: [
          ...was.specialDays,
          { name: 'Ended', from: '2026-10-12', to: '2026-10-12', yearly: false, hours: null },
          { name: 'Painting', from: '2026-10-12', to: '2026-10-16', yearly: false, hours: { open: 720, close: 1200 } },
        ],
      })
      .where(eq(businesses.slug, 'glow-studio'))
    const stored = (await maysa.req(HOURS)).json as Hours
    const shorter = {
      ...stored,
      specialDays: stored.specialDays.map((d) => (d.name === 'Painting' ? { ...d, to: '2026-10-15' } : d)),
    }
    const saved = await save(maysa, { ...shorter, affected: 'keep' })
    expect(saved.status).toBe(200)
    expect(saved.json.specialDays.map((d: { name: string }) => d.name)).not.toContain('Ended')
    expect(saved.json.specialDays.find((d: { name: string }) => d.name === 'Painting')).toMatchObject({ to: '2026-10-15' })

    // Monday opens at 12:00; the 10:00 booking is kept, then a closed day on that Monday asks about it again
    const kept = await book(maysa, '+99365800306', MON2, 600)
    const later = {
      ...saved.json,
      hours: (saved.json as Hours).hours.map((d, i) => (i === 0 ? { open: 720, close: 1200, break: null } : d)),
    } as Hours
    delete (later as Partial<Hours & { cancelled: number }>).cancelled
    expect((await save(maysa, { ...later, affected: 'keep' })).status).toBe(200)
    const closed = {
      ...later,
      specialDays: [...later.specialDays, { name: 'Inspection', from: MON2, to: MON2, yearly: false, hours: null }],
    }
    const asked = await save(maysa, closed)
    expect(asked.json.error.details.bookings.map((b: { code: string }) => b.code)).toContain(kept)
    expect((await save(maysa, { ...closed, affected: 'cancel' })).status).toBe(200)
    expect(await rowOf(kept)).toMatchObject({ status: 'cancelled', cancelReason: 'Inspection' })
    expect((await save(maysa, { ...was, affected: 'keep' })).status).toBe(200)
  })

  it('a closed day over several bookings offers each client other times; the SMS link page shows them too', async () => {
    const maysa = await as(MAYSA)
    const codes = [
      await book(maysa, '+99365800307', TUE2, 600),
      await book(maysa, '+99365800308', TUE2, 720),
      await book(maysa, '+99365800309', TUE2, 840),
    ]
    const was = (await maysa.req(HOURS)).json as Hours
    const closed = { ...was, specialDays: [...was.specialDays, { name: 'Audit', from: TUE2, to: TUE2, yearly: false, hours: null }] }
    const asked = await save(maysa, closed)
    expect(asked.json.error.details.byStaff).toEqual([{ staffId: maralId, name: 'Maral', count: 3 }])
    expect((await save(maysa, { ...closed, affected: 'cancel' })).json.cancelled).toBe(3)
    const offered = (await Promise.all(codes.map(rowOf))).flatMap((r) =>
      r.declineAlternatives.map((o) => `${o.staffId} ${o.date} ${o.start}`),
    )
    expect(offered).toHaveLength(9)
    // no time offered to two clients
    expect(new Set(offered).size).toBe(9)

    // the SMS link opens the booking signed out, with the times to take
    await runDueJobs(t.deps)
    const text = smsTo('+99365800307').at(-1)!
    const token = /\/l\/([\w-]+)/.exec(text)![1]!
    const page = (await browser(t.app).req(`/v1/links/${token}`)).json
    expect(page).toMatchObject({ status: 'cancelled', cancelReason: null, businessCancel: { reason: 'closed', text: 'Audit' } })
    expect(page.cancelOffers).toHaveLength(3)
    expect((await save(maysa, { ...was, affected: 'keep' })).status).toBe(200)
  })

  it('a booking the client hasn’t heard of yet is cancelled without an SMS', async () => {
    const maysa = await as(MAYSA)
    const fresh = await book(maysa, '+99365800305', SAT, 600, { fresh: true, notify: true })
    const was = (await maysa.req(HOURS)).json as Hours
    const closed = { ...was, specialDays: [...was.specialDays, { name: 'Training day', from: SAT, to: SAT, yearly: false, hours: null }] }
    expect((await save(maysa, { ...closed, affected: 'cancel' })).json.cancelled).toBe(1)
    expect((await rowOf(fresh)).status).toBe('cancelled')
    t.clock.now += 10_000
    await runDueJobs(t.deps)
    expect(smsTo('+99365800305')).toEqual([])
  })

  it('a waiting request on a day that closes is declined, not cancelled; a client’s undo can’t bring a time back onto it', async () => {
    const maysa = await as(MAYSA)
    const was = (await maysa.req(HOURS)).json as Hours
    const client = await as('+99365800310', 'Client')
    const free = async () =>
      (
        (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${THU2}`)).json.slots as {
          start: number
        }[]
      ).map((x) => x.start)
    const starts = await free()
    const [first, second] = [starts[0]!, starts.at(-1)!]
    const request = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: maralId, date: THU2, start: first },
    })
    expect(request.json.status).toBe('pending')
    // another request, cancelled by the client a moment ago ("Yzyna al" would bring it back)
    const undone = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: maralId, date: THU2, start: second },
    })
    const cancelled = await client.req(`/v1/me/bookings/${undone.json.code}/cancel`, { body: {} })
    expect(cancelled.status, JSON.stringify(cancelled.json)).toBeLessThan(300)

    const closed = { ...was, specialDays: [...was.specialDays, { name: 'Flooding', from: THU2, to: THU2, yearly: false, hours: null }] }
    expect((await save(maysa, { ...closed, affected: 'cancel' })).json.cancelled).toBe(1)
    const row = await rowOf(request.json.code)
    expect(row).toMatchObject({
      status: 'cancelled',
      cancelledBy: 'business',
      declineReason: 'other',
      declineText: 'Flooding',
      businessCancelReason: null,
    })
    expect(row.answeredAt).not.toBeNull()
    expect(row.declineAlternatives).toHaveLength(3)
    expect((await client.req(`/v1/me/bookings/${request.json.code}`)).json.decline).toMatchObject({ reason: 'other', text: 'Flooding' })
    await runDueJobs(t.deps)
    expect(smsTo('+99365800310').at(-1)).toMatch(/can't take your booking .*: Flooding\. Pick another time/)

    // the undo of the client's own cancel: the day is closed now
    const back = await client.req(`/v1/me/bookings/${undone.json.code}/restore`, { method: 'POST' })
    expect(back.status).toBe(409)
    expect(back.json.error.code).toBe('slot_taken')
    expect((await save(maysa, { ...was, affected: 'keep' })).status).toBe(200)
  })

  it('a yearly day’s night is checked against every weekday it may fall on (Q-105)', async () => {
    const maysa = await as(MAYSA)
    const was = (await maysa.req(HOURS)).json as Hours
    // 20:00 until 10:00 the next morning: one that day runs into Monday's 09:00 opening, some year
    const night = { name: 'Long night', from: '2026-12-26', to: '2026-12-26', hours: { open: 1200, close: 2040 } }
    const yearly = await save(maysa, { ...was, specialDays: [...was.specialDays, { ...night, yearly: true }] })
    expect(yearly.status).toBe(400)
    expect(yearly.json.error.details.issues).toEqual([
      { path: ['specialDays', was.specialDays.length, 'hours'], code: 'overlaps_next_day' },
    ])
    // the same once, on a Saturday: Sunday opens at 10:00, so it fits
    expect((await save(maysa, { ...was, specialDays: [...was.specialDays, { ...night, yearly: false }] })).status).toBe(200)
    expect((await save(maysa, { ...was, affected: 'keep' })).status).toBe(200)
    // two yearly days: New Year's Eve until 03:00 runs into a 1 January that opens at 01:00
    const eve = { name: 'Eve', from: '2026-12-31', to: '2026-12-31', yearly: true, hours: { open: 1200, close: 1620 } }
    const newYear = { name: 'New Year', from: '2027-01-01', to: '2027-01-01', yearly: true, hours: { open: 60, close: 600 } }
    expect(
      (await save(maysa, { ...was, specialDays: [...was.specialDays.filter((d) => d.from !== '2026-01-01'), eve, newYear] })).status,
    ).toBe(400)
  })

  it('a client’s move onto a day that closed since can’t be confirmed', async () => {
    const maysa = await as(MAYSA)
    const was = (await maysa.req(HOURS)).json as Hours
    const client = await as('+99365800311', 'Client')
    const slotsOn = async (date: string) =>
      (
        (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${date}`)).json.slots as {
          start: number
        }[]
      ).map((x) => x.start)
    const made = await client.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'glow-studio',
        serviceIds: [manicure],
        staffId: maralId,
        date: FRI2,
        start: (await slotsOn(FRI2))[0],
      },
    })
    await maysa.req(`${W}/requests/${made.json.code}/confirm`, { method: 'POST' })
    expect(
      (await client.req(`/v1/me/bookings/${made.json.code}/reschedule`, { body: { date: MON3, start: (await slotsOn(MON3))[0] } })).status,
    ).toBeLessThan(300)
    // the move waits; the owner closes that Monday (the move isn't asked about)
    const closed = { ...was, specialDays: [...was.specialDays, { name: 'Training', from: MON3, to: MON3, yearly: false, hours: null }] }
    expect((await save(maysa, { ...closed, affected: 'cancel' })).status).toBe(200)
    const asked = ((await maysa.req(`${W}/requests`)).json.items as { code: string; kind: string }[]).find((r) => r.kind === 'move')!
    const confirm = await maysa.req(`${W}/requests/${asked.code}/confirm`, { method: 'POST' })
    expect(confirm.status).toBe(409)
    expect(confirm.json.error).toMatchObject({ code: 'cannot_move', details: { problem: 'outside_hours' } })
    expect((await save(maysa, { ...was, affected: 'keep' })).status).toBe(200)
  })
})
