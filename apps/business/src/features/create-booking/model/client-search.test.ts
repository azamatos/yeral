import { describe, expect, it } from 'vitest'
import { digitsMatchIn, isDigitsQuery, matchIn } from './client-search'

describe('isDigitsQuery', () => {
  it('tells digits from letters, spaces and +993 allowed', () => {
    expect(isDigitsQuery('65 12')).toBe(true)
    expect(isDigitsQuery('+993 6')).toBe(true)
    expect(isDigitsQuery('jahan')).toBe(false)
    expect(isDigitsQuery('ja 65')).toBe(false)
    expect(isDigitsQuery(' + ')).toBe(false)
  })
})

describe('matchIn', () => {
  it('finds the letters anywhere in the name, whatever the case', () => {
    expect(matchIn('Jahan Muradowa', 'ja')).toEqual([0, 2])
    expect(matchIn('Aýjahan Rejepowa', 'JAHAN')).toEqual([2, 7])
    expect(matchIn('Jahan Muradowa', 'x')).toBeNull()
    expect(matchIn('Jahan Muradowa', '  ')).toBeNull()
  })
})

describe('digitsMatchIn', () => {
  const number = '+993 65 12 34 56'
  it('skips the spaces and the plus', () => {
    expect(digitsMatchIn(number, '65 12', '993')).toEqual([5, 10])
    expect(digitsMatchIn(number, '6512', '993')).toEqual([5, 10])
    expect(digitsMatchIn(number, '+993 6', '993')).toEqual([1, 6])
  })
  it('finds the national part when the country code is typed but not written first', () => {
    expect(digitsMatchIn('+993 65 12 34 56', '99365', '993')).toEqual([1, 7])
    expect(digitsMatchIn(number, '99', '993')).toEqual([1, 3])
    expect(digitsMatchIn(number, '77', '993')).toBeNull()
  })
})
