/**
 * The business app's demo workspace (book F-242): the jobs make it, it's nobody's page, its numbers are nobody's and
 * join no account, it sends no SMS, and every night after 04:00 it's made again, the demo accounts staying.
 */
import { MARKET } from '@yeral/domain/market'
import { epochOf } from '@yeral/domain/time'
import { and, eq, inArray } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, clients, invites, jobs, services, sessions, staff, users } from '../../db/schema'
import { demoPhones, SANDBOX_SLUG, seed, seedSandbox } from '../../db/seed'
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
    expect(demo!.phone.startsWith(UNUSED)).toBe(true)
    const team = await db.select().from(staff).where(eq(staff.businessId, demo!.id))
    expect(team.every((s) => !s.phone || s.phone.startsWith(UNUSED))).toBe(true)
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
    expect(accounts.every((u) => u.demo && u.phone.startsWith(UNUSED))).toBe(true)
    for (const i of await db.select().from(invites).where(eq(invites.businessId, demo!.id))) {
      expect(i.phone.startsWith(UNUSED)).toBe(true)
      expect((await db.select().from(users).where(eq(users.phone, i.phone)))[0]?.demo).toBe(true)
    }
    const list = await db.select().from(clients).where(eq(clients.businessId, demo!.id))
    expect(list.length).toBeGreaterThan(5)
    expect(list.every((c) => (c.phone ?? UNUSED).startsWith(UNUSED) && !c.userId)).toBe(true)
    const all = await db.select().from(bookings).where(eq(bookings.businessId, demo!.id))
    expect(all.every((b) => (b.clientPhone ?? UNUSED).startsWith(UNUSED) && !b.userId)).toBe(true)
    // the design's codes are development's demo's here: the demo workspace's bookings got others
    expect(all.map((b) => b.code)).not.toContain('YR-48213')
    // a request waits until its visit, so visitors can answer it all day
    const waiting = all.filter((b) => b.status === 'pending')
    expect(waiting.length).toBeGreaterThan(0)
    for (const b of waiting) expect(b.holdUntil!.getTime()).toBe(epochOf(b.date, b.start))
  })

  it('is nobody’s page: not found, in no search and no sitemap; its own team sees it as it would be', async () => {
    const t = testApp(db)
    const visitor = browser(t.app)
    expect((await visitor.req(`/v1/businesses/${SANDBOX_SLUG}?lang=en`)).json.error.code).toBe('not_found')
    const found = (await visitor.req('/v1/search?q=Glow&lang=en&sort=rating')).json.items as { slug: string }[]
    expect(found.map((b) => b.slug)).toContain('glow-studio')
    expect(found.map((b) => b.slug)).not.toContain(SANDBOX_SLUG)
    const map = (await visitor.req('/v1/sitemap')).json as { businesses: { slug: string }[] }
    expect(map.businesses.map((b) => b.slug)).not.toContain(SANDBOX_SLUG)
    const owner = browser(t.app)
    await owner.login(MAYSA)
    expect((await owner.req(`/v1/businesses/${SANDBOX_SLUG}?lang=en`)).json).toMatchObject({ slug: SANDBOX_SLUG, preview: null })
  })

  it('sends no SMS, and a number typed in joins no account, a real person’s included', async () => {
    const t = testApp(db)
    const owner = browser(t.app)
    await owner.login(MAYSA)
    const [demo] = await sandbox()
    const manicure = (await db.select().from(services).where(eq(services.businessId, demo!.id))).find((s) => s.name.en === 'Manicure')!
    const maral = (await db.select().from(staff).where(eq(staff.businessId, demo!.id))).find((s) => s.name === 'Maral')!
    const made = await owner.req(`/v1/w/${SANDBOX_SLUG}/bookings`, {
      body: {
        source: 'phone',
        phone: AYJEMAL,
        serviceIds: [manicure.id],
        staffId: maral.id,
        date: '2026-10-27',
        start: 600,
        notifyClient: true,
      },
    })
    expect(made.status, JSON.stringify(made.json)).toBe(201)
    const [b] = await db.select().from(bookings).where(eq(bookings.code, made.json.code))
    expect(b!.userId).toBeNull()
    const [record] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.businessId, demo!.id), eq(clients.phone, AYJEMAL)))
    expect(record!.userId).toBeNull()
    // once its undo time is over, its SMS go nowhere
    t.clock.now += 20_000
    await runDueJobs(t.deps)
    const queued = (await db.select().from(jobs).where(eq(jobs.kind, 'booking.sms'))).filter((j) => j.payload.bookingId === b!.id)
    expect(queued.some((j) => j.error === 'dropped: the demo workspace sends no SMS')).toBe(true)
    expect(t.sms.sent.filter((m) => m.to === AYJEMAL)).toEqual([])
    // her sign-in brings her nothing from the demo workspace
    const her = browser(t.app)
    await her.login(AYJEMAL)
    expect((await db.select().from(bookings).where(eq(bookings.id, b!.id)))[0]!.userId).toBeNull()
    expect((await db.select().from(clients).where(eq(clients.id, record!.id)))[0]!.userId).toBeNull()
  })

  it('made again after 04:00: what visitors added goes; the demo accounts, and the sessions in them, stay', async () => {
    const [before] = await sandbox()
    const owner = (await ownerOf(before!.id)).userId!
    await db.insert(clients).values({ businessId: before!.id, phone: '+99365811099', name: 'A visitor’s client' })
    const visitor = browser(testApp(db).app)
    await visitor.login(MAYSA)
    const signedIn = (await db.select().from(sessions).where(eq(sessions.userId, owner))).length
    const night = lastRemakeAt(DEMO_NOW) + 24 * HOUR
    // a minute before 04:00: kept
    await runDueJobs(testApp(db, { demoWorkspace: true, now: night - 60_000 }).deps)
    expect((await sandbox())[0]!.id).toBe(before!.id)
    await runDueJobs(testApp(db, { demoWorkspace: true, now: night + 60_000 }).deps)
    const [after] = await sandbox()
    expect(after!.id).not.toBe(before!.id)
    expect(after!.createdAt.getTime()).toBe(night + 60_000)
    expect(await db.select().from(clients).where(eq(clients.phone, '+99365811099'))).toEqual([])
    expect((await ownerOf(after!.id)).userId).toBe(owner)
    expect((await db.select().from(sessions).where(eq(sessions.userId, owner))).length).toBe(signedIn)
    // the visitor's session goes on, in the new one
    const mine = (await visitor.req('/v1/me/workspaces')).json.items as { slug: string }[]
    expect(mine.map((w) => w.slug)).toContain(SANDBOX_SLUG)
  })

  it('never takes a real account’s number: a seed that would is refused, and nothing changes', async () => {
    await db.update(users).set({ demo: false }).where(eq(users.phone, MAYSA))
    try {
      const [before] = await sandbox()
      await expect(seedSandbox(db, { now: DEMO_NOW + 48 * HOUR })).rejects.toThrow(/real account/)
      expect((await sandbox())[0]!.id).toBe(before!.id)
    } finally {
      await db.update(users).set({ demo: true }).where(eq(users.phone, MAYSA))
    }
  })
})
