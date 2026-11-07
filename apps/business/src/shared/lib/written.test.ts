import { describe, expect, it } from 'vitest'
import { writtenIn } from './written'

describe('writtenIn', () => {
  it('writes the reader’s language over and keeps only the market’s others', () => {
    // the market speaks Turkmen, Russian and English: a starter's other two stay; an empty one goes
    expect(writtenIn({ tk: 'Saç', ru: 'Волосы', en: 'Hair' }, 'en', ' Hair and colour ')).toEqual({
      tk: 'Saç',
      ru: 'Волосы',
      en: 'Hair and colour',
    })
    expect(writtenIn({ tk: '', en: 'Hair' }, 'ru', 'Волосы')).toEqual({ en: 'Hair', ru: 'Волосы' })
    expect(writtenIn(null, 'en', 'Brows')).toEqual({ en: 'Brows' })
  })
})
