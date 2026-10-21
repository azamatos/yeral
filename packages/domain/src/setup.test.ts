import { describe, expect, it } from 'vitest'
import { cutAtWord, SLUG_MAX, slugFrom } from './setup'

describe('the page address a name gives (book B-03)', () => {
  it('plain Latin letters, digits and single dashes', () => {
    expect(slugFrom('Glow Studio')).toBe('glow-studio')
    expect(slugFrom('Aýna Beauty & Spa №1')).toBe('ayna-beauty-spa-no1')
    expect(slugFrom('Gözel Ýüz Çeşme Şäher')).toBe('gozel-yuz-cesme-saher')
    expect(slugFrom('Салон «Лилия»')).toBe('salon-liliya')
    expect(slugFrom('  --Café--  ')).toBe('cafe')
    expect(slugFrom('Altın Saç')).toBe('altin-sac')
    expect(slugFrom('Straße Ørsted')).toBe('strasse-orsted')
  })
  it('never a booking code’s "yr-"', () => {
    expect(slugFrom('YR Beauty')).toBe('yrbeauty')
    expect(slugFrom('Yr 48213')).toBe('yr48213')
    expect(slugFrom('Yrma')).toBe('yrma')
  })
  it('a name with nothing to keep is a business; a long one is cut at a word', () => {
    expect(slugFrom('★★★')).toBe('business')
    const long = slugFrom('Glamour Beauty Salon and Spa for Women in Ashgabat City')
    expect(long).toBe('glamour-beauty-salon-and-spa-for-women-in')
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX)
    expect(cutAtWord('abcdefghij-kl', 12)).toBe('abcdefghij')
    expect(cutAtWord('ab-cdefghijklmnop', 12)).toBe('ab-cdefghijk')
  })
})
