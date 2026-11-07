import { createFmt } from '@yeral/i18n'
import { describe, expect, it } from 'vitest'
import { openLine } from './open-line'

const fmt = createFmt('en')
const words = (key: string, values?: Record<string, string>) => `${key}${values ? ` ${Object.values(values).join(' ')}` : ''}`

// 2026-10-23 is a Friday
describe('the open line', () => {
  it('says until when it is open, or when it opens', () => {
    expect(openLine({ open: true, until: 1200 }, '2026-10-23', fmt, words)).toEqual({ text: 'openUntil 20:00', isOpen: true })
    expect(openLine({ open: false, inDays: 0, at: 540 }, '2026-10-23', fmt, words).text).toBe('opensToday 09:00')
    expect(openLine({ open: false, inDays: 1, at: 540 }, '2026-10-23', fmt, words).text).toBe('opensTomorrow 09:00')
    expect(openLine({ open: false, inDays: 3, at: 540 }, '2026-10-23', fmt, words).text).toBe('opensOn Monday 09:00')
    expect(openLine({ open: false, inDays: null, at: null }, '2026-10-23', fmt, words).text).toBe('closed')
  })
})
