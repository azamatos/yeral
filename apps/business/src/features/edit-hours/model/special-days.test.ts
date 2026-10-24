import { describe, expect, it } from 'vitest'
import { dateProblem, dayOf, draftOf, nightProblem, overlapOf, type SpecialDay } from './special-days'

const day = (open: number, close: number) => ({ open, close, break: null })
/** Glow Studio's week: Monday to Saturday 09:00–20:00, Sunday 10:00–18:00. */
const WEEK = [...Array.from({ length: 6 }, () => day(540, 1200)), day(600, 1080)]
const closed = (name: string, from: string, to = from, yearly = false): SpecialDay => ({ name, from, to, yearly, hours: null })

describe('special days', () => {
  it('a draft is the day it describes, one day or several', () => {
    const one = closed('Stocktake', '2026-11-02')
    expect(dayOf(draftOf(one))).toEqual(one)
    const several = { ...closed('Nowruz', '2027-03-21', '2027-03-22', true), hours: { open: 600, close: 900 } }
    expect(draftOf(several)).toMatchObject({ multi: true, start: '2027-03-21', end: '2027-03-22', closed: false })
    expect(dayOf(draftOf(several))).toEqual(several)
    expect(dayOf(draftOf())).toBeNull()
  })

  it('refuses a one-off day that has ended and dates the wrong way round; a yearly day is never past', () => {
    expect(dateProblem(closed('Gone', '2026-10-01'), '2026-10-24')).toBe('past')
    expect(dateProblem(closed('Yearly', '2026-10-01', '2026-10-01', true), '2026-10-24')).toBeNull()
    expect(dateProblem(closed('Backwards', '2026-11-05', '2026-11-02'), '2026-10-24')).toBe('order')
    expect(dateProblem(closed('Fine', '2026-11-02'), '2026-10-24')).toBeNull()
  })

  it('other hours past midnight may not run into the next day’s opening', () => {
    // Friday 6 November 2026, then Saturday opens at 09:00
    const late = (close: number): SpecialDay => ({
      name: 'Party',
      from: '2026-11-06',
      to: '2026-11-06',
      yearly: false,
      hours: { open: 1080, close },
    })
    expect(nightProblem(late(1560), WEEK, [])).toBeNull()
    expect(nightProblem(late(2010), WEEK, [])).toEqual({ kind: 'next', weekday: 5 })
    // the picker makes 10:00–10:00 a whole day from 10:00: the same time, as the week refuses it
    expect(nightProblem({ ...late(1560), hours: { open: 600, close: 2040 } }, WEEK, [])).toEqual({ kind: 'same' })
    expect(nightProblem({ ...late(1560), hours: { open: 0, close: 1440 } }, WEEK, [])).toBeNull()
  })

  it('the night before may not run into its opening; a yearly day is checked against every weekday', () => {
    // Thursday open 18:00–02:00, then Friday 6 November opens at 01:00
    const nights = WEEK.map((d, i) => (i === 3 || i === 4 ? day(1080, i === 3 ? 1560 : 1620) : d))
    const early: SpecialDay = { name: 'Early', from: '2026-11-06', to: '2026-11-06', yearly: false, hours: { open: 60, close: 360 } }
    expect(nightProblem(early, nights, [])).toEqual({ kind: 'before' })
    // Saturday 7 November 18:00–10:00 doesn't reach Sunday's 10:00, but a Monday's 09:00 some year
    const sat: SpecialDay = { name: 'Late', from: '2026-11-07', to: '2026-11-07', yearly: true, hours: { open: 1080, close: 2040 } }
    expect(nightProblem({ ...sat, yearly: false }, WEEK, [])).toBeNull()
    expect(nightProblem(sat, WEEK, [])).toEqual({ kind: 'yearlyNext' })
    // Monday 9 November 01:00–06:00: Sunday closes at 18:00, but Friday's night runs to 03:00
    const mon: SpecialDay = { name: 'Dawn', from: '2026-11-09', to: '2026-11-09', yearly: true, hours: { open: 60, close: 360 } }
    expect(nightProblem({ ...mon, yearly: false }, nights, [])).toBeNull()
    expect(nightProblem(mon, nights, [])).toEqual({ kind: 'yearlyBefore' })
  })

  it('names the overlapping day and the one that applies on the shared days', () => {
    const nowruz = closed('Nowruz', '2027-03-21', '2027-03-22', true)
    const short = { ...closed('Nowruz — short day', '2027-03-21'), hours: { open: 600, close: 900 } }
    // a dated day beats a yearly one
    expect(overlapOf(short, [nowruz])).toEqual({ name: 'Nowruz', winner: 'Nowruz — short day' })
    // a dated range beats a yearly day even when it's longer
    expect(overlapOf(closed('Week off', '2026-12-28', '2027-01-03'), [closed('New Year', '2027-01-01', '2027-01-01', true)])).toEqual({
      name: 'New Year',
      winner: 'Week off',
    })
    expect(overlapOf(closed('Stocktake', '2026-11-02'), [nowruz])).toBeNull()
    // a full tie keeps the existing day; a dated year covers every yearly day
    expect(overlapOf(closed('Again', '2026-11-02'), [closed('Stocktake', '2026-11-02')])).toEqual({
      name: 'Stocktake',
      winner: 'Stocktake',
    })
    expect(overlapOf(closed('Year off', '2026-11-01', '2027-11-01'), [closed('New Year', '2027-01-01', '2027-01-01', true)])).toEqual({
      name: 'New Year',
      winner: 'Year off',
    })
  })
})
