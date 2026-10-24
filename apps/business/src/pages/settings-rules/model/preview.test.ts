import type { BusinessHours, DayHours } from '@yeral/domain/hours'
import { dow } from '@yeral/domain/time'
import { describe, expect, it } from 'vitest'
import { exampleAnswerBy } from './preview'

// a Wednesday, so the example visit is on Thursday
const today = '2026-10-14'
const week = (day: DayHours | null): BusinessHours => ({ hours: Array.from({ length: 7 }, () => day), exceptions: [] })
const nineToSeven = week({ open: 9 * 60, close: 19 * 60 })

describe("the booking rules' client preview", () => {
  it('starts on a Wednesday in these tests', () => {
    expect(dow(today)).toBe(2)
  })

  it('answers the 14:40 request by 15:10 with a 30-minute hold while open', () => {
    expect(exampleAnswerBy(today, 30, nineToSeven)).toEqual({ min: 15 * 60 + 10, tomorrow: false })
  })

  it('counts the hold only while the business is open: 6 h from 14:40 runs into tomorrow morning', () => {
    // 14:40–19:00 is 4 h 20 min; the other 1 h 40 min from 09:00 tomorrow
    expect(exampleAnswerBy(today, 360, nineToSeven)).toEqual({ min: 10 * 60 + 40, tomorrow: true })
  })

  it("never runs past the visit's start (tomorrow 14:30)", () => {
    expect(exampleAnswerBy(today, 1440, nineToSeven)).toEqual({ min: 14 * 60 + 30, tomorrow: true })
  })

  it('counts plain time when the hours are not known yet (nothing open)', () => {
    expect(exampleAnswerBy(today, 60, week(null))).toEqual({ min: 15 * 60 + 40, tomorrow: false })
  })
})
