import { describe, expect, it } from 'vitest'
import { addDays, dateRange, diffDays, dow, epochOf, hm, isYmd, localOf, minutesUntil, nowMin, parseHm, parseYmd, today, ymd } from './time'

describe('business-local clock', () => {
  it('reads the business date and time in UTC+5 whatever the host time zone', () => {
    const now = Date.parse('2026-10-14T05:00:00Z')
    expect(today(now)).toBe('2026-10-14')
    expect(nowMin(now)).toBe(600)
  })

  it('is already tomorrow at the business late in the UTC evening', () => {
    const now = Date.parse('2026-10-13T19:30:00Z')
    expect(localOf(now)).toEqual({ date: '2026-10-14', min: 30 })
  })

  it('counts minutes until a business-local moment', () => {
    const now = Date.parse('2026-10-14T05:00:00Z')
    expect(minutesUntil('2026-10-14', 660, now)).toBe(60)
    expect(minutesUntil('2026-10-14', 540, now)).toBe(-60)
    expect(minutesUntil('2026-10-15', 600, now)).toBe(1440)
  })

  it('epochOf and localOf are inverses', () => {
    expect(epochOf('2026-10-14', 600)).toBe(Date.UTC(2026, 9, 14, 5, 0))
    expect(localOf(epochOf('2026-12-31', 1430))).toEqual({ date: '2026-12-31', min: 1430 })
    expect(localOf(epochOf('2026-12-31', 1440 + 15))).toEqual({ date: '2027-01-01', min: 15 })
  })
})

describe('calendar maths on YYYY-MM-DD strings', () => {
  it.each([
    ['2026-10-14', 1, '2026-10-15'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-02-28', 1, '2028-02-29'],
  ])('addDays(%s, %i) = %s', (d, n, expected) => {
    expect(addDays(d, n)).toBe(expected)
  })

  it('diffDays counts whole days', () => {
    expect(diffDays('2026-10-20', '2026-10-14')).toBe(6)
    expect(diffDays('2026-10-14', '2026-10-20')).toBe(-6)
    expect(diffDays('2027-01-01', '2026-12-31')).toBe(1)
  })

  it('dow is 0 on Monday and 6 on Sunday', () => {
    expect(dow('2026-10-12')).toBe(0)
    expect(dow('2026-10-14')).toBe(2)
    expect(dow('2026-10-18')).toBe(6)
  })

  it('parseYmd and ymd round-trip; isYmd rejects impossible dates', () => {
    expect(ymd(parseYmd('2026-02-09'))).toBe('2026-02-09')
    expect(isYmd('2026-02-29')).toBe(false)
    expect(isYmd('2028-02-29')).toBe(true)
    expect(isYmd('2026-2-9')).toBe(false)
  })

  it('dateRange includes both ends', () => {
    expect(dateRange('2026-12-30', '2027-01-02')).toEqual(['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02'])
    expect(dateRange('2026-10-14', '2026-10-13')).toEqual([])
  })
})

describe('times of day', () => {
  it('hm formats minutes from midnight', () => {
    expect(hm(870)).toBe('14:30')
    expect(hm(5)).toBe('00:05')
  })

  it.each([
    ['14:30', 870],
    ['9:05', 545],
    ['00:00', 0],
    ['24:00', null],
    ['12:60', null],
    ['noon', null],
  ])('parseHm(%s) = %s', (s, expected) => {
    expect(parseHm(s)).toBe(expected)
  })
})
