import { describe, expect, it } from 'vitest'
import { firstMissing, hasAbout, qualityOf } from './done'

describe('the done step', () => {
  it('rings the first item not done and leaves the rest to do', () => {
    expect(qualityOf({ logo: false, photos: 0, about: false })).toEqual({ logo: 'current', photos: 'todo', about: 'todo' })
    expect(qualityOf({ logo: true, photos: 2, about: false })).toEqual({ logo: 'done', photos: 'current', about: 'todo' })
    expect(qualityOf({ logo: true, photos: 3, about: false })).toEqual({ logo: 'done', photos: 'done', about: 'current' })
    expect(qualityOf({ logo: false, photos: 5, about: true })).toEqual({ logo: 'current', photos: 'done', about: 'done' })
    expect(qualityOf({ logo: true, photos: 20, about: true })).toEqual({ logo: 'done', photos: 'done', about: 'done' })
  })

  it('counts an About in any language, not one of spaces', () => {
    expect(hasAbout({})).toBe(false)
    expect(hasAbout({ en: '  ' })).toBe(false)
    expect(hasAbout({ en: '', tk: 'Gözellik salony' })).toBe(true)
  })

  it('sends a finish that found gaps to the earliest step missing', () => {
    expect(firstMissing(['services', 'address'])).toBe('address')
    expect(firstMissing(['services'])).toBe('services')
    expect(firstMissing([])).toBeNull()
  })
})
