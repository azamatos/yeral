/** SMS links to a booking (book Q-168, Q-169, F-068). */
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, rateLimits, services } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'
import { confirmBooking } from './confirm'
import { LINK_DAYS, newBookingLink } from './links'

const THU = '2026-10-15'
const tokenOf = (text: string | undefined) => /\/l\/([\w-]+)/.exec(text ?? '')?.[1] ?? ''

describe('SMS links', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let haircut: string
  let glowId: string

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    const [svc] = await db.select().from(services).where(eq(services.businessId, glowId)).limit(1)
    haircut = svc!.id
  })

  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })

  /** A confirmed booking of `phone` and the token from its "confirmed" SMS. */
  async function confirmedWithLink(phone: string) {
    const b = browser(t.app)
    await b.login(phone, 'Läle')
    const slots = (await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&date=${THU}`)).json.slots
    const made = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: null, date: THU, start: slots[0].start },
    })
    const [row] = await db.select().from(bookings).where(eq(bookings.code, made.json.code))
    await db.transaction((tx) => confirmBooking(tx, t.deps, row!))
    await runDueJobs(t.deps)
    const sms = t.sms.sent.filter((s) => s.to === phone).at(-1)?.text
    return { b, code: made.json.code as string, token: tokenOf(sms), sms }
  }

  it('the SMS carries a long random token, never the booking code', async () => {
    const { code, token, sms } = await confirmedWithLink('+99365444301')
    expect(token.length).toBeGreaterThanOrEqual(40)
    expect(sms).not.toContain(code)
    // the code opens nothing by itself
    expect((await browser(t.app).req(`/v1/links/${code}`)).status).not.toBe(200)
  })

  it('signed out, the link shows the booking card with the phone masked, and nothing private', async () => {
    const { code, token } = await confirmedWithLink('+99365444302')
    const page = await browser(t.app).req(`/v1/links/${token}`)
    expect(page.status).toBe(200)
    expect(page.json).toMatchObject({ code, status: 'confirmed', maskedPhone: '+993 65 •• •• 02', owner: false })
    expect(page.json).not.toHaveProperty('clientNote')
    expect(page.json).not.toHaveProperty('actions')
  })

  it('its owner signed in is told to open "Ýazylyşlarym"; someone else signed in gets the signed-out page (book Q-169)', async () => {
    const { b, token } = await confirmedWithLink('+99365444303')
    expect((await b.req(`/v1/links/${token}`)).json.owner).toBe(true)
    const other = browser(t.app)
    await other.login('+99365444304', 'Other')
    expect((await other.req(`/v1/links/${token}`)).json.owner).toBe(false)
  })

  it('an unknown or old link doesn’t work', async () => {
    const { token } = await confirmedWithLink('+99365444305')
    expect((await browser(t.app).req(`/v1/links/${'x'.repeat(43)}`)).status).toBe(404)
    t.clock.now += (LINK_DAYS + 1) * 86_400_000
    expect((await browser(t.app).req(`/v1/links/${token}`)).status).toBe(404)
  })

  it('the login sends the code only to the booking’s phone and signs in with it (book F-068)', async () => {
    // a phone booking the business made: no account yet
    const [row] = await db
      .insert(bookings)
      .values({
        code: 'YR-99301',
        businessId: glowId,
        type: 'appointment',
        date: THU,
        start: 1140,
        end: 1200,
        status: 'confirmed',
        source: 'phone',
        clientPhone: '+99365444306',
        clientName: 'Phone client',
      })
      .returning()
    const link = await newBookingLink(db, t.deps.site, row!.id, DEMO_NOW)
    const token = tokenOf(link)
    const visitor = browser(t.app)
    const sent = await visitor.req(`/v1/links/${token}/code`, { body: {} })
    expect(sent.status).toBe(200)
    expect(t.sms.sent.at(-1)?.to).toBe('+99365444306')
    const signedIn = await visitor.req(`/v1/links/${token}/verify`, { body: { code: '1234' } })
    expect(signedIn.json).toMatchObject({ me: { phone: '+99365444306' }, isNew: true })
    // the booking is theirs now: "my bookings" opens it
    expect((await visitor.req(`/v1/me/bookings/YR-99301`)).status).toBe(200)
    expect((await visitor.req(`/v1/links/${token}`)).json.owner).toBe(true)
  })
})
