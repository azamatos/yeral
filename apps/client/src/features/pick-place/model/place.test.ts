import { afterEach, describe, expect, it } from 'vitest'
import { placeAddress, readPlace } from './place'

const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => void store.set(key, value),
} as Storage

afterEach(() => store.clear())

describe('readPlace', () => {
  it('reads what was kept', () => {
    store.set('yeral.place', JSON.stringify({ kind: 'city', id: 'mary' }))
    expect(readPlace()).toEqual({ kind: 'city', id: 'mary' })
    store.set('yeral.place', JSON.stringify({ kind: 'near', lat: 37.9, lng: 58.3 }))
    expect(readPlace()).toEqual({ kind: 'near', lat: 37.9, lng: 58.3 })
  })

  it('takes nothing else for a place', () => {
    expect(readPlace()).toBeNull()
    store.set('yeral.place', 'not json')
    expect(readPlace()).toBeNull()
    store.set('yeral.place', JSON.stringify({ kind: 'near', lat: 'north' }))
    expect(readPlace()).toBeNull()
    store.set('yeral.place', JSON.stringify({ kind: 'mars' }))
    expect(readPlace()).toBeNull()
  })
})

describe('placeAddress', () => {
  it('says a place in the search’s address', () => {
    expect(placeAddress(null)).toEqual({})
    expect(placeAddress({ kind: 'city', id: 'mary' })).toEqual({ city: 'mary' })
    expect(placeAddress({ kind: 'point', label: 'Park', lat: 37.123456789, lng: 58.1 })).toEqual({ near: '37.12346,58.10000' })
  })
})
