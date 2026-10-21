/** The first launch (book Q-004, Q-030, F-200): example businesses beside real ones, appointments only in lists. */
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../client'
import * as t from '../schema'
import { BUSINESSES } from './demo-data'
import { seed, seedExamples } from './index'

const APPOINTMENTS = BUSINESSES.filter((b) => b.type === 'appointment')
const SUPPORT = '+99312000000'

describe('the first launch’s example businesses (book Q-004, F-200)', () => {
  let db: Db
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    // production: the catalogue, then the examples
    await seed(db, { demo: false, now: DEMO_NOW })
  })
  beforeEach(async () => {
    await db.delete(t.rateLimits)
  })

  it('the design’s appointment businesses, once each: confirming at once, no team to sign in to, no reviews of their own', async () => {
    expect(await seedExamples(db, { now: DEMO_NOW, phone: SUPPORT })).toBe(APPOINTMENTS.length)
    expect(await seedExamples(db, { now: DEMO_NOW, phone: SUPPORT })).toBe(0)
    const rows = await db.select().from(t.businesses)
    expect(rows.map((b) => b.slug).sort()).toEqual(APPOINTMENTS.map((b) => b.slug).sort())
    expect(rows.every((b) => b.demo && b.verification === 'verified' && b.rating === null && b.reviewsCount === 0)).toBe(true)
    // Ýeral's line, never the design's numbers; no invented ratings for their specialists either
    expect(rows.every((b) => b.phone === SUPPORT)).toBe(true)
    expect((await db.select().from(t.bookingRules)).every((r) => r.confirmMode === 'instant')).toBe(true)
    // nobody signs in to them: no accounts, the owner's row alone with the app (and no account), no invites
    expect(await db.select().from(t.users)).toHaveLength(0)
    const team = await db.select().from(t.staff)
    expect(team.every((s) => !s.userId && s.status === 'active' && s.hasApp === (s.level === 'owner') && s.rating === null)).toBe(true)
    expect(await db.select().from(t.invites)).toHaveLength(0)
  })

  it('a visitor books one and it’s confirmed at once; the page and the booking say "Example"', async () => {
    const app = testApp(db)
    const visitor = browser(app.app)
    await visitor.login('+99365990001', 'Visitor')
    const page = (await visitor.req('/v1/businesses/glow-studio?lang=en')).json
    expect(page).toMatchObject({ example: true, confirmMode: 'instant' })
    const [glow] = await db.select().from(t.businesses).where(eq(t.businesses.slug, 'glow-studio'))
    const [manicure] = (await db.select().from(t.services).where(eq(t.services.businessId, glow!.id))).filter(
      (s) => s.name.en === 'Manicure',
    )
    const free = (await visitor.req(`/v1/businesses/glow-studio/availability?lang=en&services=${manicure!.id}&date=2026-10-20`)).json
    const slot = (free.slots as { start: number }[])[0]
    expect(slot).toBeTruthy()
    const made = await visitor.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'glow-studio',
        serviceIds: [manicure!.id],
        staffId: null,
        date: '2026-10-20',
        start: slot!.start,
      },
    })
    expect(made.json, JSON.stringify(made.json)).toMatchObject({ status: 'confirmed' })
    expect((await visitor.req(`/v1/me/bookings/${made.json.code}`)).json.business).toMatchObject({ example: true })
  })
})

describe('appointments only, until tables and classes ship (book Q-030)', () => {
  let db: Db
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })

  it('categories, search and suggestions leave the other kinds out', async () => {
    const open = browser(testApp(db, { bookingTypes: ['appointment'] }).app)
    const every = browser(testApp(db).app)
    const kinds = async (b: ReturnType<typeof browser>) =>
      ((await b.req('/v1/categories?lang=en')).json.items as { id: string; bookingTypes: string[] }[]).map((c) => c.bookingTypes)
    expect((await kinds(open)).every((k) => k.includes('appointment'))).toBe(true)
    expect((await kinds(every)).some((k) => !k.includes('appointment'))).toBe(true)
    const found = async (b: ReturnType<typeof browser>) =>
      ((await b.req('/v1/search?lang=en')).json.items as { slug: string }[]).map((x) => x.slug)
    const tables = BUSINESSES.filter((b) => b.type !== 'appointment').map((b) => b.slug)
    expect((await found(open)).some((s) => tables.includes(s))).toBe(false)
    expect((await found(every)).some((s) => tables.includes(s))).toBe(true)
    const suggested = (await open.req('/v1/search/suggest?q=Bag&lang=en')).json as { businesses?: { slug: string }[] }
    expect((suggested.businesses ?? []).map((b) => b.slug)).not.toContain('bag-kafe')
    // nor a category of another kind
    const cats = (await open.req('/v1/search/suggest?q=Rest&lang=en')).json.categories as { id: string }[]
    expect(cats.map((c) => c.id)).not.toContain('restaurant')
    // an example is marked in the suggestions too
    const glow = (await open.req('/v1/search/suggest?q=Glow&lang=en')).json.businesses as { slug: string; example: boolean }[]
    expect(glow.find((b) => b.slug === 'glow-studio')).toMatchObject({ example: true })
  })
})
