import { describe, expect, it } from 'vitest'
import { nameTaken, statusName } from './statuses'

describe('internal statuses', () => {
  it('refuses a name a system or internal status has, in any case and with spaces around', () => {
    const taken = ['Pending', 'Confirmed', 'Arrived', 'Preparing']
    expect(nameTaken('pending', taken)).toBe(true)
    expect(nameTaken('  PREPARING ', taken)).toBe(true)
    expect(nameTaken('Prepared', taken)).toBe(false)
    expect(nameTaken('   ', taken)).toBe(false)
  })

  it('words a preset in the reader’s language and keeps the business’s own name', () => {
    const preset = (p: 'arrived' | 'started') => ({ arrived: 'Arrived', started: 'Started' })[p]
    expect(statusName({ preset: 'arrived', name: 'Geldi' }, preset)).toBe('Arrived')
    expect(statusName({ preset: null, name: 'Preparing' }, preset)).toBe('Preparing')
  })
})
