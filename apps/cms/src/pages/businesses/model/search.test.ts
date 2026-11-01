import { describe, expect, it } from 'vitest'
import { businessesSearch } from './search'

describe('the businesses list’s address', () => {
  it('keeps a view and a search', () => {
    expect(businessesSearch({ view: 'moved', q: 'glow' })).toEqual({ view: 'moved', q: 'glow' })
  })

  it('leaves out the queue, which is the default, and what it doesn’t know', () => {
    expect(businessesSearch({ view: 'review', q: '' })).toEqual({})
    expect(businessesSearch({ view: 'nothing', other: 1 })).toEqual({})
  })
})
