/** Booking requests as the business answers them (book B-19, B-20, B-21; chapter 3, "Who answers"). */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, businesses, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MAYSA = '+99365102030' // owner of Glow Studio (and of its Parahat branch)
const SELBI = '+99365884102' // administrator
const AYNA = '+99365312210' // specialist
const REQUESTS = '/v1/w/glow-studio/requests'
const FRI = '2026-10-16'

interface Request {
  code: string
  kind: 'new' | 'move'
  holdUntil: number
  items: { staffId: string | null; staff: string | null; service: string }[]
  from: { date: string; start: number } | null
  client: { name: string; phone: string | null; visits: number; noShows: number }
  canAnswer: boolean
  answeredBy: string
}

describe('answering requests (book B-19, B-20, B-21)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let haircut: string
  let aynaId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [svc] = await db
      .select()
      .from(services)
      .where(
        and(eq(services.businessId, glow!.id), eq(services.name, { tk: 'Aýal saç kesimi', ru: 'Женская стрижка', en: "Women's haircut" })),
      )
    haircut = svc!.id
    const [ayna] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, glow!.id), eq(staff.name, 'Aýna')))
    aynaId = ayna!.id
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
  const aynaFree = async (b: ReturnType<typeof browser>) =>
    (
      (await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&staff=${aynaId}&date=${FRI}`)).json.slots as {
        start: number
      }[]
    ).map((s) => s.start)
  /** A client's new request with Aýna on Friday, the n-th free start from the end of the day. */
  const request = async (phone: string, n = 0) => {
    const client = await as(phone, 'Client')
    const starts = await aynaFree(client)
    const made = await client.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'glow-studio',
        serviceIds: [haircut],
        staffId: aynaId,
        date: FRI,
        start: starts[Math.max(0, starts.length - 1 - n)],
      },
    })
    expect(made.json.status).toBe('pending')
    return { client, code: made.json.code as string, start: made.json.start as number }
  }
  const listOf = async (b: ReturnType<typeof browser>) => (await b.req(REQUESTS)).json.items as Request[]

  it('the owner sees every waiting request, most urgent first, with the client and who answers; a specialist sees hers', async () => {
    const { code } = await request('+99365800001')
    const maysa = await as(MAYSA)
    const all = await listOf(maysa)
    expect(all.map((r) => r.holdUntil)).toEqual(all.map((r) => r.holdUntil).sort((a, b) => a - b))
    expect(all.find((r) => r.code === code)).toMatchObject({
      kind: 'new',
      from: null,
      client: { name: 'Client', phone: '+99365800001', visits: 0, noShows: 0 },
      items: [{ staffId: aynaId, staff: 'Aýna' }],
      canAnswer: true,
      answeredBy: 'anyone',
    })
    const ayna = await as(AYNA)
    const hers = await listOf(ayna)
    expect(hers.map((r) => r.code)).toContain(code)
    for (const r of hers) expect(r.items.some((i) => i.staffId === aynaId)).toBe(true)
    expect(hers.length).toBeLessThanOrEqual(all.length)
    // a specialist without the app: the desk answers
    const branch = (await maysa.req('/v1/w/glow-studio-parahat/requests')).json.items as Request[]
    expect(branch.length).toBeGreaterThan(0)
    for (const r of branch) expect(r).toMatchObject({ answeredBy: 'desk', canAnswer: true })
  })

  it('confirming a request: the client is confirmed and told; a second answer is refused', async () => {
    const { client, code } = await request('+99365800002', 2)
    const selbi = await as(SELBI)
    expect((await selbi.req(`${REQUESTS}/${code}/confirm`, { method: 'POST' })).status).toBe(204)
    expect((await client.req(`/v1/me/bookings/${code}`)).json.status).toBe('confirmed')
    await runDueJobs(t.deps)
    expect(t.sms.sent.filter((s) => s.to === '+99365800002').at(-1)?.text).toMatch(/Glow Studio/)
    expect((await listOf(selbi)).map((r) => r.code)).not.toContain(code)
    const again = await selbi.req(`${REQUESTS}/${code}/confirm`, { method: 'POST' })
    expect(again.status).toBe(409)
    expect(again.json.error.code).toBe('invalid_status')
  })

  it('declining with a reason and offered times: the client sees them, takes one, and the SMS says why (B-20)', async () => {
    const { client, code } = await request('+99365800003', 4)
    const maysa = await as(MAYSA)
    const offer = (await aynaFree(maysa))[0]!
    const declined = await maysa.req(`${REQUESTS}/${code}/decline`, {
      body: { reason: 'slot_busy', offers: [{ date: FRI, start: offer, staffId: aynaId }] },
    })
    expect(declined.status).toBe(204)
    const detail = (await client.req(`/v1/me/bookings/${code}`)).json
    expect(detail).toMatchObject({
      status: 'cancelled',
      cancelledBy: 'business',
      decline: { reason: 'slot_busy', text: null, alternatives: [{ date: FRI, start: offer, staff: { id: aynaId }, state: 'free' }] },
    })
    await runDueJobs(t.deps)
    expect(t.sms.sent.filter((s) => s.to === '+99365800003').at(-1)?.text).toMatch(/can't take your booking.*This time isn't free/)
    // a decline's offers, not a cancel's
    const asCancel = await client.req(`/v1/me/bookings/${code}/accept-alternative`, { body: { source: 'cancel', index: 0 } })
    expect(asCancel.json.error.code).toBe('invalid_status')
    const taken = await client.req(`/v1/me/bookings/${code}/accept-alternative`, { body: { source: 'decline', index: 0 } })
    expect(taken.json).toMatchObject({ status: 'confirmed', start: offer })
  })

  it('a decline is checked: "other" needs words, offers must be free, ahead and at most 3', async () => {
    const { code } = await request('+99365800004', 6)
    const maysa = await as(MAYSA)
    const decline = (body: object) => maysa.req(`${REQUESTS}/${code}/decline`, { body })
    expect((await decline({ reason: 'other' })).status).toBe(400)
    // a time another client just took with Aýna
    const { start: busy } = await request('+99365800014', 12)
    const free = await aynaFree(maysa)
    const taken = await decline({ reason: 'slot_busy', offers: [{ date: FRI, start: busy, staffId: aynaId }] })
    expect(taken.status).toBe(400)
    expect(taken.json.error.details.issues).toEqual([{ path: ['offers', 0], code: 'not_free' }])
    const past = await decline({ reason: 'slot_busy', offers: [{ date: '2026-10-14', start: 600, staffId: aynaId }] })
    expect(past.json.error.details.issues).toEqual([{ path: ['offers', 0], code: 'past' }])
    const four = free.slice(0, 4).map((start) => ({ date: FRI, start, staffId: aynaId }))
    expect((await decline({ reason: 'slot_busy', offers: four })).status).toBe(400)
    // still waiting after all that
    expect((await listOf(maysa)).map((r) => r.code)).toContain(code)
    // a paused business declines without offers: the client is told the reason and asked to call
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    await db.update(bookingRules).set({ onlineEnabled: false }).where(eq(bookingRules.businessId, glow!.id))
    try {
      expect((await decline({ reason: 'other', text: 'We close early that day' })).status).toBe(204)
      await runDueJobs(t.deps)
      expect(t.sms.sent.filter((s) => s.to === '+99365800004').at(-1)?.text).toMatch(/We close early that day\. Call them to book/)
    } finally {
      await db.update(bookingRules).set({ onlineEnabled: true }).where(eq(bookingRules.businessId, glow!.id))
    }
  })

  it('who answers: with "desk" a specialist only looks; the request expired is refused', async () => {
    const { code } = await request('+99365800005', 8)
    const maysa = await as(MAYSA)
    await maysa.req('/v1/w/glow-studio/settings/rules', { method: 'PATCH', body: { requestAnswerers: 'desk' } })
    try {
      const ayna = await as(AYNA)
      expect((await listOf(ayna)).find((r) => r.code === code)).toMatchObject({ canAnswer: false, answeredBy: 'desk' })
      expect((await ayna.req(`${REQUESTS}/${code}/confirm`, { method: 'POST' })).status).toBe(403)
    } finally {
      await maysa.req('/v1/w/glow-studio/settings/rules', { method: 'PATCH', body: { requestAnswerers: 'both' } })
    }
    t.clock.now += 31 * 60_000
    const late = await maysa.req(`${REQUESTS}/${code}/confirm`, { method: 'POST' })
    expect(late.json.error.code).toBe('request_expired')
  })

  it('a move request: declining keeps the booking with the reason told; confirming moves it (B-21)', async () => {
    const { client, code, start } = await request('+99365800006', 10)
    const maysa = await as(MAYSA)
    await maysa.req(`${REQUESTS}/${code}/confirm`, { method: 'POST' })
    const to = (await aynaFree(client)).find((s) => s !== start)!
    const asked = await client.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: FRI, start: to } })
    expect(asked.status, JSON.stringify(asked.json)).toBeLessThan(300)
    const move = (await listOf(maysa)).find((r) => r.kind === 'move' && r.from?.start === start)!
    expect(move).toMatchObject({ from: { date: FRI, start }, items: [{ staffId: aynaId }] })
    // no offered times for a move
    expect(
      (
        await maysa.req(`${REQUESTS}/${move.code}/decline`, {
          body: { reason: 'slot_busy', offers: [{ date: FRI, start: to, staffId: aynaId }] },
        })
      ).status,
    ).toBe(400)
    expect((await maysa.req(`${REQUESTS}/${move.code}/decline`, { body: { reason: 'no_staff' } })).status).toBe(204)
    const kept = (await client.req(`/v1/me/bookings/${code}`)).json
    expect(kept).toMatchObject({ status: 'confirmed', start, moveRefused: { by: 'business', reason: 'no_staff' } })
    await runDueJobs(t.deps)
    expect(t.sms.sent.filter((s) => s.to === '+99365800006').at(-1)?.text).toMatch(
      /didn't accept the new time: No specialist available\. Your booking stays/,
    )

    expect((await client.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: FRI, start: to } })).status).toBeLessThan(300)
    const again = (await listOf(maysa)).find((r) => r.kind === 'move' && r.from?.start === start)!
    expect((await maysa.req(`${REQUESTS}/${again.code}/confirm`, { method: 'POST' })).status).toBe(204)
    expect((await client.req(`/v1/me/bookings/${code}`)).json).toMatchObject({ status: 'confirmed', start: to })
  })
})
