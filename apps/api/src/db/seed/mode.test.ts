import { describe, expect, it } from 'vitest'
import { assertSeedTarget, seedMode } from './mode'

describe('seedMode', () => {
  it('seeds the demo (which wipes the database) only where YERAL_ENV says so explicitly', () => {
    expect(seedMode('local')).toBe('demo')
    expect(seedMode('docker')).toBe('demo')
  })

  it('gives production the category catalogue only', () => {
    expect(seedMode('production')).toBe('catalogue')
  })

  it('refuses when YERAL_ENV is not set, so a server never gets the demo by default', () => {
    expect(() => seedMode(undefined)).toThrow(/YERAL_ENV/)
    expect(() => seedMode('')).toThrow(/YERAL_ENV/)
    // no staging any more (ADR 0020)
    expect(() => seedMode('staging')).toThrow(/YERAL_ENV/)
  })

  it('never seeds the demo into a remote database, even with --allow-remote', () => {
    const remote = { local: false, host: 'ep-x.neon.tech' }
    expect(() => assertSeedTarget({ ...remote, demo: true, allowRemote: true })).toThrow(/demo/)
    expect(() => assertSeedTarget({ ...remote, demo: false, allowRemote: false })).toThrow(/--allow-remote/)
    expect(() => assertSeedTarget({ ...remote, demo: false, allowRemote: true })).not.toThrow()
    expect(() => assertSeedTarget({ local: true, host: 'localhost', demo: true, allowRemote: false })).not.toThrow()
  })
})
