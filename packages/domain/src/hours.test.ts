import { describe, expect, it } from 'vitest'
import {
  businessClosedReason,
  businessDay,
  inException,
  openState,
  staffDay,
  staffOffReason,
  workingIntervals,
  type BusinessHours,
  type DateException,
  type StaffSchedule,
  type WeekHours,
} from './hours'

const WED = '2026-10-14'
const THU = '2026-10-15'
const FRI = '2026-10-16'
const SUN = '2026-10-18'

const h = (open: number, close: number) => ({ open, close })
/** Mon–Sat 10:00–20:00, Sunday off */
const WEEK: WeekHours = [h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), null]
const biz = (over: Partial<BusinessHours> = {}): BusinessHours => ({ hours: WEEK, exceptions: [], ...over })
const ex = (over: Partial<DateException>): DateException => ({ name: 'Baýramçylyk', from: THU, to: THU, yearly: false, ...over })
const staff = (over: Partial<StaffSchedule> = {}): StaffSchedule => ({ shift: null, breaks: [], daysOff: [], ...over })
const at = (iso: string) => Date.parse(iso)

describe('business days', () => {
  it('uses the weekday hours', () => {
    expect(businessDay(biz(), THU)).toEqual({ open: 600, close: 1200, breaks: [] })
    expect(businessDay(biz(), SUN)).toBeNull()
  })

  it('closes on a special day, and a yearly one repeats, also across New Year', () => {
    expect(businessDay(biz({ exceptions: [ex({})] }), THU)).toBeNull()
    const newYear = ex({ name: 'Täze ýyl', from: '2025-12-31', to: '2026-01-01', yearly: true })
    expect(inException(newYear, '2027-01-01')).toBe(true)
    expect(inException(newYear, '2027-12-31')).toBe(true)
    expect(businessDay(biz({ exceptions: [newYear] }), '2027-01-04')).toEqual({ open: 600, close: 1200, breaks: [] })
  })

  it('a special day can have special hours instead of closing', () => {
    expect(businessDay(biz({ exceptions: [ex({ hours: h(600, 900) })] }), THU)).toEqual({ open: 600, close: 900, breaks: [] })
    expect(businessClosedReason(biz({ exceptions: [ex({ hours: h(600, 900) })] }), THU)).toBeNull()
  })

  it('keeps the business break inside the day', () => {
    const week = WEEK.map((d) => (d ? { ...d, break: { start: 780, end: 840 } } : null))
    const day = businessDay(biz({ hours: week }), THU)
    expect(day).toEqual({ open: 600, close: 1200, breaks: [{ start: 780, end: 840 }] })
    expect(day && workingIntervals(day)).toEqual([
      { start: 600, end: 780 },
      { start: 840, end: 1200 },
    ])
  })

  it('says why the business is closed', () => {
    expect(businessClosedReason(biz(), THU)).toBeNull()
    expect(businessClosedReason(biz(), SUN)).toEqual({ kind: 'weekly' })
    expect(businessClosedReason(biz({ exceptions: [ex({})] }), THU)).toEqual({ kind: 'exception', name: 'Baýramçylyk' })
  })
})

describe('staff days', () => {
  it('follows the business hours by default and intersects an own shift with them', () => {
    expect(staffDay(biz(), staff(), THU)).toEqual({ open: 600, close: 1200, breaks: [] })
    const shift = [null, null, null, h(540, 900), h(900, 1300), null, null]
    expect(staffDay(biz(), staff({ shift }), THU)).toEqual({ open: 600, close: 900, breaks: [] })
    expect(staffDay(biz(), staff({ shift }), FRI)).toEqual({ open: 900, close: 1200, breaks: [] })
    expect(staffDay(biz(), staff({ shift }), WED)).toBeNull()
  })

  it('adds the person’s break for that weekday (breaks can differ per day)', () => {
    const breaks = [null, null, { start: 840, end: 880 }, { start: 810, end: 850 }, null, null, null]
    expect(staffDay(biz(), staff({ breaks }), WED)?.breaks).toEqual([{ start: 840, end: 880 }])
    expect(staffDay(biz(), staff({ breaks }), THU)?.breaks).toEqual([{ start: 810, end: 850 }])
  })

  it('says why someone is off', () => {
    expect(staffOffReason(biz(), staff(), THU)).toBeNull()
    expect(staffOffReason(biz(), staff(), SUN)).toEqual({ kind: 'business-closed' })
    expect(staffOffReason(biz({ exceptions: [ex({ name: 'Nowruz' })] }), staff(), THU)).toEqual({ kind: 'business-closed', name: 'Nowruz' })
    expect(staffOffReason(biz(), staff({ daysOff: [ex({ name: 'Rugsat' })] }), THU)).toEqual({ kind: 'exception', name: 'Rugsat' })
    expect(staffOffReason(biz(), staff({ shift: [h(600, 1200), null, null, null, null, null, null] }), THU)).toEqual({ kind: 'dayoff' })
  })
})

describe('openState', () => {
  it('is open until closing time', () => {
    expect(openState(biz(), at('2026-10-14T05:00:00Z'))).toEqual({ open: true, until: 1200 })
  })

  it('opens later today before opening time', () => {
    expect(openState(biz(), at('2026-10-14T03:00:00Z'))).toEqual({ open: false, inDays: 0, at: 600 })
  })

  it('opens on the next working day after closing', () => {
    // Saturday 21:00, Sunday off
    expect(openState(biz(), at('2026-10-17T16:00:00Z'))).toEqual({ open: false, inDays: 2, at: 600 })
  })

  it('has no opening when every day is off', () => {
    expect(openState(biz({ hours: [null, null, null, null, null, null, null] }), at('2026-10-14T05:00:00Z'))).toEqual({
      open: false,
      inDays: null,
    })
  })
})
