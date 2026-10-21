import { isBookingCode } from '@yeral/domain/id'
import { describe, expect, it } from 'vitest'
import { codeMaker, DEMO_CODES, seededCodes } from './codes'

/** Hands out the given codes in order, and fails rather than spin once they run out. */
const queue =
  (...codes: string[]) =>
  () => {
    const c = codes.shift()
    if (!c) throw new Error('no codes left')
    return c
  }

describe('booking codes in a seed', () => {
  it('a generated code never takes one of the demo data’s own, which stays on its booking', () => {
    const code = codeMaker(queue('YR-48213', 'YR-12345'))
    expect(code()).toBe('YR-12345')
    expect(code('YR-48213')).toBe('YR-48213')
  })

  it('a generated code is new in the seed', () => {
    const code = codeMaker(queue('YR-12345', 'YR-12345', 'YR-23456'))
    expect(code()).toBe('YR-12345')
    expect(code()).toBe('YR-23456')
  })

  it('knows every code the demo data gives, and refuses one it doesn’t or gives twice', () => {
    expect([...DEMO_CODES].sort()).toEqual(
      ['YR-43108', 'YR-44650', 'YR-44987', 'YR-45320', 'YR-46511', 'YR-47702', 'YR-47990', 'YR-48213'].sort(),
    )
    const code = codeMaker(queue())
    code('YR-47702')
    expect(() => code('YR-47702')).toThrow(/twice/)
    expect(() => code('YR-12345')).toThrow(/DEMO_CODES/)
  })

  it('in a live database, skips every code it holds, a demo booking’s own included (book F-242)', () => {
    const code = codeMaker(queue('YR-11111', 'YR-22222', 'YR-33333'), new Set(['YR-11111', 'YR-48213']))
    expect(code()).toBe('YR-22222')
    // a live booking has the design's code: the demo booking gets a generated one, and that's no mistake in the data
    expect(code('YR-48213')).toBe('YR-33333')
    expect(code('YR-47702')).toBe('YR-47702')
  })

  it('generates the same booking-shaped codes every run', () => {
    const a = seededCodes()
    const b = seededCodes()
    const first = Array.from({ length: 500 }, a)
    expect(Array.from({ length: 500 }, b)).toEqual(first)
    expect(first.every(isBookingCode)).toBe(true)
    expect(new Set(first).size).toBeGreaterThan(495)
  })
})
