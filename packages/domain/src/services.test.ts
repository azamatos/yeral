import { describe, expect, it } from 'vitest'
import { serviceErrors, type ServiceTerms } from './services'

const haircut: ServiceTerms = { durationMin: 60, priceType: 'fixed', priceAmount: 120, bufferMin: null }

describe('a service on the menu (book B-38, chapter 5)', () => {
  it('lasts 5 to 240 minutes in 5-minute steps', () => {
    expect(serviceErrors(haircut)).toEqual({})
    for (const durationMin of [5, 240, 95]) expect(serviceErrors({ ...haircut, durationMin })).toEqual({})
    for (const durationMin of [0, 3, 245, 62, 60.5]) expect(serviceErrors({ ...haircut, durationMin })).toEqual({ durationMin: 'invalid' })
  })

  it('costs whole manats up to 99 999; a fixed or "from" price is more than nothing, a free one is nothing', () => {
    expect(serviceErrors({ ...haircut, priceAmount: 99_999 })).toEqual({})
    expect(serviceErrors({ ...haircut, priceAmount: 100_000 })).toEqual({ priceAmount: 'invalid' })
    expect(serviceErrors({ ...haircut, priceType: 'from', priceAmount: 0 })).toEqual({ priceAmount: 'invalid' })
    expect(serviceErrors({ ...haircut, priceAmount: 12.5 })).toEqual({ priceAmount: 'invalid' })
    expect(serviceErrors({ ...haircut, priceType: 'free', priceAmount: 0 })).toEqual({})
    expect(serviceErrors({ ...haircut, priceType: 'free', priceAmount: 40 })).toEqual({ priceAmount: 'invalid' })
    // a hidden price still counts in the business's revenue, so it may be anything from nothing up
    expect(serviceErrors({ ...haircut, priceType: 'hidden', priceAmount: 0 })).toEqual({})
  })

  it("takes the business's buffer, or its own: none, 5, 10, 15, 20 or 30 minutes", () => {
    for (const bufferMin of [null, 0, 5, 30]) expect(serviceErrors({ ...haircut, bufferMin })).toEqual({})
    for (const bufferMin of [7, 45, -5]) expect(serviceErrors({ ...haircut, bufferMin })).toEqual({ bufferMin: 'invalid' })
  })
})
