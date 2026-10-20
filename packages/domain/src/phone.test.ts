import { describe, expect, it } from 'vitest'
import { E164, formatNational, formatPhone, isMobile, isPhone, maskPhone, nationalDigits, toE164 } from './phone'

describe('Turkmen phones (the market of the first launch)', () => {
  it('stores numbers as E.164 of the market', () => {
    expect(E164.test('+99365123456')).toBe(true)
    expect(E164.test('+9936512345')).toBe(false)
    expect(E164.test('+79161234567')).toBe(false)
  })

  it.each(['99365123456', '+993 65 12 34 56', '65 12-34-56', '(65) 123456', '+993 (65) 12-34-56'])('reads %s', (raw) => {
    expect(nationalDigits(raw)).toBe('65123456')
    expect(formatPhone(raw)).toBe('+993 65 12 34 56')
    expect(toE164(raw)).toBe('+99365123456')
  })

  it('groups partial input while typing', () => {
    expect(formatPhone('651')).toBe('+993 65 1')
    expect(formatPhone('')).toBe('+993')
    // the phone field groups the national digits with the same rules
    expect(formatNational('6590112299')).toBe('65 90 11 22')
    expect(formatNational('651')).toBe('65 1')
  })

  it('drops the country code or the trunk 8 while typing, not only on a full number', () => {
    expect(nationalDigits('+993 65 12')).toBe('6512')
    expect(formatPhone('+993 65 12')).toBe('+993 65 12')
    expect(formatPhone('+99')).toBe('+993')
    expect(formatPhone('8 65 1')).toBe('+993 65 1')
    expect(nationalDigits('8 65 12 34 56')).toBe('65123456')
    expect(isPhone('8 65 12 34 56')).toBe(true)
    expect(toE164('8 (65) 12-34-56')).toBe('+99365123456')
    expect(isMobile('8 65 12 34 56')).toBe(true)
  })

  it('drops a trunk 8 typed after the fixed +993 too', () => {
    expect(formatPhone('+993 8')).toBe('+993')
    expect(formatPhone('+993 8 65 1')).toBe('+993 65 1')
    expect(toE164('+993 8 65 12 34 56')).toBe('+99365123456')
    expect(isMobile('99386512345 6')).toBe(true)
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

describe('maskPhone (book F-068)', () => {
  it('shows the first and last groups only', () => {
    expect(maskPhone('+99365901122')).toBe('+993 65 •• •• 22')
  })
})
