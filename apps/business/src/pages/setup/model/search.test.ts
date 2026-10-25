import { describe, expect, it } from 'vitest'
import { setupSearch } from './search'

describe("the setup's search", () => {
  it('keeps the ask for another business', () => {
    // the router parses `?another=true` into a boolean
    expect(setupSearch({ another: true })).toEqual({ another: true })
  })

  it('drops anything else', () => {
    expect(setupSearch({})).toEqual({})
    expect(setupSearch({ another: false })).toEqual({})
    expect(setupSearch({ another: 'yes', step: 'business' })).toEqual({})
  })
})
