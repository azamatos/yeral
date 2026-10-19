import { describe, expect, it } from 'vitest'
import { MARKET } from './market'
import { localized } from './model'

describe('localized (book Q-102: any one language is enough)', () => {
  it('picks the asked language', () => {
    expect(localized({ en: 'Haircut', ru: 'Стрижка', tk: 'Saç kesimi' }, 'ru')).toBe('Стрижка')
  })

  it("falls back to the market's main language", () => {
    expect(MARKET.defaultLanguage).toBe('en')
    expect(localized({ en: 'Haircut', tk: 'Saç kesimi' }, 'ru')).toBe('Haircut')
  })

  it('else shows the language the business wrote', () => {
    expect(localized({ ru: 'Стрижка' }, 'en')).toBe('Стрижка')
    expect(localized({ tk: 'Saç kesimi' }, 'en')).toBe('Saç kesimi')
  })

  it('treats an empty text as not written', () => {
    expect(localized({ en: '', tk: 'Saç kesimi' }, 'en')).toBe('Saç kesimi')
    expect(localized({}, 'en')).toBe('')
  })
})
