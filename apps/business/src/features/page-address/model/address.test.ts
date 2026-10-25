import { describe, expect, it } from 'vitest'
import { typedAddress } from './address'

describe('typedAddress', () => {
  it('lower case, a space or an underscore a hyphen; the rest stays for the check', () => {
    expect(typedAddress('Glow Studio')).toBe('glow-studio')
    expect(typedAddress('glow_studio  2')).toBe('glow-studio-2')
    expect(typedAddress('Gözel!')).toBe('gözel!')
  })
})
