import { MARKET } from '@yeral/domain/market'
import { describe, expect, it } from 'vitest'
import { createFmt, createT, formatNumber } from './fmt'
import { DEFAULT_LOCALE, LOCALES, MARKET_LOCALES, messages } from './messages'

const tk = createFmt('tk')
const ru = createFmt('ru')
const en = createFmt('en')

describe('numbers and money', () => {
  it('groups thousands with a no-break space in tk and ru, a comma in en; decimal comma in tk and ru', () => {
    expect(formatNumber('tk', 1410)).toBe('1\u00a0410')
    expect(formatNumber('tk', 980)).toBe('980')
    expect(formatNumber('tk', 14100)).toBe('14 100')
    expect(formatNumber('en', 14100)).toBe('14,100')
    expect(tk.rating(4.9)).toBe('4,9')
    expect(en.rating(4.9)).toBe('4.9')
  })

  it("writes money in the market's currency (Turkmenistan: manats)", () => {
    expect(MARKET.currency).toBe('TMT')
    expect(en.money(1410)).toBe('1,410 TMT')
    expect(en.price({ type: 'from', amount: 250 })).toBe('from 250 TMT')
    expect(tk.money(1410)).toBe('1 410 TMT')
  })

  it('prints prices the way the design does', () => {
    expect(tk.money(40)).toBe('40 TMT')
    expect(tk.price({ type: 'fixed', amount: 80 })).toBe('80 TMT')
    expect(tk.price({ type: 'from', amount: 250 })).toBe('250 TMT-den')
    expect(ru.price({ type: 'from', amount: 250 })).toBe('от 250 TMT')
    expect(tk.price({ type: 'free', amount: 0 })).toBe('Mugt')
    expect(tk.price({ type: 'hidden', amount: 0 }, 150)).toBe('≈ 150 TMT')
    expect(tk.price({ type: 'hidden', amount: 0 })).toBe('')
  })
})

describe('addresses', () => {
  it('writes an address with its city (book Q-107)', () => {
    expect(en.addressIn('Andalyp street 8', 'Mary')).toBe('Andalyp street 8, Mary')
    expect(ru.addressIn('ул. Андалиба 8', 'Мары')).toBe('ул. Андалиба 8, Мары')
  })
})

describe('durations and distances', () => {
  it.each([
    [30, '30 min'],
    [60, '60 min'],
    [75, '1 sag 15 min'],
    [90, '1 sag 30 min'],
    [120, '2 sag'],
  ])('tk duration %i = %s', (min, text) => {
    expect(tk.duration(min)).toBe(text)
  })

  it('ru and en durations', () => {
    expect(ru.duration(90)).toBe('1 ч 30 мин')
    expect(en.duration(120)).toBe('2 h')
  })

  it.each([
    [850, '850 m'],
    [1200, '1,2 km'],
    [3000, '3 km'],
    [12_400, '12 km'],
    [4, '10 m'],
    [994, '990 m'],
    [996, '1 km'],
  ])('tk distance %i m = %s', (metres, text) => {
    expect(tk.distance(metres)).toBe(text)
  })

  it('en uses a decimal point', () => {
    expect(en.distance(1200)).toBe('1.2 km')
  })
})

describe('dates and times', () => {
  it('weekday capitalised, month lower-case', () => {
    expect(tk.weekdayDate('2026-10-15')).toBe('Penşenbe, 15 oktýabr')
    expect(ru.weekdayDate('2026-10-15')).toBe('Четверг, 15 октября')
    expect(en.weekdayDate('2026-10-15')).toBe('Thursday, 15 October')
  })

  it('short dates and the month picker header', () => {
    expect(tk.shortDate('2026-10-14')).toBe('14 okt.')
    expect(tk.monthYear('2026-10-14')).toBe('Oktýabr 2026')
    expect(ru.monthYear('2026-10-14')).toBe('Октябрь 2026')
  })

  it('relative days', () => {
    expect(tk.relativeDay('2026-10-14', '2026-10-14')).toBe('Şu gün')
    expect(tk.relativeDay('2026-10-15', '2026-10-14')).toBe('Ertir')
    expect(tk.relativeDay('2026-10-17', '2026-10-14')).toBe('Şenbe')
    expect(tk.relativeDay('2026-10-20', '2026-10-14')).toBe('Sişenbe')
    expect(tk.weekdayShort('2026-10-12')).toBe('Du')
  })

  it('a weekday only within the coming week, otherwise the date', () => {
    expect(tk.relativeDay('2026-10-13', '2026-10-14')).toBe('13 oktýabr')
    expect(tk.relativeDay('2026-10-21', '2026-10-14')).toBe('21 oktýabr')
    expect(tk.relativeDay('2026-10-24', '2026-10-14')).toBe('24 oktýabr')
  })

  it('24-hour times and phones', () => {
    expect(tk.time(870)).toBe('14:30')
    expect(tk.timeRange(870, 930)).toBe('14:30–15:30')
    // a day may end at midnight (the hours pickers draw 24:00); later times run into the next day
    expect(tk.timeRange(1380, 1440)).toBe('23:00–24:00')
    expect(tk.time(1500)).toBe('01:00')
    expect(tk.timeRange(1380, 1500)).toBe('23:00–01:00')
    expect(tk.phone('99365901122')).toBe('+993 65 90 11 22')
  })
})

describe('message catalogues', () => {
  const keys = (o: object, prefix = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`]))

  it('every key of the English source exists in every language', () => {
    const enKeys = keys(messages.en).sort()
    for (const locale of LOCALES) expect(keys(messages[locale]).sort()).toEqual(enKeys)
  })

  it('covers every language of the market, the default among them (ADR 0022)', () => {
    for (const locale of MARKET_LOCALES) expect(messages[locale]).toBeDefined()
    expect(MARKET_LOCALES).toContain(DEFAULT_LOCALE)
  })

  it('one brand in every language, and SMS texts take it as an argument, so a rename is one edit per file', () => {
    for (const locale of LOCALES) expect(messages[locale].common.brand).toBe(messages.en.common.brand)
    for (const locale of LOCALES) {
      const { brand } = messages[locale].common
      for (const text of Object.values(messages[locale].sms)) expect(text).not.toContain(brand)
    }
  })

  it('the party limit comes in as an argument', () => {
    expect(createT('tk')('errors.party_too_large', { callFrom: 9 })).toBe('9 we ondan köp adam bolsa, jaň ediň.')
    expect(createT('ru')('errors.party_too_large', { callFrom: 9 })).toBe('Если вас 9 и больше, позвоните.')
    expect(createT('en')('errors.party_too_large', { callFrom: 9 })).toBe('For 9 or more people, please call.')
    expect(createT('tk')('errors.party_too_large', { callFrom: 13 })).toBe('13 we ondan köp adam bolsa, jaň ediň.')
  })

  it('too many requests says the wait in minutes (book Q-267)', () => {
    const say = (locale: 'en' | 'tk' | 'ru', retryAfterMin: number) =>
      createT(locale)('errors.rate_limited', { retryAfterSec: 0, retryAfterMin })
    expect(say('en', 1)).toBe('Too many requests. Try again in 1 minute.')
    expect(say('en', 55)).toBe('Too many requests. Try again in 55 minutes.')
    expect(say('tk', 55)).toBe('Haýyş köp boldy. 55 minutdan soň täzeden synanyşyň.')
    expect(say('ru', 1)).toBe('Слишком много запросов. Попробуйте через 1 минуту.')
    expect(say('ru', 22)).toBe('Слишком много запросов. Попробуйте через 22 минуты.')
    expect(say('ru', 55)).toBe('Слишком много запросов. Попробуйте через 55 минут.')
  })

  it('too many waiting requests names the limit (book Q-124)', () => {
    const say = (locale: 'en' | 'tk' | 'ru', scope: string, limit: number) => createT(locale)('errors.too_many_waiting', { scope, limit })
    expect(say('en', 'business', 3)).toBe('You already have 3 requests waiting here. Wait for an answer or cancel one.')
    expect(say('en', 'all', 10)).toBe('You already have 10 requests waiting. Wait for the answers or cancel one.')
    expect(say('tk', 'business', 3)).toBe('Bu ýerde jogap garaşýan 3 haýyşyňyz bar. Jogaba garaşyň ýa-da birini ýatyryň.')
    expect(say('ru', 'business', 3)).toBe('У вас уже 3 запроса ждут ответа здесь. Дождитесь ответа или отмените один.')
    expect(say('ru', 'all', 10)).toBe('У вас уже 10 запросов ждут ответа. Дождитесь ответов или отмените один.')
  })

  it('no empty messages', () => {
    for (const locale of LOCALES) {
      const empty = keys(messages[locale]).filter(
        (k) => !k.split('.').reduce<unknown>((o, part) => (o as Record<string, unknown>)[part], messages[locale]),
      )
      expect(empty).toEqual([])
    }
  })
})
