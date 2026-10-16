import { describe, expect, it } from 'vitest'
import { formatPhone, isMobile, isPhone, nationalDigits, toE164 } from './phone'

describe('Turkmen phones', () => {
  it.each(['99365123456', '+993 65 12 34 56', '65 12-34-56', '(65) 123456', '+993 (65) 12-34-56'])('reads %s', (raw) => {
    expect(nationalDigits(raw)).toBe('65123456')
    expect(formatPhone(raw)).toBe('+993 65 12 34 56')
    expect(toE164(raw)).toBe('+99365123456')
  })

  it('groups partial input while typing', () => {
    expect(formatPhone('651')).toBe('+993 65 1')
    expect(formatPhone('')).toBe('+993')
  })

  it('needs exactly 8 national digits', () => {
    expect(isPhone('6512345')).toBe(false)
    expect(isPhone('+993 65 12 34 56')).toBe(true)
    expect(isPhone('+7 916 123 45 67')).toBe(false)
    expect(() => toE164('123')).toThrow()
  })

  it('only mobile numbers receive login codes', () => {
    expect(isMobile('+993 65 12 34 56')).toBe(true)
    expect(isMobile('+993 71 12 34 56')).toBe(true)
    expect(isMobile('+993 12 45 67 89')).toBe(false)
  })
})
