import { epochOf } from '@yeral/domain/time'
import { createFmt } from '@yeral/i18n'
import { describe, expect, it } from 'vitest'
import { weekRows } from './when'

const fmt = createFmt('en')
const week = (open: number, close: number) => Array.from({ length: 7 }, () => ({ open, close, break: null }))

// 2026-10-23 is a Friday, 2026-10-24 a Saturday
describe('the hours table', () => {
  const at = epochOf('2026-10-23', 600) // a Friday

  it('runs Monday to Sunday as the coming days have them, today marked, a day to midnight at 24:00', () => {
    const hours = [...week(540, 1200).slice(0, 4), { open: 540, close: 1440, break: null }, { open: 600, close: 1080, break: null }, null]
    const rows = weekRows({ hours, specialDays: [] }, at, fmt)
    expect(rows.map((r) => r.date)).toEqual([
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
      '2026-10-29',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ])
    expect(rows[4]).toEqual({ date: '2026-10-23', today: true, hours: '09:00–24:00', special: null })
    expect(rows[5]?.hours).toBe('10:00–18:00')
    expect(rows[6]).toEqual({ date: '2026-10-25', today: false, hours: null, special: null })
  })

  it('splits a day at its break and lets a special day in the week win, with its name', () => {
    const hours = week(540, 1200).map((d) => ({ ...d, break: { start: 780, end: 840 } }))
    const specialDays = [
      { date: '2026-10-27', name: 'Holiday', hours: null },
      { date: '2026-10-28', name: 'Short day', hours: { open: 600, close: 900 } },
    ]
    const rows = weekRows({ hours, specialDays }, at, fmt)
    expect(rows[0]?.hours).toBe('09:00–13:00, 14:00–20:00')
    expect(rows[1]).toMatchObject({ hours: null, special: 'Holiday' })
    expect(rows[2]).toMatchObject({ hours: '10:00–15:00', special: 'Short day' })
  })

  it('stays on the night under way after midnight', () => {
    const hours = [null, null, null, null, { open: 1080, close: 1560, break: null }, null, null]
    const rows = weekRows({ hours, specialDays: [] }, epochOf('2026-10-24', 60), fmt)
    expect(rows.find((r) => r.today)).toMatchObject({ date: '2026-10-23', hours: '18:00–02:00' })
  })
})
