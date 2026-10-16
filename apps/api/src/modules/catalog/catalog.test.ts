import { beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, services } from '../../db/schema'
import { seed } from '../../db/seed'
import { DEMO_CENTER } from '../../db/seed/demo-data'

const near = `lat=${DEMO_CENTER.lat}&lng=${DEMO_CENTER.lng}`

describe('catalogue', () => {
  let db: Db
  let b: ReturnType<typeof browser>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    b = browser(testApp(db).app)
  })

  it('lists the 13 categories in the asked language', async () => {
    const tk = await b.req('/v1/categories')
    expect(tk.json.items).toHaveLength(13)
    expect(tk.json.items[0]).toMatchObject({ id: 'beauty', name: 'Gözellik', icon: 'sparkles', bookingTypes: ['appointment'] })
    expect((await b.req('/v1/categories?lang=ru')).json.items[1].name).toBe('Барбершоп')
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

  it('the business page has everything the design shows', async () => {
    const res = await b.req(`/v1/businesses/glow-studio?${near}`)
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
    expect(d.ratingBreakdown).toEqual({ 1: 0, 2: 1, 3: 2, 4: 9, 5: 84 })
    expect(d.serviceGroups.map((g: { name: string }) => g.name)).toEqual(['Saç', 'Dyrnak', 'Ýüz ideg', 'Massaž'])
    expect(d.serviceGroups[0].services[2]).toMatchObject({ name: 'Saç reňklemek', durationMin: 120, price: { type: 'from', amount: 250 } })
    expect(d.specialists.map((s: { name: string }) => s.name)).toEqual(['Aýna', 'Maral', 'Jeren', 'Leýli'])
    expect(d.hours[6]).toEqual({ open: 600, close: 1080, break: null })
    expect(d.rules).toEqual({ cancelWindowMinutes: 120, lateToleranceMinutes: 15, note: null })
    expect(d.photos[0].url).toBe('http://media.test/demo/adam-winger-FkAZqQJTbXM-unsplash.jpg')
    expect(d.distanceM).toBeGreaterThan(2900)
    expect(d.nextFree).not.toBeNull()
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

  it('reviews, newest first, with the business reply', async () => {
    const res = await b.req('/v1/businesses/glow-studio/reviews')
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
    const s = await b.req('/v1/search/suggest?q=ma')
    expect(s.json.services).toEqual(expect.arrayContaining(['Manikýur']))
    const p = await b.req('/v1/places/suggest?q=magtym')
    expect(p.json.items[0].label).toBe('Magtymguly şaýoly')
    expect((await b.req('/v1/places/ip')).json).toEqual({ place: null })
  })
})
