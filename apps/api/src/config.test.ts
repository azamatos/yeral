/** The api's environment (`config.ts`). */
import { MARKET } from '@yeral/domain/market'
import { describe, expect, it } from 'vitest'
import { DEV_ADMIN_KEY, loadConfig } from './config'

const base = { DATABASE_URL: 'postgres://yeral@localhost:5432/yeral' }
const key = (bytes: number) => btoa(String.fromCharCode(...new Uint8Array(bytes).fill(5)))

describe('ADMIN_SECRET_KEY (ADR 0026)', () => {
  it('a fixed key outside production, none in production unless set, and a wrong one named', () => {
    expect(loadConfig(base).adminKey).toEqual(DEV_ADMIN_KEY)
    expect(loadConfig({ ...base, YERAL_ENV: 'production' }).adminKey).toBeNull()
    expect(loadConfig({ ...base, YERAL_ENV: 'production', ADMIN_SECRET_KEY: key(32) }).adminKey).toEqual(new Uint8Array(32).fill(5))
    expect(() => loadConfig({ ...base, ADMIN_SECRET_KEY: 'not base64!!' })).toThrow(/ADMIN_SECRET_KEY/)
    expect(() => loadConfig({ ...base, ADMIN_SECRET_KEY: key(31) })).toThrow(/ADMIN_SECRET_KEY/)
  })
})

describe('EXAMPLE_BUSINESSES (book Q-004)', () => {
  it("shows the market's support line, or EXAMPLE_PHONE", () => {
    expect(loadConfig({ ...base, EXAMPLE_BUSINESSES: 'true' })).toMatchObject({ examplePhone: MARKET.support.phone })
    expect(loadConfig({ ...base, EXAMPLE_BUSINESSES: 'true', EXAMPLE_PHONE: '+99312000000' })).toMatchObject({
      exampleBusinesses: true,
      examplePhone: '+99312000000',
    })
  })
})

describe('GEOCODER_URL (ADR 0027)', () => {
  it('the public Photon by default, any http address (a path too), off, and nothing else', () => {
    expect(loadConfig(base).geocoderUrl).toBe('https://photon.komoot.io')
    expect(loadConfig({ ...base, GEOCODER_URL: 'http://photon:2322/photon' }).geocoderUrl).toBe('http://photon:2322/photon')
    expect(loadConfig({ ...base, GEOCODER_URL: 'off' }).geocoderUrl).toBeNull()
    expect(() => loadConfig({ ...base, GEOCODER_URL: 'ftp://photon.test' })).toThrow(/GEOCODER_URL/)
  })
})
