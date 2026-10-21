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
  it('needs the phone the examples show', () => {
    expect(() => loadConfig({ ...base, EXAMPLE_BUSINESSES: 'true' })).toThrow(/EXAMPLE_PHONE/)
    expect(loadConfig({ ...base, EXAMPLE_BUSINESSES: 'true', EXAMPLE_PHONE: '+99312000000' })).toMatchObject({
      exampleBusinesses: true,
      examplePhone: '+99312000000',
    })
  })
})
