import { afterEach, describe, expect, it } from 'vitest'
import { setTextStretch, stretched, stretchText } from './stretch'

afterEach(() => setTextStretch(1))

describe('longer text for checking screens', () => {
  it('adds about 30 % in whole words after the message', () => {
    expect(stretchText('Book', 1.3)).toBe('Book ж')
    expect(stretchText('Send review', 1.3)).toBe('Send review жжж')
    const long = stretchText('You can cancel or change the booking for free up to {time} before.', 1.3)
    expect(long.length / 'You can cancel or change the booking for free up to {time} before.'.length).toBeCloseTo(1.3, 1)
    expect(long).toMatch(/^You can cancel or change the booking for free up to \{time\} before\. (ж{1,6} ?)+$/)
  })

  it('leaves arguments, plurals and tags whole', () => {
    expect(stretchText('{count, plural, one {# review} other {# reviews}}', 1.3)).toMatch(
      /^\{count, plural, one \{# review\} other \{# reviews\}\} ж+/,
    )
    expect(stretchText('<b>Moved?</b> Change it here.', 1.3)).toMatch(/^<b>Moved\?<\/b> Change it here\. ж+/)
  })

  it('is off unless asked, and then stretches every message once', () => {
    const messages = { a: 'Book', b: { c: 'Send review' } }
    expect(stretched(messages)).toBe(messages)
    setTextStretch(1.3)
    expect(stretched(messages)).toEqual({ a: 'Book ж', b: { c: 'Send review жжж' } })
    expect(stretched(messages)).toBe(stretched(messages))
  })
})
