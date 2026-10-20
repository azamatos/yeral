import { describe, expect, it } from 'vitest'
import { MARKET } from './market'
import { isBusinessSideCancel, isOnlineSource, isTeamSource, localized, reasonWords } from './model'

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

describe('a reason in the business’s words (B-20, B-27, B-40)', () => {
  it('"Other reason" and a closed day carry them; any other reason its label', () => {
    expect(reasonWords('other', 'The power is off')).toBe('The power is off')
    expect(reasonWords('closed', 'Repairs')).toBe('Repairs')
    expect(reasonWords('other', null)).toBeNull()
    expect(reasonWords('staff_away', 'ignored')).toBeNull()
    expect(reasonWords('hours', 'ignored')).toBeNull()
    expect(reasonWords('slot_busy', 'ignored')).toBeNull()
  })

  it('"The client called to cancel" is the client’s own cancel', () => {
    expect(isBusinessSideCancel('client_called')).toBe(false)
    expect(isBusinessSideCancel('staff_away')).toBe(true)
    expect(isBusinessSideCancel('closed')).toBe(true)
  })
})

describe('where a booking comes from', () => {
  it('the client books online (site, app, assistant); the team by phone or at the desk', () => {
    expect((['web', 'app', 'ai'] as const).every(isOnlineSource)).toBe(true)
    expect((['phone', 'walkin'] as const).every(isTeamSource)).toBe(true)
    expect(isOnlineSource('phone')).toBe(false)
    expect(isTeamSource('web')).toBe(false)
  })
})
