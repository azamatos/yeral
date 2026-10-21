/**
 * The business app's demo workspace (book F-242): the jobs make it, it's nobody's page, its numbers are nobody's and
 * join no account, it sends no SMS, and every night after 04:00 it's made again, the demo accounts staying and put back.
 */
import { MARKET } from '@yeral/domain/market'
import { isUnusedNumber } from '@yeral/domain/phone'
import { epochOf } from '@yeral/domain/time'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, bookings, businesses, clients, invites, jobs, reviews, services, sessions, staff, users } from '../../db/schema'
import { demoPhones, SANDBOX_SLUG, seed, seedSandbox } from '../../db/seed'
import { randomToken, sha256Hex } from '../../lib/crypto'
import { adminBusinesses } from '../admin/businesses'
import { adminReviews } from '../admin/reviews'
import { phoneClient } from '../calendar/repo'
import { runDueJobs } from '../jobs/run'
import { lastRemakeAt } from './sandbox'

const UNUSED = `+${MARKET.phone.countryCode}${MARKET.phone.unusedPrefix}`
/** Glow Studio's owner, Maýsa, as the demo workspace has her: a demo account. */
const MAYSA = demoPhones()('+99365102030')
const AYJEMAL = '+99365901122' // development's demo client: a real account here
const HOUR = 3_600_000

describe('the business app’s demo workspace (book F-242)', () => {
  let db: Db
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })
  const sandbox = () => db.select().from(businesses).where(eq(businesses.sandbox, true))
  const ownerOf = async (businessId: string) =>
    (
      await db
        .select()
        .from(staff)
        .where(and(eq(staff.businessId, businessId), eq(staff.level, 'owner')))
    )[0]!
  /** A session in the demo owner's account, as "Try the business app" will give one (the sign-in takes no 69 number). */
  const asDemoOwner = async (t: ReturnType<typeof testApp>) => {
    const [demo] = await sandbox()
    const token = randomToken()
    await db.insert(sessions).values({
      userId: (await ownerOf(demo!.id)).userId!,
      tokenHash: await sha256Hex(token),
      expiresAt: new Date(DEMO_NOW + 30 * 24 * HOUR),
    })
    const b = browser(t.app)
    return (path: string, init: { method?: string; body?: unknown } = {}) =>
      b.req(path, { ...init, headers: { authorization: `Bearer ${token}` } })
  }

  it('the jobs make it when it’s missing, and only with the switch on', async () => {
    await runDueJobs(testApp(db).deps)
    expect(await sandbox()).toEqual([])
    await runDueJobs(testApp(db, { demoWorkspace: true }).deps)
    const [demo] = await sandbox()
    expect(demo).toMatchObject({ slug: SANDBOX_SLUG, name: 'Glow Studio', verification: 'verified', demo: true })
    expect(demo!.createdAt.getTime()).toBe(DEMO_NOW)
    // made once a night: the next run keeps it
    await runDueJobs(testApp(db, { demoWorkspace: true, now: DEMO_NOW + HOUR }).deps)
    expect((await sandbox())[0]!.id).toBe(demo!.id)
  })

  it('every number in it is in the unused range; each one its team signs in or is invited with is a demo account’s', async () => {
    const [demo] = await sandbox()
    expect(isUnusedNumber(demo!.phone)).toBe(true)
    const team = await db.select().from(staff).where(eq(staff.businessId, demo!.id))
    expect(team.every((s) => !s.phone || isUnusedNumber(s.phone))).toBe(true)
    const accounts = await db
      .select()
      .from(users)
      .where(
        inArray(
          users.id,
          team.flatMap((s) => (s.userId ? [s.userId] : [])),
        ),
      )
    expect(accounts.length).toBeGreaterThan(1)
    expect(accounts.every((u) => u.demo && isUnusedNumber(u.phone))).toBe(true)
    for (const i of await db.select().from(invites).where(eq(invites.businessId, demo!.id))) {
      expect(isUnusedNumber(i.phone)).toBe(true)
      expect((await db.select().from(users).where(eq(users.phone, i.phone)))[0]?.demo).toBe(true)
    }
    const list = await db.select().from(clients).where(eq(clients.businessId, demo!.id))
    expect(list.length).toBeGreaterThan(5)
    expect(list.every((c) => (!c.phone || isUnusedNumber(c.phone)) && !c.userId)).toBe(true)
    const all = await db.select().from(bookings).where(eq(bookings.businessId, demo!.id))
    expect(all.every((b) => (!b.clientPhone || isUnusedNumber(b.clientPhone)) && !b.userId)).toBe(true)
    // the design's codes are development's demo's here: the demo workspace's bookings got others
    expect(all.map((b) => b.code)).not.toContain('YR-48213')
    // a request waits until its visit, so visitors can answer it all day; one already past, for the hold time
    const [rules] = await db.select().from(bookingRules).where(eq(bookingRules.businessId, demo!.id))
    const waiting = all.filter((b) => b.status === 'pending')
    expect(waiting.length).toBeGreaterThan(0)
    for (const b of waiting) expect(b.holdUntil!.getTime()).toBe(Math.max(epochOf(b.date, b.start), DEMO_NOW + rules!.holdMinutes * 60_000))
  })

  it('nobody signs in with a number of its range, and nothing is sent to one', async () => {
    const t = testApp(db)
    const res = await browser(t.app).req('/v1/auth/code', { body: { phone: MAYSA } })
    expect(res.status).toBe(400)
    await t.sms.send({ to: MAYSA, text: 'Ýeral: your page is hidden' })
    expect(t.sms.sent).toEqual([])
  })

  it('is nobody’s page: not found, in no search, no sitemap and no admin queue; its own team sees it as it would be', async () => {
    const t = testApp(db)
    const visitor = browser(t.app)
    expect((await visitor.req(`/v1/businesses/${SANDBOX_SLUG}?lang=en`)).json.error.code).toBe('not_found')
    const found = (await visitor.req('/v1/search?q=Glow&lang=en&sort=rating')).json.items as { slug: string }[]
    expect(found.map((b) => b.slug)).toContain('glow-studio')
    expect(found.map((b) => b.slug)).not.toContain(SANDBOX_SLUG)
    const map = (await visitor.req('/v1/sitemap')).json as { businesses: { slug: string }[] }
    expect(map.businesses.map((b) => b.slug)).not.toContain(SANDBOX_SLUG)
    const owner = await asDemoOwner(t)
    expect((await owner(`/v1/businesses/${SANDBOX_SLUG}?lang=en`)).json).toMatchObject({ slug: SANDBOX_SLUG, preview: null })
    // a visitor moves it and reports one of its reviews: the Ýeral team's queues don't hear of it
    const [demo] = await sandbox()
    await db
      .update(businesses)
      .set({ addressChangedAt: new Date(DEMO_NOW) })
      .where(eq(businesses.id, demo!.id))
    const [review] = await db.select().from(reviews).where(eq(reviews.businessId, demo!.id)).limit(1)
    await db
      .update(reviews)
      .set({ reportedAt: new Date(DEMO_NOW), reportReason: 'spam' })
      .where(eq(reviews.id, review!.id))
    for (const view of ['moved', 'all', 'verified'] as const)
      expect((await adminBusinesses(db, { view, lang: 'en' })).map((b) => b.slug)).not.toContain(SANDBOX_SLUG)
    expect((await adminReviews(db, 'reported')).map((r) => r.id)).not.toContain(review!.id)
    await db.update(businesses).set({ addressChangedAt: null }).where(eq(businesses.id, demo!.id))
    await db.update(reviews).set({ reportedAt: null, reportReason: null }).where(eq(reviews.id, review!.id))
  })

  it('no business but it takes its address: one named “Demo” gets demo-2', async () => {
    const t = testApp(db)
    const someone = browser(t.app)
    await someone.login('+99365930077', 'Demo Owner')
    const made = await someone.req('/v1/setup', { body: { name: 'Demo', categoryId: 'beauty' } })
    expect(made.status, JSON.stringify(made.json)).toBe(201)
    expect(made.json.slug).toBe('demo-2')
  })

  it('sends no SMS, and a number in it joins no account, a real person’s included', async () => {
    const t = testApp(db)
    const owner = await asDemoOwner(t)
    const [demo] = await sandbox()
    const manicure = (await db.select().from(services).where(eq(services.businessId, demo!.id))).find((s) => s.name.en === 'Manicure')!
    const maral = (await db.select().from(staff).where(eq(staff.businessId, demo!.id))).find((s) => s.name === 'Maral')!
    const madeUp = `${UNUSED}811055`
    const made = await owner(`/v1/w/${SANDBOX_SLUG}/bookings`, {
      body: {
        source: 'phone',
        phone: madeUp,
        serviceIds: [manicure.id],
        staffId: maral.id,
        date: '2026-10-27',
        start: 600,
        notifyClient: true,
      },
    })
    expect(made.status, JSON.stringify(made.json)).toBe(201)
    const [b] = await db.select().from(bookings).where(eq(bookings.code, made.json.code))
    // a real person's number there (visitors may type only made-up ones; these are the rules behind that): the team's
    // record of it joins no account, its SMS go nowhere, and her sign-in brings her nothing
    const { record, holder } = await phoneClient(db, demo!, AYJEMAL, undefined, t.clock.now, b!.id)
    expect(holder).toBeUndefined()
    expect(record.userId).toBeNull()
    await db.update(bookings).set({ clientPhone: AYJEMAL, clientId: record.id }).where(eq(bookings.id, b!.id))
    // once its undo time is over
    t.clock.now += 20_000
    await runDueJobs(t.deps)
    const queued = (await db.select().from(jobs).where(eq(jobs.kind, 'booking.sms'))).filter((j) => j.payload.bookingId === b!.id)
    expect(queued.some((j) => j.error === 'dropped: the demo workspace sends no SMS')).toBe(true)
    expect(t.sms.sent.filter((m) => m.to === AYJEMAL || m.to === madeUp)).toEqual([])
    const her = browser(t.app)
    await her.login(AYJEMAL)
    expect((await db.select().from(bookings).where(eq(bookings.id, b!.id)))[0]!.userId).toBeNull()
    expect((await db.select().from(clients).where(eq(clients.id, record.id)))[0]!.userId).toBeNull()
  })

  it('made again after 04:00: what visitors added and changed goes; the demo accounts, and the sessions in them, stay', async () => {
    const t = testApp(db)
    const [before] = await sandbox()
    const owner = (await ownerOf(before!.id)).userId!
    await db.insert(clients).values({ businessId: before!.id, phone: `${UNUSED}811099`, name: 'A visitor’s client' })
    // a visitor's uploads, in the gallery, the logo, a team picture and the account's own photo
    for (const key of ['up/g/visitor.jpg', 'up/l/visitor.jpg', 'up/s/visitor.jpg', 'up/u/visitor.jpg'])
      await t.storage.put(key, new Uint8Array([1]))
    await db
      .update(businesses)
      .set({
        photos: [...before!.photos, { key: 'up/g/visitor.jpg', alt: { en: 'x' } }],
        logo: { key: 'up/l/visitor.jpg', alt: { en: 'x' } },
      })
      .where(eq(businesses.id, before!.id))
    await db
      .update(staff)
      .set({ photo: { key: 'up/s/visitor.jpg', alt: { en: 'x' } } })
      .where(eq(staff.businessId, before!.id))
    await db
      .update(users)
      .set({ name: 'Troll', photo: { key: 'up/u/visitor.jpg', alt: { en: 'x' } }, lang: 'ru', notifyConfirmation: false })
      .where(eq(users.id, owner))
    // a live booking development's demo hasn't told its client of yet: the remake leaves it alone
    const [live] = await db.select().from(bookings).where(eq(bookings.code, 'YR-48213'))
    await db.update(bookings).set({ told: null }).where(eq(bookings.id, live!.id))
    const visitor = await asDemoOwner(t)
    const signedIn = (await db.select().from(sessions).where(eq(sessions.userId, owner))).length
    const night = lastRemakeAt(DEMO_NOW) + 24 * HOUR
    // a minute before 04:00: kept
    await runDueJobs(testApp(db, { demoWorkspace: true, now: night - 60_000 }).deps)
    expect((await sandbox())[0]!.id).toBe(before!.id)
    const remake = testApp(db, { demoWorkspace: true, now: night + 60_000 })
    for (const [key, data] of t.storage.files) await remake.storage.put(key, data)
    await runDueJobs(remake.deps)
    const [after] = await sandbox()
    expect(after!.id).not.toBe(before!.id)
    expect(after!.createdAt.getTime()).toBe(night + 60_000)
    expect(
      await db
        .select()
        .from(clients)
        .where(eq(clients.phone, `${UNUSED}811099`)),
    ).toEqual([])
    expect([...remake.storage.files.keys()]).toEqual([])
    expect(after!.logo).toBeNull()
    expect((await ownerOf(after!.id)).userId).toBe(owner)
    const [account] = await db.select().from(users).where(eq(users.id, owner))
    expect(account).toMatchObject({ name: 'Maýsa', photo: null, lang: MARKET.defaultLanguage, notifyConfirmation: true })
    expect((await db.select().from(sessions).where(eq(sessions.userId, owner))).length).toBe(signedIn)
    expect(
      (
        await db
          .select()
          .from(bookings)
          .where(and(eq(bookings.id, live!.id), isNull(bookings.told)))
      ).length,
    ).toBe(1)
    // the visitor's session goes on, in the new one
    const mine = (await visitor('/v1/me/workspaces')).json.items as { slug: string }[]
    expect(mine.map((w) => w.slug)).toContain(SANDBOX_SLUG)
  })

  it('never takes a real account’s number: a remake that would is refused, and the old one stays', async () => {
    await db.update(users).set({ demo: false }).where(eq(users.phone, MAYSA))
    try {
      const [before] = await sandbox()
      await expect(seedSandbox(db, { now: DEMO_NOW + 48 * HOUR })).rejects.toThrow(/real account/)
      expect((await sandbox())[0]!.id).toBe(before!.id)
      // the jobs say so and go on
      expect(await runDueJobs(testApp(db, { demoWorkspace: true, now: DEMO_NOW + 72 * HOUR }).deps)).toBeDefined()
    } finally {
      await db.update(users).set({ demo: true }).where(eq(users.phone, MAYSA))
    }
  })
})
