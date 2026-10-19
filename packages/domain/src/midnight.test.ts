/** A business day that runs past midnight (book Q-105): hours, the open state and free times. */
import { describe, expect, it } from 'vitest'
import { appointmentSlots, type AppointmentContext, type AppointmentQuery } from './availability'
import { businessDay, openState, weekHoursErrors, type BusinessHours, type WeekHours } from './hours'

const WED = '2026-10-14'
const THU = '2026-10-15'
const FRI = '2026-10-16'
const h = (open: number, close: number) => ({ open, close })
const at = (iso: string) => Date.parse(iso)
/** Mon–Sat 18:00–02:00, Sunday off */
const NIGHT: WeekHours = [h(1080, 1560), h(1080, 1560), h(1080, 1560), h(1080, 1560), h(1080, 1560), h(1080, 1560), null]
const bar: BusinessHours = { hours: NIGHT, exceptions: [] }

describe('hours past midnight', () => {
  it('a day may end the next morning; the minutes run past 1440', () => {
    expect(businessDay(bar, THU)).toEqual({ open: 1080, close: 1560, breaks: [] })
  })

  it('after midnight the bar is still open on yesterday’s hours', () => {
    // Thursday 01:00 at the business = Wednesday's day at minute 1500
    expect(openState(bar, at('2026-10-14T20:00:00Z'))).toEqual({ open: true, until: 120 })
    // Thursday 03:00: closed until 18:00
    expect(openState(bar, at('2026-10-14T22:00:00Z'))).toEqual({ open: false, inDays: 0, at: 1080 })
    // Thursday 23:00: open until 02:00
    expect(openState(bar, at('2026-10-15T18:00:00Z'))).toEqual({ open: true, until: 1560 })
    // Sunday 01:00: Saturday's night is still on, though Sunday is closed
    expect(openState(bar, at('2026-10-17T20:00:00Z'))).toEqual({ open: true, until: 120 })
  })

  it('a day’s part past midnight must end by the next day’s opening', () => {
    expect(weekHoursErrors(NIGHT)).toEqual([])
    // Monday until 11:00 the next morning runs into Tuesday's 10:00 opening
    expect(weekHoursErrors([h(600, 2100), h(600, 1200), null, null, null, null, null])).toEqual([0])
    // Sunday's night runs into Monday's morning (the week wraps)
    expect(weekHoursErrors([h(60, 600), null, null, null, null, null, h(1080, 1560)])).toEqual([6])
    // closing before opening, past 48:00 or longer than a day; a break outside the hours
    expect(
      weekHoursErrors([h(1200, 1100), h(600, 2900), h(0, 1500), { ...h(600, 1200), break: { start: 500, end: 700 } }, null, null, null]),
    ).toEqual([0, 1, 2, 3])
  })
})

describe('free times past midnight', () => {
  const NOW = at('2026-10-14T05:00:00Z') // Wednesday 10:00
  const every = (open: number, close: number): WeekHours => Array.from({ length: 7 }, () => h(open, close))
  const ctx = (hours: WeekHours, busy: AppointmentContext['busy'] = []): AppointmentContext => ({
    business: { hours, exceptions: [] },
    rules: { leadMinutes: 60, windowDays: 30, bufferMinutes: 0, slotStep: 30 },
    staff: [{ id: 'a', serviceIds: ['cut'], bookable: true, active: true, shift: null, breaks: [], daysOff: [] }],
    services: [{ id: 'cut', durationMin: 60, bufferMin: null, online: true }],
    busy,
    now: NOW,
  })
  const q = (date: string): AppointmentQuery => ({ date, serviceIds: ['cut'], staffId: 'a', by: 'client' })
  const starts = (c: AppointmentContext, date: string) => appointmentSlots(c, q(date)).map((s) => s.start)

  it('offers starts after midnight on the day that started', () => {
    const s = starts(ctx(every(1080, 1560)), THU)
    expect(s[0]).toBe(1080)
    expect(s.at(-1)).toBe(1500) // 01:00 the next morning, an hour before closing
  })

  it('the next day’s early bookings and the day before’s late ones are busy too', () => {
    // a Friday 00:30–01:30 booking (minutes 30–90 of Friday) is Thursday's 1470–1530
    const fromNextDay = starts(ctx(every(1080, 1560), [{ staffId: 'a', date: FRI, start: 30, end: 90, bookingId: 'x' }]), THU)
    expect(fromNextDay).not.toContain(1440)
    expect(fromNextDay).not.toContain(1470)
    expect(fromNextDay).toContain(1380)
    // a Wednesday booking until 01:00 (minute 1500) is Thursday's 0–60
    const fromDayBefore = starts(ctx(every(0, 1560), [{ staffId: 'a', date: WED, start: 1380, end: 1500, bookingId: 'y' }]), THU)
    expect(fromDayBefore).not.toContain(0)
    expect(fromDayBefore).toContain(60)
  })
})
