import { afterEach, describe, expect, it } from 'vitest'
import { appMessages, ownLetters, setTextStretch, stretched, stretchText } from './stretch'

afterEach(() => setTextStretch(1))

const filler = (text: string, from: string) => text.slice(from.length).replace(/\s/g, '').length

describe('longer text for checking screens', () => {
  it('counts the letters a message shows: no tags, no values, the longest branch', () => {
    expect(ownLetters('Send review')).toBe(10)
    expect(ownLetters('<b>Moved?</b> Change it here.')).toBe(17)
    expect(ownLetters('{name} · {phone}')).toBe(0)
    expect(ownLetters('{count, plural, one {# review} other {# reviews}}')).toBe(7)
    expect(ownLetters('Booked {n, plural, one {# time} other {# times}} at {name}')).toBe(13)
  })

  it('lengthens short labels most, long text by 30 %, in whole words after the message', () => {
    expect(stretchText('Add', 1.3)).toBe('Add жжж')
    expect(filler(stretchText('Send review', 1.3), 'Send review')).toBe(6)
    const long = 'You can cancel or change the booking for free up to {time} before.'
    expect(filler(stretchText(long, 1.3), long)).toBe(Math.round(ownLetters(long) * 0.3))
    expect(stretchText(long, 1.3)).toMatch(/^You can cancel .* before\. (ж{1,6} ?)+$/)
  })

  it('leaves arguments, plurals and tags whole, and a message of values alone', () => {
    const plural = '{count, plural, one {# review} other {# reviews}}'
    expect(stretchText(plural, 1.3).startsWith(`${plural} ж`)).toBe(true)
    expect(filler(stretchText(plural, 1.3), plural)).toBe(4)
    expect(stretchText('<b>Moved?</b> Change it here.', 1.3).startsWith('<b>Moved?</b> Change it here. ж')).toBe(true)
    expect(stretchText('{name} · {phone}', 1.3)).toBe('{name} · {phone}')
  })

  it('is off unless asked; then every message once, the brand and file names kept, lists kept lists', () => {
    const messages = { a: 'Book', b: { c: 'Send review' }, common: { brand: 'Ýeral' }, icsFile: 'booking-{code}.ics', tips: ['Clean'] }
    expect(stretched(messages)).toBe(messages)
    setTextStretch(1.3)
    const longer = stretched(messages)
    expect(longer.a).toBe('Book жжжж')
    expect(longer.common.brand).toBe('Ýeral')
    expect(longer.icsFile).toBe('booking-{code}.ics')
    expect(Array.isArray(longer.tips)).toBe(true)
    expect(stretched(messages)).toBe(longer)
  })

  it('merges an app’s words over the shared ones once per pair', () => {
    const shared = { common: { brand: 'Ýeral' } }
    const client = { a: 'Book' }
    const business = { a: 'Save' }
    expect(appMessages(shared, client)).toBe(appMessages(shared, client))
    expect(appMessages(shared, business).a).toBe('Save')
    expect(appMessages(shared, client).a).toBe('Book')
  })
})
