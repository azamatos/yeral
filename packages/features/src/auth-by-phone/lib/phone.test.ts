import { MARKET } from '@yeral/domain/market'
import { describe, expect, it } from 'vitest'
import { phoneProblem } from './phone'

describe('phoneProblem', () => {
  it('says a short number is incomplete before anything else', () => {
    expect(phoneProblem('651020')).toBe('incomplete')
    expect(phoneProblem('123')).toBe('incomplete')
  })

  it('refuses a landline: codes go to mobile numbers only', () => {
    expect(phoneProblem('12456789')).toBe('notMobile')
  })

  it("takes a mobile number of the market's length", () => {
    expect('65102030').toHaveLength(MARKET.phone.length)
    expect(phoneProblem('65102030')).toBeUndefined()
  })
})
