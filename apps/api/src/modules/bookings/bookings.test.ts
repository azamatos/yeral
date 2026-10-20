import { epochOf } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, bookings, businesses, classSessions, jobs, rateLimits, services, staff, users } from '../../db/schema'
import { seed } from '../../db/seed'
import { emit } from '../../notify'
import { runDueJobs } from '../jobs/run'
import { confirmBooking } from './confirm'
import { isSlotConflict, setStatus, StaleBooking } from './repo'

const MIN = 60_000
const THU = '2026-10-15'

describe('client bookings', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  const svc: Record<string, string> = {}
  const who: Record<string, string> = {}

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    for (const s of await db.select().from(services)) svc[`${s.name.tk}`] ??= s.id
    for (const s of await db.select().from(staff)) who[s.name] ??= s.id
    const [barber] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    for (const s of await db.select().from(services).where(eq(services.businessId, barber!.id))) svc[`barber:${s.name.tk}`] = s.id
  })

  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })

  const glow = (start: number, extra: Record<string, unknown> = {}) => ({
    type: 'appointment',
    business: 'glow-studio',
    serviceIds: [svc['Aýal saç kesimi']],
    staffId: null,
    date: THU,
    start,
    ...extra,
  })

  // first: later tests move the clock and the jobs settle the seeded requests
  it('Aýjemal sees her demo bookings, the request YR-48213 first', async () => {
    const b = browser(t.app)
    await b.login('+99365901122')
    const upcoming = await b.req('/v1/me/bookings?tab=upcoming')
    expect(upcoming.json.items.map((x: { code: string; status: string }) => [x.code, x.status])).toEqual([
      ['YR-48213', 'pending'],
      ['YR-47990', 'confirmed'],
      ['YR-47702', 'confirmed'],
    ])
    const past = await b.req('/v1/me/bookings?tab=past')
    const demo = ['YR-46511', 'YR-45320', 'YR-44987', 'YR-44650', 'YR-43108']
    // newest first; her Glow Studio visits from the client list sit in between
    expect(past.json.items.map((x: { code: string }) => x.code).filter((c: string) => demo.includes(c))).toEqual(demo)
    const ojak = await b.req('/v1/me/bookings/YR-44650')
    expect(ojak.json).toMatchObject({ status: 'cancelled', cancelledBy: 'business', cancelReason: 'Şol gün ýapyk' })
  })

  it('a class: seats under a lock; full sessions refuse', async () => {
    const b = browser(t.app)
    await b.login('+99365111009', 'Aýna')
    const [yoga] = await db.select().from(businesses).where(eq(businesses.slug, 'aydyn-yoga'))
    const sessions = await db.select().from(classSessions).where(eq(classSessions.businessId, yoga!.id))
    const thuMorning = sessions.find((s) => s.date === THU && s.start === 480)!
    const ok = await b.req('/v1/bookings', { body: { type: 'class', business: 'aydyn-yoga', sessionId: thuMorning.id, seats: 2 } })
    expect(ok.json).toMatchObject({
      status: 'confirmed',
      what: { type: 'class', session: 'Morning flow', trainer: 'Aýgözel', seats: 2 },
      price: { amount: 90 },
    })
    const full = sessions.find((s) => s.date === '2026-10-14' && s.start === 1200)!
    const refused = await b.req('/v1/bookings', { body: { type: 'class', business: 'aydyn-yoga', sessionId: full.id, seats: 1 } })
    expect(refused.json.error?.code, JSON.stringify(refused.json)).toBe('session_full')
  })

  it('needs a signed-in person', async () => {
    expect((await browser(t.app).req('/v1/bookings', { body: glow(600) })).status).toBe(401)
  })

  it('sends a request: pending, held for the business’s hold time, no SMS yet', async () => {
    const b = browser(t.app)
    await b.login('+99365111001', 'Ogulgerek Saparowa')
    const res = await b.req('/v1/bookings', { body: glow(600, { note: 'Uzyn saç' }) })
    expect(res.status).toBe(201)
    expect(res.json).toMatchObject({
      status: 'pending',
      business: { slug: 'glow-studio', name: 'Glow Studio', category: 'Beauty salon' },
      what: { type: 'appointment', items: [{ service: "Women's haircut", staff: 'Aýna', start: 600, end: 660 }] },
      price: { type: 'fixed', amount: 80 },
      holdUntil: DEMO_NOW + 30 * MIN,
      clientNote: 'Uzyn saç',
      timeline: [{ event: 'sent', at: DEMO_NOW }],
      actions: { cancel: true, reschedule: false, editNote: true },
    })
    // the type is `what.type` only
    expect(res.json).not.toHaveProperty('type')
    expect(res.json.code).toMatch(/^YR-\d{5}$/)
    const list = await b.req('/v1/me/bookings?tab=upcoming')
    expect(list.json.items.map((x: { code: string }) => x.code)).toEqual([res.json.code])
    expect(t.sms.sent.filter((s) => s.to === '+99365111001')).toHaveLength(1) // the login code only
  })

  it('a request sent after closing holds from the next opening (book Q-120)', async () => {
    // Wednesday 21:00: Glow Studio (09:00–20:00) is closed until Thursday 09:00
    const late = testApp(db, { now: epochOf('2026-10-14', 1260) })
    const b = browser(late.app)
    await b.login('+99365111030', 'Late')
    const res = await b.req('/v1/bookings', { body: glow(600, { date: '2026-10-16' }) })
    expect(res.status).toBe(201)
    expect(res.json.holdUntil).toBe(epochOf(THU, 540 + 30))
  })

  it('a taken time answers 409 with the three nearest free times', async () => {
    const first = browser(t.app)
    await first.login('+99365111002', 'Aýgul')
    expect((await first.req('/v1/bookings', { body: glow(690, { staffId: who['Aýna'] }) })).status).toBe(201)
    const second = browser(t.app)
    await second.login('+99365111003', 'Jeren')
    const res = await second.req('/v1/bookings', { body: glow(690, { staffId: who['Aýna'] }) })
    expect(res.status).toBe(409)
    expect(res.json.error.code).toBe('slot_taken')
    expect(res.json.error.details.alternatives).toHaveLength(3)
    expect(res.json.error.details.alternatives[0]).toMatchObject({ date: THU })
  })

  it('cancel, then "Yzyna al" within minutes', async () => {
    const b = browser(t.app)
    await b.login('+99365111004', 'Bahar')
    const { json } = await b.req('/v1/bookings', { body: glow(960) })
    const cancelled = await b.req(`/v1/me/bookings/${json.code}/cancel`, { body: { reason: 'Wagtym ýok' } })
    expect(cancelled.json).toMatchObject({
      status: 'cancelled',
      cancelledBy: 'client',
      cancelReason: 'Wagtym ýok',
      actions: { restore: true },
    })
    const restored = await b.req(`/v1/me/bookings/${json.code}/restore`, { method: 'POST' })
    expect(restored.json).toMatchObject({ status: 'pending', cancelledBy: null })
    await b.req(`/v1/me/bookings/${json.code}/cancel`, { body: {} })
    t.clock.now += 6 * MIN
    expect((await b.req(`/v1/me/bookings/${json.code}/restore`, { method: 'POST' })).json.error.code).toBe('restore_expired')
  })

  it('an instant business confirms at once and sends the confirmation SMS', async () => {
    const b = browser(t.app)
    await b.login('+99365111005', 'Merdan')
    const res = await b.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'barber-loft',
        serviceIds: [svc['barber:Erkek saç kesimi']],
        staffId: null,
        date: THU,
        start: 660,
      },
    })
    expect(res.json).toMatchObject({ status: 'confirmed', price: { type: 'from', amount: 40 } })
    await runDueJobs(t.deps)
    // the link carries a token of its own, never the booking code (book Q-168)
    expect(t.sms.sent.at(-1)).toMatchObject({ to: '+99365111005' })
    expect(t.sms.sent.at(-1)?.text).toMatch(
      /^Ýeral: Barber Loft confirmed your booking\. Thursday, 15 October, 11:00\. Change: localhost:3001\/l\/[\w-]{20,}$/,
    )
    // reminders are queued for later
    const queued = await db.select().from(jobs).where(eq(jobs.kind, 'booking.sms'))
    // the day-before reminder would be in the past already (booked at 11:20 for tomorrow 11:00)
    expect(queued.map((j) => j.payload.kind)).toEqual(expect.arrayContaining(['confirmed', 'reminder2h']))
    // no review ask (book Q-259)
    expect(queued.map((j) => j.payload.kind)).not.toContain('reviewAsk')
    expect(queued.map((j) => j.payload.kind)).not.toContain('reminderDay')
  })

  it('an unanswered request expires after the hold time with three other times', async () => {
    const b = browser(t.app)
    await b.login('+99365111006', 'Läle')
    const { json } = await b.req('/v1/bookings', { body: glow(1020) })
    t.clock.now += 31 * MIN
    expect((await runDueJobs(t.deps)).expired).toBeGreaterThan(0)
    const detail = await b.req(`/v1/me/bookings/${json.code}`)
    expect(detail.json).toMatchObject({ status: 'cancelled', cancelledBy: 'system' })
    expect(detail.json.timeline.at(-1).event).toBe('expired')
    expect(detail.json.expiredAlternatives).toHaveLength(3)
    // in the market's main language: this client never chose one (book Q-292)
    expect(t.sms.sent.at(-1)?.text).toMatch(/^Ýeral: Glow Studio didn't answer in time\. Free times: .+ — localhost:3001\/l\/[\w-]{20,}$/)
    // picking one of them sends a new request
    const again = await b.req(`/v1/me/bookings/${json.code}/accept-alternative`, { body: { source: 'expired', index: 0 } })
    expect(again.json).toMatchObject({ status: 'pending' })
    expect(again.json.code).not.toBe(json.code)
  })

  it('a finished visit is completed by the jobs and can be reviewed once', async () => {
    const b = browser(t.app)
    await b.login('+99365111007', 'Sona Pirliýewa')
    const { json } = await b.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'barber-loft',
        serviceIds: [svc['barber:Sakgal düzediş']],
        staffId: null,
        date: THU,
        start: 720,
      },
    })
    t.clock.now = epochOf(THU, json.end) + MIN
    await runDueJobs(t.deps)
    const done = await b.req(`/v1/me/bookings/${json.code}`)
    expect(done.json).toMatchObject({ status: 'completed', actions: { review: true, bookAgain: true } })
    const [before] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    const reviewed = await b.req(`/v1/me/bookings/${json.code}/review`, { body: { rating: 4, text: 'Gowy' } })
    expect(reviewed.json).toMatchObject({ review: { rating: 4, text: 'Gowy' }, actions: { review: false, editReview: true } })
    const [after] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    expect(after!.reviewsCount).toBe(before!.reviewsCount + 1)
    expect((await b.req(`/v1/me/bookings/${json.code}/review`, { body: { rating: 5 } })).json.error.code).toBe('review_exists')
    const reviews = await b.req('/v1/businesses/barber-loft/reviews')
    expect(reviews.json.items[0]).toMatchObject({ author: 'Sona P.', rating: 4, what: 'Beard trim · Merdan' })
    const inRussian = await b.req('/v1/businesses/barber-loft/reviews?lang=ru')
    expect(inRussian.json.items[0]).toMatchObject({ what: 'Оформление бороды · Merdan' })
    t.clock.now += 8 * 86_400_000
    expect((await b.req(`/v1/me/bookings/${json.code}/review`, { method: 'PATCH', body: { rating: 5 } })).json.error.code).toBe(
      'review_locked',
    )
  })

  it('a table: the smallest free table in the area', async () => {
    const b = browser(t.app)
    await b.login('+99365111008', 'Gözel')
    const detail = await b.req('/v1/businesses/bag-kafe')
    const terrace = detail.json.tables.areas.find((a: { name: string }) => a.name === 'Terrace')
    const res = await b.req('/v1/bookings', {
      body: { type: 'table', business: 'bag-kafe', partySize: 3, areaId: terrace.id, date: THU, start: 1140, requests: ['Doglan gün'] },
    })
    expect(res.status).toBe(201)
    expect(res.json).toMatchObject({
      status: 'pending',
      what: { type: 'table', partySize: 3, area: 'Terrace', requests: ['Doglan gün'] },
      price: null,
    })
    const [row] = await db.select().from(bookings).where(eq(bookings.code, res.json.code))
    expect(row!.tableId).not.toBeNull()
  })

  it('a table for 9 or more: book by phone (party_too_large)', async () => {
    const b = browser(t.app)
    await b.login('+99365111019', 'Aýna')
    const detail = await b.req('/v1/businesses/bag-kafe')
    const hall = detail.json.tables.areas[0]
    const res = await b.req('/v1/bookings', {
      body: { type: 'table', business: 'bag-kafe', partySize: 9, areaId: hall.id, date: THU, start: 1140 },
    })
    expect(res.status).toBe(400)
    expect(res.json.error).toEqual({ code: 'party_too_large', details: { callFrom: 9 } })
  })

  it('a client with repeated no-shows can book only by phone', async () => {
    const b = browser(t.app)
    await b.login('+99362186005') // Ogulnabat Ç.: two no-shows at Glow Studio
    const res = await b.req('/v1/bookings', { body: glow(600) })
    expect(res.status).toBe(403)
    expect(res.json.error.code).toBe('online_blocked')
  })

  it('moving a confirmed booking is a request; the business’s yes moves it', async () => {
    const b = browser(t.app)
    await b.login('+99365111010', 'Jahan')
    const { json } = await b.req('/v1/bookings', { body: glow(1080, { staffId: who['Aýna'], date: '2026-10-16' }) })
    const [row] = await db.select().from(bookings).where(eq(bookings.code, json.code))
    await db.transaction((tx) => confirmBooking(tx, t.deps, row!))
    const asked = await b.req(`/v1/me/bookings/${json.code}/reschedule`, { body: { date: '2026-10-17', start: 600 } })
    expect(asked.json).toMatchObject({
      status: 'confirmed',
      date: '2026-10-16',
      start: 1080,
      reschedule: { date: '2026-10-17', start: 600 },
      // a second move may replace this one (ROUND6 A3)
      actions: { reschedule: true },
    })
    const [request] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.rescheduleOf, row!.id), eq(bookings.status, 'pending')))
    await db.transaction((tx) => confirmBooking(tx, t.deps, request!))
    const moved = await b.req(`/v1/me/bookings/${json.code}`)
    expect(moved.json).toMatchObject({ status: 'confirmed', date: '2026-10-17', start: 600, reschedule: null })
    expect((await b.req('/v1/me/bookings?tab=upcoming')).json.items.filter((x: { code: string }) => x.code === json.code)).toHaveLength(1)
  })

  it('confirmed bookings can’t be cancelled inside the cancellation window', async () => {
    const b = browser(t.app)
    await b.login('+99365111011', 'Döwlet')
    const { json } = await b.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'barber-loft',
        serviceIds: [svc['barber:Sakgal düzediş']],
        staffId: null,
        date: THU,
        start: 900,
      },
    })
    t.clock.now = epochOf(THU, 900) - 90 * MIN
    const res = await b.req(`/v1/me/bookings/${json.code}/cancel`, { body: {} })
    expect(res.json.error.code).toBe('cancel_window_passed')
    expect((await b.req(`/v1/me/bookings/${json.code}`)).json.actions).toMatchObject({ cancel: false, callOnly: true })
  })

  it('demo businesses without a team answer requests by themselves', async () => {
    const b = browser(t.app)
    await b.login('+99365111012', 'Arslan')
    const { json } = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'ak-dis', serviceIds: [svc['Barlag']], staffId: null, date: THU, start: 600 },
    })
    expect(json.status).toBe('pending')
    t.clock.now += 30_000
    await runDueJobs(t.deps)
    expect((await b.req(`/v1/me/bookings/${json.code}`)).json.status).toBe('confirmed')
  })

  const freeStarts = async (b: ReturnType<typeof browser>, date: string, staffId: string) =>
    (
      await b.req(`/v1/businesses/glow-studio/availability?services=${svc['Aýal saç kesimi']}&staff=${staffId}&date=${date}`)
    ).json.slots.map((x: { start: number }) => x.start) as number[]

  it('an offered time makes one booking, and only when the business still takes online requests', async () => {
    const b = browser(t.app)
    await b.login('+99365111013', 'Gözel')
    const { json } = await b.req('/v1/bookings', { body: glow(1110) })
    t.clock.now += 31 * MIN
    await runDueJobs(t.deps)
    const [glowRow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    await db.update(bookingRules).set({ onlineEnabled: false }).where(eq(bookingRules.businessId, glowRow!.id))
    const off = await b.req(`/v1/me/bookings/${json.code}/accept-alternative`, { body: { source: 'expired', index: 0 } })
    await db.update(bookingRules).set({ onlineEnabled: true }).where(eq(bookingRules.businessId, glowRow!.id))
    expect(off.json.error?.code).toBe('online_disabled')
    const tries = await Promise.all(
      [0, 1].map((index) => b.req(`/v1/me/bookings/${json.code}/accept-alternative`, { body: { source: 'expired', index } })),
    )
    expect(tries.filter((r) => r.status < 300)).toHaveLength(1)
    const again = await b.req(`/v1/me/bookings/${json.code}/accept-alternative`, { body: { source: 'expired', index: 2 } })
    expect(again.json.error?.code).toBe('invalid_status')
  })

  it('a request whose hold just ran out keeps its time until the jobs expire it', async () => {
    const b = browser(t.app)
    await b.login('+99365111014', 'Maral')
    const ayna = who['Aýna']!
    const start = (await freeStarts(b, THU, ayna)).at(-1)!
    expect((await b.req('/v1/bookings', { body: glow(start, { staffId: ayna }) })).status).toBe(201)
    t.clock.now += 31 * MIN
    expect(await freeStarts(b, THU, ayna)).not.toContain(start)
    const other = browser(t.app)
    await other.login('+99365111015', 'Ogulşat')
    const taken = await other.req('/v1/bookings', { body: glow(start, { staffId: ayna }) })
    expect(taken.json.error?.code).toBe('slot_taken')
    expect(taken.json.error.details.alternatives.map((x: { start: number }) => x.start)).not.toContain(start)
    await runDueJobs(t.deps)
    expect(await freeStarts(b, THU, ayna)).toContain(start)
  })

  it('a moved booking’s old reminders stay quiet', async () => {
    const b = browser(t.app)
    const phone = '+99365111016'
    await b.login(phone, 'Kerim')
    const barber = { type: 'appointment', business: 'barber-loft', serviceIds: [svc['barber:Erkek saç kesimi']], staffId: null }
    const { json } = await b.req('/v1/bookings', { body: { ...barber, date: THU, start: 720 } })
    expect(json.status).toBe('confirmed')
    const moved = await b.req(`/v1/me/bookings/${json.code}/reschedule`, { body: { date: '2026-10-16', start: 720 } })
    expect(moved.json).toMatchObject({ status: 'confirmed', date: '2026-10-16', start: 720 })
    await runDueJobs(t.deps) // the two "confirmed" SMS
    const sent = t.sms.sent.filter((x) => x.to === phone).length
    // Thursday 10:01: the old 2-hour and day-before reminders are due, the new ones aren't
    t.clock.now = epochOf(THU, 601)
    await runDueJobs(t.deps)
    expect(t.sms.sent.filter((x) => x.to === phone)).toHaveLength(sent)
  })

  it('a failed move keeps the earlier move request', async () => {
    const b = browser(t.app)
    await b.login('+99365111017', 'Aksoltan')
    const ayna = who['Aýna']!
    const FRI = '2026-10-16'
    const starts = await freeStarts(b, FRI, ayna)
    const first = starts[0]!
    const x = starts.find((m) => m >= first + 120)!
    const y = starts.find((m) => m >= x + 120)!
    const { json } = await b.req('/v1/bookings', { body: glow(first, { staffId: ayna, date: FRI }) })
    const [row] = await db.select().from(bookings).where(eq(bookings.code, json.code))
    await db.transaction((tx) => confirmBooking(tx, t.deps, row!))
    expect((await b.req(`/v1/me/bookings/${json.code}/reschedule`, { body: { date: FRI, start: x, staffId: ayna } })).status).toBe(200)
    const other = browser(t.app)
    await other.login('+99365111018', 'Bägül')
    expect((await other.req('/v1/bookings', { body: glow(y, { staffId: ayna, date: FRI }) })).status).toBe(201)
    const refused = await b.req(`/v1/me/bookings/${json.code}/reschedule`, { body: { date: FRI, start: y, staffId: ayna } })
    expect(refused.json.error?.code).toBe('slot_taken')
    expect((await b.req(`/v1/me/bookings/${json.code}`)).json.reschedule).toMatchObject({ date: FRI, start: x })
  })

  it('"Yzyna al" for a class counts the seats again', async () => {
    const b = browser(t.app)
    await b.login('+99365111019', 'Leýli')
    const [yoga] = await db.select().from(businesses).where(eq(businesses.slug, 'aydyn-yoga'))
    const sessions = await db.select().from(classSessions).where(eq(classSessions.businessId, yoga!.id))
    const session = sessions.find((x) => x.date === '2026-10-16')!
    const { json } = await b.req('/v1/bookings', { body: { type: 'class', business: 'aydyn-yoga', sessionId: session.id, seats: 1 } })
    await b.req(`/v1/me/bookings/${json.code}/cancel`, { body: {} })
    // the seat went to someone else meanwhile: the session is full without it
    const others = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.sessionId, session.id), eq(bookings.active, true)))
    await db
      .update(classSessions)
      .set({ capacity: others.reduce((n, x) => n + (x.seats ?? 0), 0) })
      .where(eq(classSessions.id, session.id))
    const restored = await b.req(`/v1/me/bookings/${json.code}/restore`, { method: 'POST' })
    await db.update(classSessions).set({ capacity: session.capacity }).where(eq(classSessions.id, session.id))
    expect(restored.json.error?.code).toBe('session_full')
  })

  it('a status change from a stale read is refused', async () => {
    const b = browser(t.app)
    await b.login('+99365111020', 'Myrat')
    const start = (await freeStarts(b, '2026-10-16', who['Aýna']!)).at(-1)!
    const { json } = await b.req('/v1/bookings', { body: glow(start, { staffId: who['Aýna'], date: '2026-10-16' }) })
    const [stale] = await db.select().from(bookings).where(eq(bookings.code, json.code))
    await db.transaction((tx) => confirmBooking(tx, t.deps, stale!))
    await expect(setStatus(db, stale!, { status: 'cancelled', cancelledBy: 'system', at: new Date(t.clock.now) })).rejects.toBeInstanceOf(
      StaleBooking,
    )
    expect((await b.req(`/v1/me/bookings/${json.code}`)).json.status).toBe('confirmed')
  })

  it('a status changed anywhere frees or takes its time: the database keeps `active`', async () => {
    const b = browser(t.app)
    await b.login('+99365111022', 'Gülşat')
    const ayna = who['Aýna']!
    const SAT = '2026-10-17'
    const start = (await freeStarts(b, SAT, ayna))[0]!
    const { json } = await b.req('/v1/bookings', { body: glow(start, { staffId: ayna, date: SAT }) })
    await db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.code, json.code))
    const other = browser(t.app)
    await other.login('+99365111023', 'Jemile')
    expect((await other.req('/v1/bookings', { body: glow(start, { staffId: ayna, date: SAT }) })).status).toBe(201)
    // back to a request: the specialist would be booked twice, which Postgres refuses
    const twice = await db
      .update(bookings)
      .set({ status: 'pending' })
      .where(eq(bookings.code, json.code))
      .then(
        () => null,
        (e: unknown) => e,
      )
    expect(isSlotConflict(twice)).toBe(true)
  })

  it('events: a cursor never passes an event that commits late', async () => {
    const b = browser(t.app)
    const phone = '+99365111021'
    await b.login(phone, 'Batyr')
    const [user] = await db.select().from(users).where(eq(users.phone, phone))
    const mine = { type: 'booking.updated' as const, businessId: null, userId: user!.id }
    const { cursor } = (await b.req('/v1/events')).json
    let release!: () => void
    let written!: () => void
    const inserted = new Promise<void>((r) => (written = r))
    const slow = db.transaction(async (tx) => {
      await emit(tx, { ...mine, bookingCode: 'YR-SLOW' })
      written()
      await new Promise<void>((r) => (release = r))
    })
    await inserted
    await emit(db, { ...mine, bookingCode: 'YR-FAST' })
    expect((await b.req(`/v1/events?after=${cursor}`)).json.items).toEqual([])
    release()
    await slow
    const res = await eventsAfter(b, cursor, (items) => items.length >= 2)
    expect(res.json.items.map((e: { bookingCode: string }) => e.bookingCode)).toEqual(['YR-SLOW', 'YR-FAST'])
    expect((await b.req(`/v1/events?after=${res.json.cursor}`)).json.items).toEqual([])
  })
})
