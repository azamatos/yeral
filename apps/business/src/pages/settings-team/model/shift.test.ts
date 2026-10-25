import type { WeekdayHours } from '@yeral/contract/settings'
import { describe, expect, it } from 'vitest'
import { dayProblem, sameShift, scheduleWeek, shiftFormOf, shiftValid, switchShift } from './shift'

const open = (o: number, c: number): WeekdayHours => ({ open: o, close: c, break: null })
// Monday to Saturday 09:00–20:00, closed on Sunday
const business = [...Array.from({ length: 6 }, () => open(540, 1200)), null]
const none: null[] = Array<null>(7).fill(null)

describe('the staff drawer’s Hours', () => {
  it('opens on the business hours, or on their own shift, with each day’s break', () => {
    const follows = shiftFormOf({ shift: null, breaks: [{ start: 780, end: 820 }, ...none.slice(1)], daysOff: [] }, business)
    expect(follows.own).toBe(false)
    expect(follows.days[0]).toEqual({ works: true, hours: { open: 540, close: 1200 }, break: { start: 780, end: 820 } })
    expect(follows.days[6]!.works).toBe(false)
    const shift = [...Array.from({ length: 6 }, () => ({ open: 720, close: 1140 })), null]
    const own = shiftFormOf({ shift, breaks: none, daysOff: [] }, business)
    expect(own.own).toBe(true)
    expect(own.days[2]).toEqual({ works: true, hours: { open: 720, close: 1140 }, break: null })
  })

  it('saves null for the business hours, the own shift per weekday, and breaks only on working days', () => {
    const follows = shiftFormOf({ shift: null, breaks: none, daysOff: [] }, business)
    const own = switchShift(follows, true, business)
    expect(own.days[0]).toEqual({ works: true, hours: { open: 540, close: 1200 }, break: null })
    expect(own.days[6]!.works).toBe(false)
    const edited = {
      ...own,
      days: own.days.map((d, i) => (i === 0 ? { ...d, hours: { open: 720, close: 1140 }, break: { start: 780, end: 800 } } : d)),
    }
    expect(scheduleWeek(edited, business).shift?.[0]).toEqual({ open: 720, close: 1140 })
    expect(scheduleWeek(edited, business).shift?.[6]).toBeNull()
    expect(scheduleWeek(follows, business)).toEqual({ shift: null, breaks: none })
    expect(sameShift(follows, switchShift(own, false, business), business)).toBe(true)
  })

  it('refuses a break that ends before it starts or sits outside the day', () => {
    const own = switchShift(shiftFormOf({ shift: null, breaks: none, daysOff: [] }, business), true, business)
    const withBreak = (start: number, end: number) => ({
      ...own,
      days: own.days.map((d, i) => (i === 0 ? { ...d, hours: { open: 720, close: 1140 }, break: { start, end } } : d)),
    })
    expect(dayProblem(withBreak(800, 780), 0, business)).toBe('breakOrder')
    expect(dayProblem(withBreak(600, 640), 0, business)).toBe('breakOutside')
    expect(dayProblem(withBreak(780, 820), 0, business)).toBeNull()
    expect(shiftValid(withBreak(600, 640), business)).toBe(false)
  })
})
