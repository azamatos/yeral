import { beforeAll, describe, expect, it } from 'vitest'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, bookings, businesses, clients, events, jobs, services, staff, staffServices } from '../../db/schema'
import { seed } from '../../db/seed'
import { DEMO_CENTER } from '../../db/seed/demo-data'
import { confirmBooking } from '../bookings/confirm'
import { runDueJobs } from '../jobs/run'

const near = `lat=${DEMO_CENTER.lat}&lng=${DEMO_CENTER.lng}`

describe('catalogue', () => {
  let db: Db
  let b: ReturnType<typeof browser>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    b = browser(testApp(db).app)
  })

  it("lists the 13 categories in the asked language, the market's main one by default", async () => {
    const en = await b.req('/v1/categories')
    expect(en.json.items).toHaveLength(13)
    expect(en.json.items[0]).toMatchObject({ id: 'beauty', name: 'Beauty', icon: 'sparkles', bookingTypes: ['appointment'] })
    expect((await b.req('/v1/categories?lang=tk')).json.items[0].name).toBe('Gözellik')
    expect((await b.req('/v1/categories?lang=ru')).json.items[1].name).toBe('Барбершоп')
  })

  it("gives each category's starter services in their groups, in the asked language (F-098)", async () => {
    const en = await b.req('/v1/categories')
    const beauty = en.json.items[0]
    expect(beauty.starterGroups.map((g: { name: string }) => g.name)).toEqual(['Hair', 'Nails', 'Face', 'Massage'])
    expect(beauty.starterGroups[0]).toMatchObject({ id: 'hair', name: 'Hair' })
    expect(beauty.starterGroups[0].services[0]).toEqual({
      id: 'womens-haircut',
      name: 'Women’s haircut',
      durationMin: 60,
      price: { type: 'fixed', amount: 80 },
    })
    expect(beauty.starterGroups[0].services[2]).toMatchObject({ name: 'Hair colouring', price: { type: 'from', amount: 250 } })
    expect(en.json.items.find((c: { id: string }) => c.id === 'restaurant').starterGroups).toEqual([])
    const tk = await b.req('/v1/categories?lang=tk')
    expect(tk.json.items[0].starterGroups[0]).toMatchObject({ name: 'Saç', services: [{ name: 'Aýal saç kesimi' }, {}, {}, {}] })
  })

  it('search: nearest first, only places with free time today, distances when located', async () => {
    const res = await b.req(`/v1/search?${near}`)
    expect(res.status).toBe(200)
    expect(res.json.located).toBe(true)
    const items = res.json.items as {
      slug: string
      distanceM: number
      availability: { type: string; starts?: number[]; session?: unknown }
    }[]
    expect(items.length).toBeGreaterThan(3)
    expect(items.map((i) => i.distanceM)).toEqual([...items.map((i) => i.distanceM)].sort((x, y) => x - y))
    expect(items[0]?.slug).toBe('bag-kafe') // 0,9 km
    for (const i of items) expect(i.availability.starts?.length ?? (i.availability.session ? 1 : 0)).toBeGreaterThan(0)
    // the lead time: nothing before 12:20 today (11:20 + 60 min) at Barber Loft? its lead is the default 60
    const barber = items.find((i) => i.slug === 'barber-loft')
    expect(barber?.availability.starts?.[0]).toBeGreaterThanOrEqual(740)
  })

  it('search without a position sorts by rating × reviews and hides distances', async () => {
    const res = await b.req('/v1/search')
    expect(res.json.located).toBe(false)
    expect(res.json.items[0].distanceM).toBeNull()
    expect(res.json.items[0].slug).toBe('barber-loft') // 4,9 × 212
  })

  it('search by words, category and type; a radius keeps far places out', async () => {
    const manicure = await b.req(`/v1/search?q=manik%C3%BDur&${near}`)
    expect(manicure.json.items.map((i: { slug: string }) => i.slug)).toContain('nail-bar-ayna')
    const tables = await b.req(`/v1/search?type=table&${near}&r=5`)
    expect(tables.json.items.every((i: { bookingType: string }) => i.bookingType === 'table')).toBe(true)
    const close = await b.req(`/v1/search?${near}&r=1`)
    expect(close.json.items.map((i: { slug: string }) => i.slug)).toEqual(['bag-kafe'])
  })

  it('pages by 12 with a cursor', async () => {
    const first = await b.req(`/v1/search?${near}&r=25&limit=3`)
    expect(first.json.items).toHaveLength(3)
    expect(first.json.cursor).toBe('3')
    const second = await b.req(`/v1/search?${near}&r=25&limit=3&cursor=3`)
    expect(second.json.items[0].slug).not.toBe(first.json.items[0].slug)
  })

  it('the business page has everything the design shows (in the design’s Turkmen)', async () => {
    const res = await b.req(`/v1/businesses/glow-studio?${near}&lang=tk`)
    expect(res.status).toBe(200)
    const d = res.json
    expect(d).toMatchObject({
      name: 'Glow Studio',
      category: { id: 'beauty', name: 'Gözellik salony' },
      rating: 4.9,
      reviewsCount: 96,
      confirmMode: 'manual',
      holdMinutes: 30,
    })
    expect(d.ratingBreakdown).toEqual({ 1: 0, 2: 1, 3: 1, 4: 6, 5: 88 })
    expect(d.serviceGroups.map((g: { name: string }) => g.name)).toEqual(['Saç', 'Dyrnak', 'Ýüz ideg', 'Massaž'])
    expect(d.serviceGroups[0].services[2]).toMatchObject({ name: 'Saç reňklemek', durationMin: 120, price: { type: 'from', amount: 250 } })
    expect(d.specialists.map((s: { name: string }) => s.name)).toEqual(['Aýna', 'Maral', 'Jeren', 'Leýli'])
    expect(d.hours[6]).toEqual({ open: 600, close: 1080, break: null })
    expect(d.rules).toEqual({ cancelWindowMinutes: 120, lateToleranceMinutes: 15, note: null })
    expect(d.photos[0].url).toBe('http://media.test/demo/adam-winger-FkAZqQJTbXM-unsplash.jpg')
    expect(d.distanceM).toBeGreaterThan(2900)
    expect(d.nextFree).not.toBeNull()
  })

  it('someone invited isn’t on the client site until they accept (book chapter 3)', async () => {
    // Gülnar is invited to Glow Studio; even bookable and doing a service, she doesn't show yet
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [gulnar] = await db
      .update(staff)
      .set({ bookable: true })
      .where(and(eq(staff.businessId, glow!.id), eq(staff.name, 'Gülnar')))
      .returning()
    const [svc] = await db.select().from(services).where(eq(services.businessId, glow!.id)).limit(1)
    await db.insert(staffServices).values({ staffId: gulnar!.id, serviceId: svc!.id })
    try {
      const shown = async () =>
        (await b.req('/v1/businesses/glow-studio')).json.specialists.map((s: { name: string }) => s.name) as string[]
      expect(await shown()).not.toContain('Gülnar')
      // once she accepts, she's there
      await db.update(staff).set({ status: 'active' }).where(eq(staff.id, gulnar!.id))
      expect(await shown()).toContain('Gülnar')
    } finally {
      await db.delete(staffServices).where(eq(staffServices.staffId, gulnar!.id))
      await db.update(staff).set({ bookable: false, status: 'invited' }).where(eq(staff.id, gulnar!.id))
    }
  })

  it('a hidden price stays hidden on the public page', async () => {
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [svc] = await db.select().from(services).where(eq(services.businessId, glow!.id)).limit(1)
    await db.update(services).set({ priceType: 'hidden', priceAmount: 120 }).where(eq(services.id, svc!.id))
    const res = await b.req('/v1/businesses/glow-studio')
    await db.update(services).set({ priceType: svc!.priceType, priceAmount: svc!.priceAmount }).where(eq(services.id, svc!.id))
    const shown = res.json.serviceGroups
      .flatMap((g: { services: { id: string }[] }) => g.services)
      .find((s: { id: string }) => s.id === svc!.id)
    expect(shown.price).toEqual({ type: 'hidden', amount: 0 })
  })

  it('lateness is 15 minutes at every business in the MVP, whatever was stored (book Q-118)', async () => {
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [stored] = await db.select().from(bookingRules).where(eq(bookingRules.businessId, glow!.id))
    await db.update(bookingRules).set({ lateToleranceMinutes: 30 }).where(eq(bookingRules.businessId, glow!.id))
    try {
      expect((await b.req('/v1/businesses/glow-studio')).json.rules.lateToleranceMinutes).toBe(15)
    } finally {
      await db.update(bookingRules).set({ lateToleranceMinutes: stored!.lateToleranceMinutes }).where(eq(bookingRules.businessId, glow!.id))
    }
  })

  it('a restaurant shows no average bill, on its card or its page (book Q-103)', async () => {
    const page = await b.req('/v1/businesses/bag-kafe')
    expect(page.status).toBe(200)
    expect(page.json).not.toHaveProperty('avgBill')
    const found = await b.req(`/v1/search?q=${encodeURIComponent(page.json.name)}&${near}`)
    const card = found.json.items.find((x: { slug: string }) => x.slug === 'bag-kafe')
    expect(card).toBeDefined()
    expect(card).not.toHaveProperty('avgBill')
    expect(card.priceFrom).toBeNull()
  })

  it('sorting by price: cheapest first, places without a price last, each tie by popularity', async () => {
    type Card = { slug: string; priceFrom: { amount: number } | null }
    const byPrice = (await b.req('/v1/search?sort=price&limit=50')).json.items as Card[]
    const popular = (await b.req('/v1/search?limit=50')).json.items as Card[]
    const priced = byPrice.filter((c) => c.priceFrom)
    expect(priced.map((c) => c.priceFrom!.amount)).toEqual(priced.map((c) => c.priceFrom!.amount).sort((x, y) => x - y))
    const unpriced = byPrice.slice(priced.length)
    expect(unpriced.length).toBeGreaterThan(1)
    expect(unpriced.map((c) => c.slug)).toEqual(popular.filter((c) => !c.priceFrom).map((c) => c.slug))
    // a price limit keeps only places with a known price inside it
    const cheap = (await b.req(`/v1/search?maxPrice=${priced[0]!.priceFrom!.amount}&limit=50`)).json.items as Card[]
    expect(cheap.length).toBeGreaterThan(0)
    for (const c of cheap) expect(c.priceFrom!.amount).toBeLessThanOrEqual(priced[0]!.priceFrom!.amount)
  })

  it('a price range finds places with a paid service inside it; a place whose services are all free, from 0 only', async () => {
    const slugs = async (query: string) =>
      ((await b.req(`/v1/search?limit=50&${query}`)).json.items as { slug: string }[]).map((c) => c.slug)
    // what each place search finds charges online
    const found = await slugs('')
    const paid = (
      await db
        .select({ slug: businesses.slug, amount: services.priceAmount })
        .from(services)
        .innerJoin(businesses, eq(businesses.id, services.businessId))
        .where(and(eq(services.online, true), eq(services.archived, false), inArray(services.priceType, ['fixed', 'from'])))
    ).filter((p) => found.includes(p.slug))
    const amounts = [...new Set(paid.map((p) => p.amount))].sort((x, y) => x - y)
    expect(amounts.length).toBeGreaterThanOrEqual(4)
    const has = (slug: string, min: number, max = Infinity) => paid.some((p) => p.slug === slug && p.amount >= min && p.amount <= max)

    const top = amounts.at(-1)!
    const dear = await slugs(`minPrice=${top}`)
    expect(dear.length).toBeGreaterThan(0)
    for (const s of dear) expect(has(s, top)).toBe(true)
    const [lo, hi] = [amounts[1]!, amounts[3]!]
    const between = await slugs(`minPrice=${lo}&maxPrice=${hi}`)
    expect(between.length).toBeGreaterThan(0)
    for (const s of between) expect(has(s, lo, hi)).toBe(true)
    // a reversed range is a mistake, not "no places"
    expect((await b.req(`/v1/search?minPrice=${hi}&maxPrice=${lo}`)).status).toBe(400)
    // the database stores 32-bit amounts: a larger limit is refused, not a server error
    expect((await b.req('/v1/search?maxPrice=2147483647')).status).toBe(200)
    expect((await b.req('/v1/search?maxPrice=10000000000')).status).toBe(400)

    const [barber] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    const own = await db.select().from(services).where(eq(services.businessId, barber!.id))
    await db.update(services).set({ priceType: 'free', priceAmount: 0 }).where(eq(services.businessId, barber!.id))
    try {
      expect(await slugs('maxPrice=0')).toContain('barber-loft')
      expect(await slugs('minPrice=1')).not.toContain('barber-loft')
    } finally {
      for (const s of own)
        await db.update(services).set({ priceType: s.priceType, priceAmount: s.priceAmount }).where(eq(services.id, s.id))
    }
  })

  it('reviews, newest first, with the business reply', async () => {
    const res = await b.req('/v1/businesses/glow-studio/reviews?lang=tk')
    expect(res.json.items.map((r: { author: string }) => r.author)).toEqual(['Gülälek N.', 'Ogulşat M.', 'Bahar A.'])
    expect(res.json.items[0]).toMatchObject({
      rating: 5,
      what: 'Aýal saç kesimi · Aýna',
      reply: { text: 'Sag boluň, Gülälek! Ýene garaşýarys.' },
    })
  })

  it('unknown and unverified businesses are not found', async () => {
    expect((await b.req('/v1/businesses/nope')).status).toBe(404)
    await db.update(businesses).set({ verification: 'pending' }).where(eq(businesses.slug, 'pamyk'))
    expect((await b.req('/v1/businesses/pamyk')).status).toBe(404)
    expect((await b.req('/v1/search?q=pamyk')).json.items).toEqual([])
  })

  it('suggests categories, services, businesses and places', async () => {
    const s = await b.req('/v1/search/suggest?q=ma&lang=tk')
    expect(s.json.services).toEqual(expect.arrayContaining(['Manikýur']))
    const p = await b.req('/v1/places/suggest?q=magtym&lang=tk')
    expect(p.json.items[0].label).toBe('Magtymguly şaýoly')
  })

  it('finds a text in any language it was written in, and shows it in the asked one (book Q-102)', async () => {
    // typed in Turkmen, shown in English
    const s = await b.req('/v1/search/suggest?q=manik%C3%BDur')
    expect(s.json.services).toEqual(expect.arrayContaining(['Manicure']))
    // a service written only in Russian shows in Russian to everyone
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [svc] = await db.select().from(services).where(eq(services.businessId, glow!.id)).limit(1)
    await db
      .update(services)
      .set({ name: { ru: 'Особая стрижка' } })
      .where(eq(services.id, svc!.id))
    try {
      const found = await b.req('/v1/search/suggest?q=%D0%BE%D1%81%D0%BE%D0%B1')
      expect(found.json.services).toEqual(['Особая стрижка'])
    } finally {
      await db.update(services).set({ name: svc!.name }).where(eq(services.id, svc!.id))
    }
  })

  it('the typical answer time: the median of the last 30 days, shown from the fifth answer (book Q-113)', async () => {
    const [nails] = await db.select().from(businesses).where(eq(businesses.slug, 'nail-bar-ayna'))
    const typical = async () => (await b.req('/v1/businesses/nail-bar-ayna')).json.typicalConfirmMinutes
    const row = (code: string, minutes: number, daysAgo: number, lapsed = false) => {
      const sent = DEMO_NOW - daysAgo * 86_400_000
      const at = new Date(sent + minutes * 60_000)
      return {
        code,
        businessId: nails!.id,
        type: 'appointment' as const,
        date: '2026-10-20',
        start: 600,
        end: 660,
        status: lapsed ? ('cancelled' as const) : ('confirmed' as const),
        source: 'web' as const,
        createdAt: new Date(sent),
        ...(lapsed ? { cancelledBy: 'system' as const, cancelledAt: at } : { confirmedAt: at, answeredAt: at }),
      }
    }
    const codes = ['YR-997001', 'YR-997002', 'YR-997003', 'YR-997004', 'YR-997005', 'YR-997006', 'YR-997007', 'YR-997008']
    // open round the clock, with no answers of its own yet: the waits are the minutes below
    await db
      .update(businesses)
      .set({ hours: Array.from({ length: 7 }, () => ({ open: 0, close: 1440 })), exceptions: [] })
      .where(eq(businesses.id, nails!.id))
    await db.update(bookings).set({ answeredAt: null }).where(eq(bookings.businessId, nails!.id))
    try {
      // four answers, and one from 40 days ago that no longer counts
      await db
        .insert(bookings)
        .values([row(codes[0]!, 4, 1), row(codes[1]!, 6, 2), row(codes[2]!, 8, 3), row(codes[3]!, 12, 4), row(codes[4]!, 2, 40)])
      expect(await typical()).toBeNull()
      // 4, 6, 8, 12, 14: 8 minutes, said as 10
      await db.insert(bookings).values(row(codes[5]!, 14, 5))
      expect(await typical()).toBe(10)
      // two requests let run out after an hour count at that hour: 12 minutes, said as 15
      await db.insert(bookings).values([row(codes[6]!, 60, 6, true), row(codes[7]!, 60, 7, true)])
      expect(await typical()).toBe(15)
    } finally {
      await db.delete(bookings).where(inArray(bookings.code, codes))
      await db.update(businesses).set({ hours: nails!.hours, exceptions: nails!.exceptions }).where(eq(businesses.id, nails!.id))
    }
  })

  it('a request the business confirms keeps when it was answered (the demo answers too); an instant one doesn’t', async () => {
    const t = testApp(db)
    const [nails] = await db.select().from(businesses).where(eq(businesses.slug, 'nail-bar-ayna'))
    const pending = async (code: string) =>
      (
        await db
          .insert(bookings)
          .values({
            code,
            businessId: nails!.id,
            type: 'appointment',
            date: '2026-10-20',
            start: 600,
            end: 660,
            status: 'pending',
            source: 'web',
            holdUntil: new Date(DEMO_NOW + 3_600_000),
          })
          .returning()
      )[0]!
    const codes = ['YR-997010', 'YR-997011', 'YR-997012']
    try {
      // as an instant business confirms: not an answer
      const instant = await db.transaction(async (tx) => confirmBooking(tx, t.deps, await pending(codes[0]!), { instant: true }))
      expect(instant.answeredAt).toBeNull()
      const answered = await db.transaction(async (tx) => confirmBooking(tx, t.deps, await pending(codes[1]!)))
      expect(answered.answeredAt?.getTime()).toBe(DEMO_NOW)
      // a demo business's own answer, from the jobs
      const demo = await pending(codes[2]!)
      await db.insert(jobs).values({ kind: 'demo.answer', runAt: new Date(DEMO_NOW), payload: { bookingId: demo.id } })
      await runDueJobs(t.deps)
      const [after] = await db.select().from(bookings).where(eq(bookings.id, demo.id))
      expect(after).toMatchObject({ status: 'confirmed', answeredAt: new Date(DEMO_NOW) })
    } finally {
      const ids = (await db.select({ id: bookings.id }).from(bookings).where(inArray(bookings.code, codes))).map((r) => r.id)
      await db.delete(jobs).where(sql`${jobs.payload}->>'bookingId' in ${ids.length ? ids : ['none']}`)
      await db.delete(events).where(inArray(events.bookingCode, codes))
      await db.delete(bookings).where(inArray(bookings.code, codes))
    }
  })

  it('the business page says whether whoever looks may book online: the "Jaň et" card for a phone-only client (A7, Q-154)', async () => {
    const t = testApp(db)
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const phone = '+99365777020'
    const look = async (who: ReturnType<typeof browser>) => (await who.req('/v1/businesses/glow-studio')).json.bookOnline
    expect(await look(browser(t.app))).toBe(true)
    // the answer is for whoever looks: no shared cache keeps it
    const headers = (await browser(t.app).req('/v1/businesses/glow-studio')).headers
    expect(headers.get('cache-control')).toBe('private, no-store')
    expect(headers.get('vary')).toMatch(/Cookie, Authorization/)
    const client = browser(t.app)
    await client.login(phone, 'Maral')
    expect(await look(client)).toBe(true)
    const [record] = await db.insert(clients).values({ businessId: glow!.id, phone, name: 'Maral', onlineBlocked: true }).returning()
    const [rules] = await db.select().from(bookingRules).where(eq(bookingRules.businessId, glow!.id))
    const other = browser(t.app)
    await other.login('+99365777021', 'Selbi')
    try {
      expect(await look(client)).toBe(false)
      // everyone else still books online
      expect(await look(other)).toBe(true)
      // phone-only by the no-show count, not by hand
      await db.update(clients).set({ onlineBlocked: false }).where(eq(clients.id, record!.id))
      await db.update(bookingRules).set({ blockAfterNoShows: 1 }).where(eq(bookingRules.businessId, glow!.id))
      await db.insert(bookings).values({
        code: 'YR-997020',
        businessId: glow!.id,
        type: 'appointment',
        date: '2026-10-10',
        start: 600,
        end: 660,
        status: 'noshow',
        source: 'web',
        clientId: record!.id,
        completedAt: new Date(DEMO_NOW - 4 * 86_400_000),
      })
      expect(await look(client)).toBe(false)
      // a paused business: nobody books online, signed in or not
      await db.update(bookingRules).set({ onlineEnabled: false }).where(eq(bookingRules.businessId, glow!.id))
      expect(await look(browser(t.app))).toBe(false)
      expect(await look(other)).toBe(false)
    } finally {
      await db
        .update(bookingRules)
        .set({ onlineEnabled: true, blockAfterNoShows: rules!.blockAfterNoShows })
        .where(eq(bookingRules.businessId, glow!.id))
      await db.delete(bookings).where(eq(bookings.code, 'YR-997020'))
      await db.delete(clients).where(eq(clients.id, record!.id))
    }
  })

  it('a page still in review: "not opened yet" for visitors, a preview for its own team (book F-032)', async () => {
    const t = testApp(db)
    const [ojak] = await db.select().from(businesses).where(eq(businesses.slug, 'ojak'))
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const open = (who: ReturnType<typeof browser>, path = '') => who.req(`/v1/businesses/ojak${path}`)
    const added: string[] = []
    try {
      const member = browser(t.app)
      const { me } = await member.login('+99365777030', 'Döwran')
      // the owner, and an administrator
      const [ownerRow] = await db.insert(staff).values({ businessId: ojak!.id, userId: me.id, name: 'Döwran', level: 'owner' }).returning()
      added.push(ownerRow!.id)
      const admin = browser(t.app)
      const { me: adminMe } = await admin.login('+99365777032', 'Jemal')
      const [adminRow] = await db
        .insert(staff)
        .values({ businessId: ojak!.id, userId: adminMe.id, name: 'Jemal', level: 'admin' })
        .returning()
      added.push(adminRow!.id)
      // on another team: a stranger here
      const elsewhere = browser(t.app)
      const { me: other } = await elsewhere.login('+99365777031', 'Aýna')
      const [theirs] = await db.insert(staff).values({ businessId: glow!.id, userId: other.id, name: 'Aýna', level: 'admin' }).returning()
      added.push(theirs!.id)
      await db.update(businesses).set({ verification: 'pending' }).where(eq(businesses.id, ojak!.id))
      for (const who of [browser(t.app), elsewhere]) {
        const res = await open(who)
        expect(res.status).toBe(404)
        expect(res.json.error.code).toBe('in_review')
        expect(res.headers.get('cache-control')).toBe('private, no-store')
        expect((await open(who, '/reviews')).json.error.code).toBe('in_review')
      }
      const own = await open(member)
      expect(own.status).toBe(200)
      expect(own.json).toMatchObject({ slug: 'ojak', preview: { status: 'pending', reason: null }, bookOnline: false })
      expect((await open(member, '/reviews')).status).toBe(200)
      // rejected: still "not opened yet" for others; the owner sees why, the rest of the team doesn't
      await db.update(businesses).set({ verification: 'rejected', verificationReason: 'Salgy doly däl' }).where(eq(businesses.id, ojak!.id))
      expect((await open(elsewhere)).json.error.code).toBe('in_review')
      expect((await open(member)).json.preview).toEqual({ status: 'rejected', reason: 'Salgy doly däl' })
      expect((await open(admin)).json.preview).toEqual({ status: 'rejected', reason: null })
      // a slug that never existed is plainly not found
      expect((await browser(t.app).req('/v1/businesses/no-such-place')).json.error.code).toBe('not_found')
    } finally {
      await db.update(businesses).set({ verification: 'verified', verificationReason: null }).where(eq(businesses.id, ojak!.id))
      if (added.length) await db.delete(staff).where(inArray(staff.id, added))
    }
    // verified again: everyone sees it, with no preview
    expect((await open(browser(t.app))).json).toMatchObject({ slug: 'ojak', preview: null })
  })
})
