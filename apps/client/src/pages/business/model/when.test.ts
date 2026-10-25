import { epochOf } from '@yeral/domain/time'
import { createFmt } from '@yeral/i18n'
import { describe, expect, it } from 'vitest'
import { dayHours, openLine } from './when'

const fmt = createFmt('en')
const week = (open: number, close: number) => Array.from({ length: 7 }, () => ({ open, close, break: null }))
const words = (key: string, values?: Record<string, string>) => `${key}${values ? ` ${Object.values(values).join(' ')}` : ''}`

// 2026-10-23 is a Friday, 2026-10-24 a Saturday
describe('the hours on the booking card', () => {
  it('reads the week', () => {
    expect(dayHours({ hours: week(540, 1200), specialDays: [] }, epochOf('2026-10-23', 600), fmt)).toEqual({ hours: '09:00–20:00' })
  })

  it('lets a special day win, with its name when closed', () => {
    const specialDays = [{ date: '2026-10-23', name: 'Holiday', hours: null }]
    expect(dayHours({ hours: week(540, 1200), specialDays }, epochOf('2026-10-23', 600), fmt)).toEqual({ closed: true, reason: 'Holiday' })
    const short = [{ date: '2026-10-23', name: 'Short day', hours: { open: 600, close: 900 } }]
    expect(dayHours({ hours: week(540, 1200), specialDays: short }, epochOf('2026-10-23', 600), fmt)).toEqual({ hours: '10:00–15:00' })
  })

  it('keeps the night going past midnight on the day it began', () => {
    const hours = [null, null, null, null, { open: 1080, close: 1560, break: null }, null, null]
    expect(dayHours({ hours, specialDays: [] }, epochOf('2026-10-24', 60), fmt)).toEqual({ hours: '18:00–02:00' })
  })
})

describe('the open line', () => {
  it('says until when it is open, or when it opens', () => {
    expect(openLine({ open: true, until: 1200 }, '2026-10-23', fmt, words)).toEqual({ text: 'openUntil 20:00', isOpen: true })
    expect(openLine({ open: false, inDays: 0, at: 540 }, '2026-10-23', fmt, words).text).toBe('opensToday 09:00')
    expect(openLine({ open: false, inDays: 1, at: 540 }, '2026-10-23', fmt, words).text).toBe('opensTomorrow 09:00')
    expect(openLine({ open: false, inDays: 3, at: 540 }, '2026-10-23', fmt, words).text).toBe('opensOn Monday 09:00')
    expect(openLine({ open: false, inDays: null, at: null }, '2026-10-23', fmt, words).text).toBe('closed')
  })
})
