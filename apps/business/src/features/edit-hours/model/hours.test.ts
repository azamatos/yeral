import { describe, expect, it } from 'vitest'
import {
  changedDays,
  closingClock,
  editorWeek,
  effectiveDays,
  follows,
  hoursRuns,
  STARTING_WEEK,
  sameWeek,
  weekOf,
  weekValid,
} from './hours'

const h = (open: number, close: number, brk: { start: number; end: number } | null = null) => ({ open, close, break: brk })
const CLOSED = [null, null, null, null, null, null, null]

describe('the hours step’s week', () => {
  it('a new business starts from the drawn week with the same hours Monday to Friday', () => {
    expect(editorWeek(CLOSED)).toBe(STARTING_WEEK)
    expect(weekOf(effectiveDays(STARTING_WEEK))).toEqual([...Array.from({ length: 6 }, () => h(540, 1200)), h(600, 1080)])
  })

  it('a saved week opens as it is; a closed day keeps the first open day’s hours for when it’s switched on', () => {
    const saved = [h(540, 1080), h(600, 1200), null, h(540, 1080), h(540, 1080), null, null]
    const week = editorWeek(saved)
    expect(week.same).toBe(false)
    expect(week.days[2]).toEqual({ open: false, hours: { open: 540, close: 1080 }, break: null })
    expect(weekOf(effectiveDays(week))).toEqual(saved)
  })

  it('«Same hours» is on when Monday to Friday are open with Monday’s hours and break', () => {
    const lunch = { start: 780, end: 840 }
    const five = Array.from({ length: 5 }, () => h(540, 1200, lunch))
    expect(editorWeek([...five, null, null]).same).toBe(true)
    expect(editorWeek([...five.slice(0, 4), h(540, 1200), null, null]).same).toBe(false)
  })

  it('while it’s on, Tuesday to Friday follow Monday’s hours and break but keep their own switch', () => {
    const week = editorWeek([h(540, 1200), h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), null, null])
    week.days[0] = { ...week.days[0]!, break: { start: 780, end: 840 } }
    week.days[3] = { ...week.days[3]!, open: false }
    const days = effectiveDays({ ...week, same: true })
    expect(weekOf(days)).toEqual([
      h(540, 1200, { start: 780, end: 840 }),
      h(540, 1200, { start: 780, end: 840 }),
      h(540, 1200, { start: 780, end: 840 }),
      null,
      h(540, 1200, { start: 780, end: 840 }),
      null,
      null,
    ])
  })

  it('a salon closed on Mondays follows Tuesday; a closed weekday doesn’t turn «Same hours» off', () => {
    const closedMonday = { ...STARTING_WEEK, days: STARTING_WEEK.days.map((d, i) => (i === 0 ? { ...d, open: false } : d)) }
    expect([1, 2, 3, 4].map((i) => follows(closedMonday, i))).toEqual([false, true, true, true])
    const saved = [h(540, 1200), h(540, 1200), null, h(540, 1200), h(540, 1200), null, null]
    expect(editorWeek(saved).same).toBe(true)
    // one open weekday has nothing to follow it
    expect(editorWeek([h(540, 1200), null, null, null, null, h(600, 900), null]).same).toBe(false)
  })

  it('a week needs an open day and no day with a problem', () => {
    expect(weekValid(CLOSED)).toBe(false)
    expect(weekValid([h(1080, 1560), ...CLOSED.slice(1)])).toBe(true)
    // Monday until 11:00 runs into Tuesday's 10:00
    expect(weekValid([h(600, 2100), h(600, 1200), null, null, null, null, null])).toBe(false)
  })

  it('a saved break of undefined and null are the same week', () => {
    expect(sameWeek([{ open: 540, close: 1200 }, ...CLOSED.slice(1)], [h(540, 1200), ...CLOSED.slice(1)])).toBe(true)
    expect(sameWeek([h(540, 1200), ...CLOSED.slice(1)], [h(540, 1260), ...CLOSED.slice(1)])).toBe(false)
  })

  it('the summary runs days in a row with the same hours; a closing past midnight shows its clock', () => {
    expect(hoursRuns(weekOf(effectiveDays(STARTING_WEEK)))).toEqual([
      { from: 0, to: 5, open: 540, close: 1200 },
      { from: 6, to: 6, open: 600, close: 1080 },
    ])
    expect(hoursRuns([h(540, 1200), null, h(540, 1200), h(1080, 1560), h(1080, 1560), null, null])).toEqual([
      { from: 0, to: 0, open: 540, close: 1200 },
      { from: 2, to: 2, open: 540, close: 1200 },
      { from: 3, to: 4, open: 1080, close: 1560 },
    ])
    expect(hoursRuns(CLOSED)).toEqual([])
    expect([closingClock(1560), closingClock(1440)]).toEqual([120, 1440])
  })

  it('names the weekdays a change touches: their switch, hours or break', () => {
    const week = [h(540, 1200), h(540, 1200), h(540, 1200), h(540, 1200), h(540, 1200), h(600, 1080), null]
    expect(changedDays(week, week)).toEqual([])
    const next = [h(540, 1080), h(540, 1200), h(540, 1200, { start: 780, end: 840 }), h(540, 1200), null, h(600, 1080), h(600, 900)]
    expect(changedDays(week, next)).toEqual([0, 2, 4, 6])
  })
})
