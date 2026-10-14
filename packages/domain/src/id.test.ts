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
})
