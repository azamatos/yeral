import { describe, expect, it } from 'vitest'
import { writtenIn } from './written'

describe('writtenIn', () => {
  it('writes the reader’s language over and keeps only the market’s others', () => {
    // the market is English only: a starter's Turkmen and Russian stay out
    expect(writtenIn({ tk: 'Saç', ru: 'Волосы', en: 'Hair' }, 'en', ' Hair and colour ')).toEqual({ en: 'Hair and colour' })
    expect(writtenIn(null, 'en', 'Brows')).toEqual({ en: 'Brows' })
  })
})
