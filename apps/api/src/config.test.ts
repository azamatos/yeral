/** The api's environment (`config.ts`). */
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
  it("shows Ýeral's support phone, or EXAMPLE_PHONE, and needs one of the two", () => {
    expect(loadConfig({ ...base, EXAMPLE_BUSINESSES: 'true', YERAL_SUPPORT_PHONE: '+99312345678' })).toMatchObject({
      examplePhone: '+99312345678',
    })
    expect(
      loadConfig({ ...base, EXAMPLE_BUSINESSES: 'true', YERAL_SUPPORT_PHONE: '+99312345678', EXAMPLE_PHONE: '+99312000000' }),
    ).toMatchObject({
      exampleBusinesses: true,
      examplePhone: '+99312000000',
    })
    expect(loadConfig(base)).toMatchObject({ exampleBusinesses: false, examplePhone: null })
    expect(() => loadConfig({ ...base, EXAMPLE_BUSINESSES: 'true' })).toThrow(/EXAMPLE_PHONE, YERAL_SUPPORT_PHONE/)
  })
})

describe('the ways to reach Ýeral (book F-174)', () => {
  it('come from YERAL_SUPPORT_*, each optional, and a bad one is named', () => {
    expect(loadConfig(base).site.support).toEqual({})
    expect(loadConfig({ ...base, YERAL_SUPPORT_TELEGRAM: 'yeral_support', YERAL_SUPPORT_EMAIL: 'hello@yeral.app' }).site.support).toEqual({
      telegram: 'yeral_support',
      email: 'hello@yeral.app',
    })
    expect(() => loadConfig({ ...base, YERAL_SUPPORT_TELEGRAM: '@yeral' })).toThrow(/YERAL_SUPPORT_TELEGRAM/)
    // the phone must be the market's: the examples store it, the screens write it the market's way
    expect(() => loadConfig({ ...base, YERAL_SUPPORT_PHONE: '+79123456789' })).toThrow(/YERAL_SUPPORT_PHONE/)
    expect(() => loadConfig({ ...base, EXAMPLE_PHONE: '+79123456789' })).toThrow(/EXAMPLE_PHONE/)
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
