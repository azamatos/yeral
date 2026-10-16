import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('a later class of the same design scale wins', () => {
    expect(cn('text-small text-n-600', 'text-micro')).toBe('text-n-600 text-micro')
    expect(cn('shadow-focus', 'shadow-focus-inset')).toBe('shadow-focus-inset')
    expect(cn('rounded-card', 'rounded-xs')).toBe('rounded-xs')
  })

  it('knows the radius scale on every side and corner', () => {
    expect(cn('rounded-t-card', 'rounded-t-xs')).toBe('rounded-t-xs')
    expect(cn('rounded-bl-input', 'rounded-bl-sm')).toBe('rounded-bl-sm')
  })
})
