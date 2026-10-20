/** SMS links to a booking (book Q-168, Q-169, F-068). */
import { epochOf } from '@yeral/domain/time'
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookingLinks, bookingRules, bookings, businesses, jobs, rateLimits, services } from '../../db/schema'
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
    expect(token.length).toBeGreaterThanOrEqual(20)
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
    // the visit is on the 15th: its link ends 90 days after it
    t.clock.now = epochOf(THU, 1440) + (LINK_DAYS + 1) * 86_400_000
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
    await db.insert(bookingItems).values({
      bookingId: row!.id,
      serviceId: haircut,
      serviceName: { en: "Women's haircut" },
      date: THU,
      start: 1140,
      end: 1200,
      priceType: 'fixed',
      priceAmount: 80,
    })
    const link = await newBookingLink(db, t.deps.site, row!, DEMO_NOW)
    const token = tokenOf(link.url)
    const visitor = browser(t.app)
    const sent = await visitor.req(`/v1/links/${token}/code`, { body: {} })
    expect(sent.status).toBe(200)
    expect(t.sms.sent.at(-1)?.to).toBe('+99365444306')
    const signedIn = await visitor.req(`/v1/links/${token}/verify`, { body: { code: '1234' } })
    expect(signedIn.json).toMatchObject({ me: { phone: '+99365444306' }, isNew: true })
    // the booking is theirs now: "my bookings" opens it
    expect((await visitor.req(`/v1/me/bookings/YR-99301`)).status).toBe(200)
    const after = await visitor.req(`/v1/links/${token}`)
    expect(after.json, JSON.stringify(after.json)).toMatchObject({ owner: true })
  })

  it('no stored row holds a working link: queued texts are made when they are sent', async () => {
    const b = browser(t.app)
    await b.login('+99365444307', 'Läle')
    const slots = (await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&date=${THU}`)).json.slots
    await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: null, date: THU, start: slots[0].start },
    })
    t.clock.now += 31 * 60_000
    await runDueJobs(t.deps)
    // the expiry SMS went with a link
    expect(tokenOf(t.sms.sent.filter((s) => s.to === '+99365444307').at(-1)?.text)).not.toBe('')
    const stored = await db.select({ payload: jobs.payload }).from(jobs)
    expect(JSON.stringify(stored)).not.toContain('/l/')
  })

  it('a link works until 90 days after the visit, however far ahead it is', async () => {
    const [row] = await db
      .insert(bookings)
      .values({
        code: 'YR-99302',
        businessId: glowId,
        type: 'appointment',
        date: '2027-04-01',
        start: 600,
        end: 660,
        status: 'confirmed',
        source: 'phone',
        clientPhone: '+99365444308',
      })
      .returning()
    const link = await newBookingLink(db, t.deps.site, row!, DEMO_NOW)
    const [stored] = await db.select().from(bookingLinks).where(eq(bookingLinks.tokenHash, link.tokenHash))
    expect(stored!.expiresAt.getTime()).toBe(epochOf('2027-04-01', 660) + LINK_DAYS * 86_400_000)
  })

  it('a cut-off or made-up link is just not found', async () => {
    expect((await browser(t.app).req('/v1/links/abc')).status).toBe(404)
    expect((await browser(t.app).req('/v1/links/YR-48213')).status).toBe(404)
  })

  it('deleting the account stops its links: whoever gets the number next can’t open them', async () => {
    const { b, token, code } = await confirmedWithLink('+99365444309')
    expect((await b.req('/v1/me', { method: 'DELETE' })).status).toBe(204)
    expect((await browser(t.app).req(`/v1/links/${token}`)).status).toBe(404)
    // the next holder of the number signs in: none of it is theirs
    const next = browser(t.app)
    await next.login('+99365444309', 'Someone else')
    expect((await next.req(`/v1/me/bookings/${code}`)).status).toBe(404)
    const past = (await next.req('/v1/me/bookings?tab=past')).json.items
    expect(past.map((x: { code: string }) => x.code)).not.toContain(code)
  })

  it('a phone change moves the bookings ahead to the new number and ends the old links', async () => {
    const { b, code, token } = await confirmedWithLink('+99365444311')
    expect((await b.req('/v1/me/phone/code', { body: { phone: '+99365444312' } })).status).toBe(200)
    expect((await b.req('/v1/me/phone/verify', { body: { phone: '+99365444312', code: '1234' } })).status).toBe(200)
    const [row] = await db.select().from(bookings).where(eq(bookings.code, code))
    expect(row!.clientPhone).toBe('+99365444312')
    expect((await browser(t.app).req(`/v1/links/${token}`)).status).toBe(404)
  })

  it('a paused business’s expiry SMS offers no times: the page wouldn’t either (book Q-154)', async () => {
    const b = browser(t.app)
    await b.login('+99365444313', 'Läle')
    const slots = (await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&date=${THU}`)).json.slots
    await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [haircut], staffId: null, date: THU, start: slots[0].start },
    })
    await db.update(bookingRules).set({ onlineEnabled: false }).where(eq(bookingRules.businessId, glowId))
    try {
      t.clock.now += 31 * 60_000
      await runDueJobs(t.deps)
      expect(t.sms.sent.filter((s) => s.to === '+99365444313').at(-1)?.text).toMatch(/Pick another time/)
    } finally {
      await db.update(bookingRules).set({ onlineEnabled: true }).where(eq(bookingRules.businessId, glowId))
    }
  })

  it('a finished visit says whether it can still be reviewed (book Q-170)', async () => {
    const { token } = await confirmedWithLink('+99365444310')
    expect((await browser(t.app).req(`/v1/links/${token}`)).json.canReview).toBe(false)
  })

  it('a confirmed move keeps the links working until 90 days after the new visit', async () => {
    const { b, code, token } = await confirmedWithLink('+99365444314')
    const later = '2026-11-12'
    const slots = (await b.req(`/v1/businesses/glow-studio/availability?services=${haircut}&staff=any&date=${later}&move=${code}`)).json
      .slots
    await b.req(`/v1/me/bookings/${code}/reschedule`, { body: { date: later, start: slots[0].start, staffId: null } })
    const [orig] = await db.select().from(bookings).where(eq(bookings.code, code))
    const [move] = await db.select().from(bookings).where(eq(bookings.rescheduleOf, orig!.id))
    await db.transaction((tx) => confirmBooking(tx, t.deps, move!))
    const [link] = await db.select().from(bookingLinks).where(eq(bookingLinks.bookingId, orig!.id))
    expect(link!.expiresAt.getTime()).toBe(epochOf(later, move!.end) + LINK_DAYS * 86_400_000)
    expect((await browser(t.app).req(`/v1/links/${token}`)).json.date).toBe(later)
  })
})
