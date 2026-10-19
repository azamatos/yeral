/** Client reminders and the night (book Q-257, Q-285). */
import { describe, expect, it } from 'vitest'
import { reminderPlan } from './lifecycle'
import { epochOf } from './time'

const WED = '2026-10-14'
const THU = '2026-10-15'
const FRI = '2026-10-16'
const at = (date: string, min: number) => epochOf(date, min)
// Wednesday 10:00 at the business
const NOW = at(WED, 600)

describe('reminderPlan', () => {
  it('a daytime visit: a day before and 2 hours before', () => {
    expect(reminderPlan(at(FRI, 900), NOW)).toEqual([
      { kind: 'reminderDay', runAt: at(THU, 900) },
      { kind: 'reminder2h', runAt: at(FRI, 780) },
    ])
  })

  it('a 07:00 visit: both would arrive at night, so one goes at 21:30 the evening before', () => {
    expect(reminderPlan(at(FRI, 420), NOW)).toEqual([{ kind: 'reminderEvening', runAt: at(THU, 1290) }])
  })

  it('a 09:00 visit: the day reminder in the morning, the 2-hour one moved to the evening before', () => {
    expect(reminderPlan(at(FRI, 540), NOW)).toEqual([
      { kind: 'reminderDay', runAt: at(THU, 540) },
      { kind: 'reminderEvening', runAt: at(THU, 1290) },
    ])
  })

  it('a 23:00 visit: the day reminder at 23:00 moves to 21:30 the evening before', () => {
    expect(reminderPlan(at(FRI, 1380), NOW)).toEqual([
      { kind: 'reminderEvening', runAt: at(THU, 1290) },
      { kind: 'reminder2h', runAt: at(FRI, 1260) },
    ])
  })

  it('short notice: no reminder that’s already due, none at all within 2 hours', () => {
    // booked Wednesday 10:00 for Thursday 09:00: no day reminder; the 2-hour one (07:00) moves to Wednesday 21:30
    expect(reminderPlan(at(THU, 540), NOW)).toEqual([{ kind: 'reminderEvening', runAt: at(WED, 1290) }])
    // booked Wednesday 22:00 for Thursday 07:00: the evening has passed, the "confirmed" SMS just went
    expect(reminderPlan(at(THU, 420), at(WED, 1320))).toEqual([])
    // booked an hour ahead
    expect(reminderPlan(at(WED, 660), NOW)).toEqual([])
  })

  it('a visit after midnight on a day open past it: the evening before is the business day’s own evening', () => {
    // Thursday's business day, 01:00 Friday morning
    expect(reminderPlan(at(THU, 1500), NOW)).toEqual([{ kind: 'reminderEvening', runAt: at(THU, 1290) }])
  })
})
