import { describe, expect, it } from 'vitest'
import { SLUG_MAX, slugFrom } from './setup'

describe('the page address a name gives (book B-03)', () => {
  it('plain Latin letters, digits and single dashes', () => {
    expect(slugFrom('Glow Studio')).toBe('glow-studio')
    expect(slugFrom('Aýna Beauty & Spa №1')).toBe('ayna-beauty-spa-no1')
    expect(slugFrom('Gözel Ýüz Çeşme Şäher')).toBe('gozel-yuz-cesme-saher')
    expect(slugFrom('Салон «Лилия»')).toBe('salon-liliya')
    expect(slugFrom('  --Café--  ')).toBe('cafe')
  })
  it('a name with nothing to keep is a business; a long one is cut at a word', () => {
    expect(slugFrom('★★★')).toBe('business')
    const long = slugFrom('Very long business name that goes on and on past every limit there is')
    expect(long.length).toBeLessThanOrEqual(SLUG_MAX)
    expect(long.endsWith('-')).toBe(false)
  })
})
