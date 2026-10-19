/** The city as data (book Q-107). */
import { MARKET } from '@yeral/domain/market'
import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, cities } from '../../db/schema'
import { seed, seedCatalogue } from '../../db/seed'
import { CITIES } from '../../db/seed/cities'
import { DEMO_CENTER } from '../../db/seed/demo-data'

const near = `lat=${DEMO_CENTER.lat}&lng=${DEMO_CENTER.lng}`
const slugs = (res: { json: { items: { slug: string }[] } }) => res.json.items.map((i) => i.slug)
const cityIds = (res: { json: { items: { city: { id: string } }[] } }) => res.json.items.map((i) => i.city.id)

describe('cities (book Q-107)', () => {
  let db: Db
  let b: ReturnType<typeof browser>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    b = browser(testApp(db).app)
    // Barber Loft moves to Mary (its point stays, so distances from the demo centre still work)
    await db.update(businesses).set({ cityId: 'mary' }).where(eq(businesses.slug, 'barber-loft'))
  })

  it("the market's main city is one of its cities", () => {
    expect(CITIES[MARKET.code]?.map((c) => c.id)).toContain(MARKET.mainCity)
  })

  it("lists the market's cities, the main one, and the one a position is in", async () => {
    const all = await b.req('/v1/cities')
    expect(all.json.items.map((c: { id: string }) => c.id)).toEqual(CITIES[MARKET.code]?.map((c) => c.id))
    expect(all.json).toMatchObject({ main: MARKET.mainCity, nearest: null })
    expect(all.json.items[0]).toMatchObject({ id: 'ashgabat', name: 'Ashgabat' })
    expect((await b.req('/v1/cities?lang=tk')).json.items[0].name).toBe('Aşgabat')
    expect((await b.req(`/v1/cities?${near}`)).json.nearest).toBe('ashgabat')
    // abroad: in no city, the client starts in the main one
    expect((await b.req('/v1/cities?lat=41.3&lng=69.24')).json.nearest).toBeNull()
    expect((await b.req('/v1/cities?lat=41.3')).status).toBe(400)
  })

  it("without a city or a position the list keeps to the market's main city", async () => {
    const res = await b.req('/v1/search')
    expect(res.json.city).toBe(MARKET.mainCity)
    expect(slugs(res)).not.toContain('barber-loft')
    expect(res.json.items.length).toBeGreaterThan(0)
    expect(cityIds(res)).toEqual(res.json.items.map(() => MARKET.mainCity))
  })

  it('a chosen city keeps the list to it', async () => {
    const mary = await b.req('/v1/search?city=mary')
    expect(mary.json).toMatchObject({ city: 'mary', located: false })
    expect(slugs(mary)).toEqual(['barber-loft'])
    expect(mary.json.items[0].city).toEqual({ id: 'mary', name: 'Mary' })
  })

  it('an unknown city counts as the main one, and says so', async () => {
    const res = await b.req('/v1/search?city=nowhere')
    expect(res.json.city).toBe(MARKET.mainCity)
    expect(res.json.items.length).toBeGreaterThan(0)
  })

  it('a position (near me, or around a picked place) and the map area cross city lines, the radius kept', async () => {
    const nearMe = await b.req(`/v1/search?city=ashgabat&${near}&r=25`)
    expect(nearMe.json.city).toBeNull()
    for (const i of nearMe.json.items) expect(i.distanceM).toBeLessThanOrEqual(25_000)
    expect(cityIds(nearMe)).toEqual(expect.arrayContaining(['mary', 'ashgabat']))
    const area = await b.req('/v1/search?bbox=37.8,58.2,38.1,58.6&city=ashgabat')
    expect(area.json.city).toBeNull()
    expect(cityIds(area)).toEqual(expect.arrayContaining(['mary', 'ashgabat']))
  })

  it("the business page names its city, in the reader's language", async () => {
    expect((await b.req('/v1/businesses/barber-loft?lang=ru')).json.city).toEqual({ id: 'mary', name: 'Мары' })
    expect((await b.req('/v1/businesses/glow-studio')).json.city).toEqual({ id: 'ashgabat', name: 'Ashgabat' })
  })

  it('"Nirede?" suggests places in the chosen city', async () => {
    expect((await b.req('/v1/places/suggest?q=magtym&lang=tk&city=ashgabat')).json.items).toHaveLength(1)
    expect((await b.req('/v1/places/suggest?q=magtym&lang=tk&city=mary')).json.items).toEqual([])
  })

  it('"Näme?" suggests services and businesses in the chosen city, as search keeps to it', async () => {
    const names = (res: { json: { businesses: { slug: string }[] } }) => res.json.businesses.map((x) => x.slug)
    expect(names(await b.req('/v1/search/suggest?q=barber'))).toContain('barber-loft')
    expect(names(await b.req('/v1/search/suggest?q=barber&city=mary'))).toEqual(['barber-loft'])
    expect(names(await b.req('/v1/search/suggest?q=barber&city=ashgabat'))).not.toContain('barber-loft')
  })

  it('setup brings the cities up to date in a database whose demo it keeps', async () => {
    await db.delete(cities).where(eq(cities.id, 'turkmenabat'))
    await seedCatalogue(db)
    expect((await db.select().from(cities)).map((c) => c.id)).toContain('turkmenabat')
  })
})
