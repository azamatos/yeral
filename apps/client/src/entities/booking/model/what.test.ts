import { describe, expect, it } from 'vitest'
import { visitLine, whatParts } from './what'

describe('what a booking was for', () => {
  it('names an appointment’s services and its specialists once each', () => {
    const items = [
      { serviceId: 's1', service: 'Women’s haircut', staffId: 'st-ayna', staff: 'Aýna', start: 600, end: 660 },
      { serviceId: 's2', service: 'Hair styling', staffId: 'st-ayna', staff: 'Aýna', start: 660, end: 705 },
      { serviceId: 's5', service: 'Manicure', staffId: null, staff: null, start: 705, end: 765 },
    ]
    expect(whatParts({ type: 'appointment', items })).toEqual(['Women’s haircut, Hair styling, Manicure', 'Aýna'])
  })

  it('names a class with its trainer, and a table by its area', () => {
    expect(whatParts({ type: 'class', session: 'Morning flow', trainer: 'Aýgözel', seats: 1 })).toEqual(['Morning flow', 'Aýgözel'])
    expect(whatParts({ type: 'class', session: 'Morning flow', trainer: null, seats: 1 })).toEqual(['Morning flow'])
    expect(whatParts({ type: 'table', partySize: 4, area: 'Terrace', requests: [] })).toEqual(['Terrace'])
  })

  it('heads a visit with what it was for and its date, the next one past midnight', () => {
    const fmt = { shortWeekdayDate: (date: string) => `on ${date}` }
    const what = { type: 'table' as const, partySize: 4, area: 'Terrace', requests: [] }
    expect(visitLine({ what, date: '2026-10-23', start: 600 }, fmt)).toBe('Terrace · on 2026-10-23')
    expect(visitLine({ what, date: '2026-10-23', start: 1500 }, fmt)).toBe('Terrace · on 2026-10-24')
  })
})
