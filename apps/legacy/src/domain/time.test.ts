import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, diffDays, dow, epochOf, fmtPhone, hm, minutesUntil, normPhone, nowMin, parseYmd, today, ymd } from './time'

describe('Ashgabat clock', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('reads the salon date and time in UTC+5 whatever the host time zone', () => {
    vi.setSystemTime(new Date('2026-10-14T05:00:00Z'))
    expect(today()).toBe('2026-10-14')
    expect(nowMin()).toBe(600)
  })

  it('is already tomorrow in Ashgabat late in the UTC evening', () => {
    vi.setSystemTime(new Date('2026-10-13T19:30:00Z'))
    expect(today()).toBe('2026-10-14')
    expect(nowMin()).toBe(30)
  })

  it('counts minutes until a salon-local moment', () => {
    vi.setSystemTime(new Date('2026-10-14T05:00:00Z'))
    expect(minutesUntil('2026-10-14', 660)).toBe(60)
    expect(minutesUntil('2026-10-14', 540)).toBe(-60)
    expect(minutesUntil('2026-10-15', 600)).toBe(1440)
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

  it('parseYmd and ymd round-trip', () => {
    expect(ymd(parseYmd('2026-02-09'))).toBe('2026-02-09')
  })

  it('epochOf turns salon-local time into an instant', () => {
    expect(epochOf('2026-10-14', 600)).toBe(Date.UTC(2026, 9, 14, 5, 0))
  })

  it('hm formats minutes from midnight', () => {
    expect(hm(870)).toBe('14:30')
    expect(hm(5)).toBe('00:05')
  })
})

describe('phones', () => {
  it.each(['99365123456', '+993 65 12 34 56', '65 12-34-56', '(65) 123456'])('formats %s', (raw) => {
    expect(fmtPhone(raw)).toBe('+993 65 12 34 56')
  })

  it('normalises to digits', () => {
    expect(normPhone('+993 65 12 34 56')).toBe('99365123456')
  })
})
