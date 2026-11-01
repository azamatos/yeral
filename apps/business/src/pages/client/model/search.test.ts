import { describe, expect, it } from 'vitest'
import { clientSearch } from './search'

describe('clientSearch', () => {
  it('keeps a longer history and the delete modal', () => {
    expect(clientSearch({ history: 20, remove: true })).toEqual({ history: 20, remove: true })
  })

  it('leaves the first page for anything else', () => {
    expect(clientSearch({ history: 10 })).toEqual({})
    expect(clientSearch({ history: 201 })).toEqual({})
    expect(clientSearch({ history: 12.5 })).toEqual({})
    expect(clientSearch({ history: '20', remove: 'yes' })).toEqual({})
  })
})
