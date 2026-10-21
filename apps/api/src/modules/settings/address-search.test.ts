/** The address search behind the map pin (book B-04, B-37; ADR 0027), through a memory geocoder. */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'
import { memoryGeocoder, type GeocoderPort } from '../../ports/geocoder'
import { ADDRESS_SEARCHES_PER_HOUR } from './address-search'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // a specialist there
const SEARCH = '/v1/w/glow-studio/settings/address-search'

const place = (label: string, country = 'tm') => ({
  label,
  line: label.split(', ')[0]!,
  street: label.split(', ')[0]!.replace(/^\d+ /, ''),
  lat: 37.95,
  lng: 58.38,
  country,
})

describe('the address search (ADR 0027)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  const geocoder = memoryGeocoder([
    place('247 Bitarap Türkmenistan Avenue, Ashgabat'),
    place('12 Bitarap Street, Mary'),
    place('5 Bitarap Street, Tashkent', 'uz'),
  ])
  const app = (geo: GeocoderPort = geocoder) => (t = testApp(db, { geocoder: geo }))
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    app()
  })
  const as = async (phone: string) => {
    const b = browser(t.app)
    await b.login(phone)
    return b
  }

  it('the owner gets addresses in the market to pick; a specialist, a short query and an unknown city don’t', async () => {
    const maysa = await as(MAYSA)
    const found = await maysa.req(`${SEARCH}?q=bitarap&cityId=ashgabat`)
    expect(found.status).toBe(200)
    expect(found.json.items.map((p: { label: string }) => p.label)).toEqual([
      '247 Bitarap Türkmenistan Avenue, Ashgabat',
      '12 Bitarap Street, Mary',
    ])
    expect(found.json.items[0]).toMatchObject({ line: '247 Bitarap Türkmenistan Avenue', street: 'Bitarap Türkmenistan Avenue' })
    expect((await (await as(AYNA)).req(`${SEARCH}?q=bitarap&cityId=ashgabat`)).status).toBe(403)
    expect((await maysa.req(`${SEARCH}?q=bi&cityId=ashgabat`)).status).toBe(400)
    expect((await maysa.req(`${SEARCH}?q=bitarap&cityId=nowhere`)).json.error.code).toBe('validation_error')
  })

  it('so many an hour per account; off or failing, it says so and the pin is placed by hand', async () => {
    const maysa = await as(MAYSA)
    const { id } = (await maysa.req('/v1/me')).json as { id: string }
    await db.insert(rateLimits).values({ key: `geo:user:${id}`, windowStart: new Date(DEMO_NOW), count: ADDRESS_SEARCHES_PER_HOUR })
    expect((await maysa.req(`${SEARCH}?q=bitarap&cityId=ashgabat`)).json.error.code).toBe('rate_limited')
    await db.delete(rateLimits)
    app({ on: false, search: () => Promise.resolve([]) })
    const off = await (await as(MAYSA)).req(`${SEARCH}?q=bitarap&cityId=ashgabat`)
    expect([off.status, off.json.error.code]).toEqual([503, 'address_search_unavailable'])
    app({ on: true, search: () => Promise.reject(new Error('geocoder answered 429')) })
    const down = await (await as(MAYSA)).req(`${SEARCH}?q=bitarap&cityId=ashgabat`)
    expect([down.status, down.json.error.code]).toEqual([503, 'address_search_unavailable'])
  })
})
