import { ApiError } from '@yeral/sdk'
import { describe, expect, it } from 'vitest'
import { takenOnSave, typedAddress } from './address'

describe('typedAddress', () => {
  it('lower case, a space or an underscore a hyphen, letter for letter; the rest stays for the check', () => {
    expect(typedAddress('Glow Studio')).toBe('glow-studio')
    expect(typedAddress('glow_studio  2')).toBe('glow-studio--2')
    expect(typedAddress('Gözel!')).toBe('gözel!')
  })
})

describe('takenOnSave', () => {
  it('a save another business beat to the address', () => {
    expect(takenOnSave(new ApiError(400, 'validation_error', { issues: [{ path: ['slug'], code: 'taken' }] }))).toBe(true)
    expect(takenOnSave(new ApiError(400, 'validation_error', { issues: [{ path: ['slug'], code: 'invalid' }] }))).toBe(false)
    expect(takenOnSave(new ApiError(404, 'not_found'))).toBe(false)
  })
})
