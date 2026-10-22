import { describe, expect, it } from 'vitest'
import { matchesCategory } from './match'

const lessons = { name: 'Lessons', hint: 'Tutor, languages' }
const nails = { name: 'Nails', hint: 'Manicure, pedicure' }

describe('matchesCategory', () => {
  it('lists every category while nothing is typed', () => {
    expect(matchesCategory(nails, '')).toBe(true)
    expect(matchesCategory(nails, '   ')).toBe(true)
  })

  it('finds a category by its name or its hint, ignoring case', () => {
    expect(matchesCategory(nails, 'NAI')).toBe(true)
    expect(matchesCategory(lessons, 'tutor')).toBe(true)
    expect(matchesCategory(nails, ' manicure ')).toBe(true)
  })

  it("doesn't match what neither holds", () => {
    expect(matchesCategory(nails, 'cafe')).toBe(false)
    expect(matchesCategory(lessons, 'nails')).toBe(false)
  })
})
