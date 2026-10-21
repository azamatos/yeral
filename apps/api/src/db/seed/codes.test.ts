import type * as Ids from '@yeral/domain/id'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// the codes the "random" generator hands out, in order
const next = vi.hoisted(() => ({ codes: [] as string[] }))
vi.mock('@yeral/domain/id', async (actual) => ({
  ...(await actual<typeof Ids>()),
  bookingCode: () => next.codes.shift() ?? 'YR-99999',
}))

const { DEMO_CODES, seedCode } = await import('./codes')

describe('booking codes in a seed', () => {
  beforeEach(() => {
    next.codes = []
  })

  it('a generated code never takes one of the demo data’s own, which stays on its booking', () => {
    const used = new Set<string>()
    next.codes = ['YR-48213', 'YR-12345']
    expect(seedCode(used)).toBe('YR-12345')
    expect(seedCode(used, 'YR-48213')).toBe('YR-48213')
  })

  it('a generated code is new in the seed', () => {
    const used = new Set(['YR-12345'])
    next.codes = ['YR-12345', 'YR-23456']
    expect(seedCode(used)).toBe('YR-23456')
    expect(used.has('YR-23456')).toBe(true)
  })

  it('knows every code the demo data gives, and refuses one given twice', () => {
    for (const c of ['YR-48213', 'YR-47990', 'YR-47702', 'YR-44650', 'YR-43108']) expect(DEMO_CODES.has(c)).toBe(true)
    const used = new Set<string>()
    seedCode(used, 'YR-47702')
    expect(() => seedCode(used, 'YR-47702')).toThrow(/YR-47702/)
  })
})
