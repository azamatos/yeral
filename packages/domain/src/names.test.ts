import { describe, expect, it } from 'vitest'
import { fullName, reviewName, splitName } from './names'

describe('names (book Q-156)', () => {
  it('a one-field name splits at the first space', () => {
    expect(splitName('Aýjemal Gurbanowa')).toEqual({ first: 'Aýjemal', surname: 'Gurbanowa' })
    expect(splitName('  Aýjemal   Gurbanowa  ')).toEqual({ first: 'Aýjemal', surname: 'Gurbanowa' })
    expect(splitName('Ogulgerek Durdy gyzy')).toEqual({ first: 'Ogulgerek', surname: 'Durdy gyzy' })
    expect(splitName('Aýjemal')).toEqual({ first: 'Aýjemal', surname: null })
    expect(splitName('  ')).toEqual({ first: null, surname: null })
    expect(splitName(null)).toEqual({ first: null, surname: null })
  })

  it('businesses see the whole name', () => {
    expect(fullName({ first: 'Aýjemal', surname: 'Gurbanowa' })).toBe('Aýjemal Gurbanowa')
    expect(fullName({ first: 'Aýjemal', surname: null })).toBe('Aýjemal')
    expect(fullName({ first: null, surname: 'Gurbanowa' })).toBeNull()
  })

  it('a review is signed with the surname’s initial, or the first name alone', () => {
    expect(reviewName({ first: 'Aýjemal', surname: 'Gurbanowa' })).toBe('Aýjemal G.')
    expect(reviewName({ first: 'Aýjemal', surname: null })).toBe('Aýjemal')
    // a surname starting with a letter outside ASCII keeps it
    expect(reviewName({ first: 'Merdan', surname: 'Öwezow' })).toBe('Merdan Ö.')
  })
})
