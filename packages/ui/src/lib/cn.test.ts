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

  it('reads the radii named s and l as radii, not as the start and left sides', () => {
    expect(cn('rounded-pill', 'rounded-l')).toBe('rounded-l')
    expect(cn('rounded-m', 'rounded-s')).toBe('rounded-s')
    expect(cn('rounded-s', 'rounded-pill')).toBe('rounded-pill')
    expect(cn('rounded-l-card', 'rounded-l-xs')).toBe('rounded-l-xs')
  })

  it('knows the container widths (popover, drawer, modals)', () => {
    expect(cn('w-popover', 'w-75')).toBe('w-75')
    expect(cn('w-drawer', 'w-full')).toBe('w-full')
    expect(cn('max-w-text', 'max-w-modal-s')).toBe('max-w-modal-s')
  })
})
