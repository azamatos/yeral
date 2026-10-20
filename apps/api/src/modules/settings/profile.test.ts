/** The business profile (book B-37, Q-215): what the public page says about the business. */
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, rateLimits, verificationHistory } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // a specialist there
const PROFILE = '/v1/w/glow-studio/settings/profile'

describe('the business profile (book B-37)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
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
  const page = async (b: ReturnType<typeof browser>) => (await b.req('/v1/businesses/glow-studio?lang=en')).json

  it('the owner reads and changes it, and the client page follows; a specialist gets 403', async () => {
    const maysa = await as(MAYSA)
    const before = await maysa.req(PROFILE)
    expect(before.status).toBe(200)
    expect(before.json).toMatchObject({
      slug: 'glow-studio',
      name: 'Glow Studio',
      categoryId: 'beauty',
      about: { en: expect.any(String) },
      phone: expect.stringMatching(/^\+993/),
      amenities: expect.arrayContaining(['wifi']),
      location: { cityId: 'ashgabat', address: expect.any(String), lat: expect.any(Number), lng: expect.any(Number) },
      hideExactAddress: false,
      verification: 'verified',
    })
    const changed = await maysa.req(PROFILE, {
      method: 'PATCH',
      body: {
        name: 'Glow Studio & Spa',
        about: { en: 'Hair, nails and quiet.' },
        phone: '+993 12 34-56-78',
        amenities: ['wifi', 'parking'],
      },
    })
    expect(changed.status).toBe(200)
    expect(changed.json).toMatchObject({ name: 'Glow Studio & Spa', phone: '+99312345678', amenities: ['wifi', 'parking'] })
    expect(await page(maysa)).toMatchObject({
      name: 'Glow Studio & Spa',
      about: 'Hair, nails and quiet.',
      phone: '+99312345678',
      amenities: ['wifi', 'parking'],
    })
    const ayna = await as(AYNA)
    expect((await ayna.req(PROFILE)).status).toBe(403)
    expect((await ayna.req(PROFILE, { method: 'PATCH', body: { name: 'Mine' } })).status).toBe(403)
  })

  it('a move keeps everything and is noted for the Ýeral team to check again (Q-215)', async () => {
    const maysa = await as(MAYSA)
    const location = { cityId: 'ashgabat', address: 'Oguzhan köçesi 12', street: 'Oguzhan köçesi', lat: 37.94, lng: 58.38 }
    const moved = await maysa.req(PROFILE, { method: 'PATCH', body: { location, entranceNote: 'Second floor' } })
    expect(moved.json).toMatchObject({ location, entranceNote: 'Second floor', verification: 'verified' })
    expect(await page(maysa)).toMatchObject({ address: 'Oguzhan köçesi 12', entranceNote: 'Second floor' })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const notes = await db.select().from(verificationHistory).where(eq(verificationHistory.businessId, glow!.id))
    expect(notes.map((n) => [n.status, n.reason])).toContainEqual(['verified', 'address changed'])
    // an unknown city
    const lost = await maysa.req(PROFILE, { method: 'PATCH', body: { location: { ...location, cityId: 'atlantis' } } })
    expect(lost.status).toBe(400)
    expect(lost.json.error.details.issues).toEqual([{ path: ['location', 'cityId'], code: 'invalid' }])
    // home-based: the page shows only the street until a booking is confirmed
    await maysa.req(PROFILE, { method: 'PATCH', body: { hideExactAddress: true } })
    expect(await page(maysa)).toMatchObject({ address: 'Oguzhan köçesi', entranceNote: null })
  })

  it('a category of the same kind of booking only; amenities from the list', async () => {
    const maysa = await as(MAYSA)
    expect((await maysa.req(PROFILE, { method: 'PATCH', body: { categoryId: 'nails' } })).json.categoryId).toBe('nails')
    expect((await page(maysa)).category).toEqual({ id: 'nails', name: expect.any(String) })
    // tables are another kind of booking (and come after the MVP)
    const tables = await maysa.req(PROFILE, { method: 'PATCH', body: { categoryId: 'restaurant' } })
    expect(tables.json.error.details.issues).toEqual([{ path: ['categoryId'], code: 'invalid' }])
    expect((await maysa.req(PROFILE, { method: 'PATCH', body: { categoryId: 'nowhere' } })).status).toBe(400)
    expect((await maysa.req(PROFILE, { method: 'PATCH', body: { amenities: ['jacuzzi'] } })).status).toBe(400)
    expect((await maysa.req(PROFILE, { method: 'PATCH', body: { name: '' } })).status).toBe(400)
  })
})
