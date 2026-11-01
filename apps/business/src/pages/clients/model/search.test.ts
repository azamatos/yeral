import { describe, expect, it } from 'vitest'
import { clientsSearch } from './search'

describe('the clients list’s address', () => {
  it('keeps the search, a chip and the modal', () => {
    expect(clientsSearch({ q: 'gö', segment: 'regular', modal: 'add' })).toEqual({ q: 'gö', segment: 'regular', modal: 'add' })
  })

  it('drops what it doesn’t know', () => {
    expect(clientsSearch({ q: '', segment: 'vip', modal: 'edit' })).toEqual({})
  })
})
