import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('a later class of the same design scale wins', () => {
    expect(cn('text-small text-n-600', 'text-micro')).toBe('text-n-600 text-micro')
    expect(cn('shadow-focus', 'shadow-focus-inset')).toBe('shadow-focus-inset')
    expect(cn('rounded-card', 'rounded-xs')).toBe('rounded-xs')
  })

  it('knows the control scale (v0.7 · A3): its text sizes stay beside a colour, its radii beside each other', () => {
    expect(cn('text-ctl-l', 'text-n-900')).toBe('text-ctl-l text-n-900')
    expect(cn('text-ctl-s text-n-900', 'text-ctl-m')).toBe('text-n-900 text-ctl-m')
    expect(cn('rounded-ctl-m', 'rounded-ctl-l')).toBe('rounded-ctl-l')
    expect(cn('rounded-ctl-l', 'rounded-popover')).toBe('rounded-popover')
  })

  it('knows the radius scale on every side and corner', () => {
    expect(cn('rounded-t-card', 'rounded-t-xs')).toBe('rounded-t-xs')
    expect(cn('rounded-bl-ctl-s', 'rounded-bl-sm')).toBe('rounded-bl-sm')
    expect(cn('rounded-l-card', 'rounded-l-xs')).toBe('rounded-l-xs')
  })

  it('knows the container widths (popover, drawer, modals)', () => {
    expect(cn('w-popover', 'w-75')).toBe('w-75')
    expect(cn('w-drawer', 'w-full')).toBe('w-full')
    expect(cn('max-w-text', 'max-w-modal-s')).toBe('max-w-modal-s')
  })
})
