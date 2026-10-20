import { DEFAULT_LOCALE } from '@yeral/i18n'
import { describe, expect, it } from 'vitest'
import { acceptedLanguages, pickLocale } from './locale'

describe('acceptedLanguages', () => {
  it('lists the primary languages, most wanted first', () => {
    expect(acceptedLanguages('ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7')).toEqual(['ru', 'ru', 'en', 'en'])
    expect(acceptedLanguages('en;q=0.5, tk')).toEqual(['tk', 'en'])
  })

  it('keeps the order of equal weights and drops what nobody wants', () => {
    expect(acceptedLanguages('de, fr')).toEqual(['de', 'fr'])
    expect(acceptedLanguages('*, ru;q=0')).toEqual([])
  })

  it('is empty without a header', () => {
    expect(acceptedLanguages(null)).toEqual([])
    expect(acceptedLanguages('')).toEqual([])
  })
})

describe('pickLocale (book Q-132)', () => {
  // a market with several languages, like Turkmenistan's launch
  const locales = ['en', 'tk', 'ru'] as const

  it("opens in the person's own language when the site has it", () => {
    expect(pickLocale({ saved: 'ru', accepted: ['tk'], locales })).toBe('ru')
  })

  it('else the first language the browser asks for that the site has', () => {
    expect(pickLocale({ saved: 'de', accepted: ['de', 'tk', 'en'], locales })).toBe('tk')
    expect(pickLocale({ accepted: ['fr', 'ru'], locales })).toBe('ru')
  })

  it("else the market's main language", () => {
    expect(pickLocale({ accepted: ['de', 'fr'], locales })).toBe(DEFAULT_LOCALE)
    expect(pickLocale({ saved: null, accepted: [] })).toBe(DEFAULT_LOCALE)
  })

  it("never opens a language this site doesn't offer", () => {
    expect(pickLocale({ saved: 'ru', accepted: ['ru'], locales: [DEFAULT_LOCALE] })).toBe(DEFAULT_LOCALE)
  })
})
