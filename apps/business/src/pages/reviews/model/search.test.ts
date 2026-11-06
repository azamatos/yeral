import { describe, expect, it } from 'vitest'
import { reviewsSearch } from './search'

describe('the reviews list address', () => {
  it('keeps a known chip, specialist and sort, and drops the rest', () => {
    expect(reviewsSearch({ stars: '4', staff: 'st-1', order: 'lowest' })).toEqual({ stars: 4, staff: 'st-1', order: 'lowest' })
    expect(reviewsSearch({ filter: 'unanswered' })).toEqual({ filter: 'unanswered' })
    expect(reviewsSearch({ stars: '9', filter: 'read', staff: '', order: 'random', q: 'x' })).toEqual({})
  })

  it('leaves the usual sort and lets the stars win over «not answered»', () => {
    expect(reviewsSearch({ order: 'newest' })).toEqual({})
    expect(reviewsSearch({ stars: 5, filter: 'unanswered' })).toEqual({ stars: 5 })
  })
})
