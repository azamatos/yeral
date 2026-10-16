import { describe, expect, it } from 'vitest'
import { seedMode } from './mode'

describe('seedMode', () => {
  it('seeds the demo (which wipes the database) only where YERAL_ENV says so explicitly', () => {
    expect(seedMode('local')).toBe('demo')
    expect(seedMode('docker')).toBe('demo')
    expect(seedMode('staging')).toBe('demo')
  })

  it('gives production the category catalogue only', () => {
    expect(seedMode('production')).toBe('catalogue')
  })

  it('refuses when YERAL_ENV is not set, so a server never gets the demo by default', () => {
    expect(() => seedMode(undefined)).toThrow(/YERAL_ENV/)
    expect(() => seedMode('')).toThrow(/YERAL_ENV/)
  })
})
