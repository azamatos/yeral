import { describe, expect, it } from 'vitest'
import { clientsSearch } from './search'

describe('the clients list’s address', () => {
  it('keeps the search, a chip, the sort with its direction and the modal', () => {
    expect(clientsSearch({ q: 'gö', segment: 'regular', sort: 'visits', dir: 'asc', modal: 'add' })).toEqual({
      q: 'gö',
      segment: 'regular',
      sort: 'visits',
      dir: 'asc',
      modal: 'add',
    })
  })

  it('drops what it doesn’t know, and a direction without a sort', () => {
    expect(clientsSearch({ q: '', segment: 'vip', sort: 'phone', dir: 'desc', modal: 'edit' })).toEqual({})
    expect(clientsSearch({ sort: 'name', dir: 'down' })).toEqual({ sort: 'name' })
  })
})
