import { describe, expect, it } from 'vitest'
import { businessState } from './state'

const live = { setupStep: null, closed: null, hidden: null, verification: 'verified', addressChangedAt: null } as const
const at = { at: 1, reason: 'why' }

describe('businessState', () => {
  it('reads the verdict', () => {
    expect(businessState(live)).toBe('verified')
    expect(businessState({ ...live, verification: 'pending' })).toBe('review')
    expect(businessState({ ...live, verification: 'rejected' })).toBe('rejected')
    expect(businessState({ ...live, addressChangedAt: 5 })).toBe('moved')
  })

  it('puts what keeps it off the site first', () => {
    expect(businessState({ ...live, hidden: at })).toBe('hidden')
    expect(businessState({ ...live, closed: at, hidden: at })).toBe('closed')
    expect(businessState({ ...live, setupStep: 'hours', verification: 'pending' })).toBe('draft')
  })
})
