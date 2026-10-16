import { describe, expect, it } from 'vitest'
import { bookingCode, isBookingCode, newId } from './id'

describe('ids', () => {
  it('newId is a UUID', () => {
    expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('booking codes read like YR-48213 and can grow', () => {
    for (let i = 0; i < 200; i++) expect(bookingCode()).toMatch(/^YR-[1-9]\d{4}$/)
    expect(bookingCode(6)).toMatch(/^YR-[1-9]\d{5}$/)
    expect(isBookingCode('YR-48213')).toBe(true)
    expect(isBookingCode('YR-04821')).toBe(false)
    expect(isBookingCode('48213')).toBe(false)
  })

  it('long codes use the whole range, beyond what one 32-bit draw covers', () => {
    const codes = Array.from({ length: 200 }, () => bookingCode(12))
    for (const c of codes) expect(c).toMatch(/^YR-[1-9]\d{11}$/)
    // one Uint32 reaches only 100 000 000 000 + 4 294 967 295: every code would start with "10"
    expect(new Set(codes.map((c) => c.slice(3, 4))).size).toBeGreaterThan(1)
  })
})
