import type { CalendarBooking } from '@yeral/contract/calendar'
import { epochOf } from '@yeral/domain/time'
import { describe, expect, it } from 'vitest'
import { canCancelBooking, canRemoveReport, reportKinds } from './report-rules'

const DAY = '2026-10-14'
const booking = (patch: Partial<CalendarBooking> = {}): CalendarBooking => ({
  code: 'YR-48210',
  type: 'appointment',
  date: DAY,
  start: 600,
  end: 660,
  status: 'confirmed',
  cancelledBy: null,
  source: 'web',
  client: { id: 'c1', name: 'Gözel', phone: null },
  items: [],
  price: null,
  internalStatusId: null,
  alert: false,
  clientNote: null,
  internalNote: null,
  holdUntil: null,
  complaint: null,
  move: null,
  ...patch,
})
const at = (min: number, day = DAY) => epochOf(day, min)
const late = (filedAt: number) => ({ type: 'late' as const, text: null, by: { staffId: 's1', name: 'Aýna' }, at: filedAt })

describe('reportKinds (one report per booking, design §28 round 3.1)', () => {
  it('offers rude and other before the start', () => {
    expect(reportKinds(booking(), at(540))).toEqual(['rude', 'other'])
  })
  it('offers all four from the start until 24 h after the end', () => {
    expect(reportKinds(booking(), at(600))).toEqual(['noshow', 'late', 'rude', 'other'])
    expect(reportKinds(booking({ status: 'completed' }), at(659, '2026-10-15'))).toEqual(['noshow', 'late', 'rude', 'other'])
  })
  it('drops the no-show more than 24 h after the end', () => {
    expect(reportKinds(booking({ status: 'completed' }), at(661, '2026-10-15'))).toEqual(['late', 'rude', 'other'])
  })
  it('offers only a no-show over an earlier report of another kind, while its window is open', () => {
    expect(reportKinds(booking({ complaint: late(at(605)) }), at(700))).toEqual(['noshow'])
    expect(reportKinds(booking({ status: 'completed', complaint: late(at(605)) }), at(700, '2026-10-16'))).toEqual([])
  })
  it('offers nothing after a no-show, or on a cancelled booking', () => {
    expect(reportKinds(booking({ status: 'noshow', complaint: { ...late(at(700)), type: 'noshow' } }), at(720))).toEqual([])
    expect(reportKinds(booking({ status: 'cancelled', cancelledBy: 'client' }), at(540))).toEqual([])
  })
})

describe('canRemoveReport (book Q-207)', () => {
  const filed = booking({ complaint: late(at(605)) })
  it('lets the owner and administrators remove any report within 7 days', () => {
    expect(canRemoveReport(filed, at(700), { level: 'owner' })).toBe(true)
    expect(canRemoveReport(filed, at(700), { level: 'admin', staffId: 's2' })).toBe(true)
    expect(canRemoveReport(filed, at(605, '2026-10-21'), { level: 'owner' })).toBe(false)
  })
  it('lets a specialist remove only the reports they filed', () => {
    expect(canRemoveReport(filed, at(700), { level: 'specialist', staffId: 's1' })).toBe(true)
    expect(canRemoveReport(filed, at(700), { level: 'specialist', staffId: 's2' })).toBe(false)
    expect(canRemoveReport(filed, at(700), { level: 'specialist' })).toBe(false)
  })
  it('has nothing to remove without a report', () => {
    expect(canRemoveReport(booking(), at(700), { level: 'owner' })).toBe(false)
  })
})

describe('canCancelBooking (book B-27)', () => {
  it('cancels a confirmed booking before its start only', () => {
    expect(canCancelBooking(booking(), at(599))).toBe(true)
    expect(canCancelBooking(booking(), at(600))).toBe(false)
    expect(canCancelBooking(booking({ status: 'completed' }), at(540, '2026-10-15'))).toBe(false)
  })
})
