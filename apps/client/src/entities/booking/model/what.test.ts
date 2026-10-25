import { describe, expect, it } from 'vitest'
import { whatParts } from './what'

describe('what a booking was for', () => {
  it('names an appointment’s services and its specialists once each', () => {
    const items = [
      { service: 'Women’s haircut', staff: 'Aýna', start: 600, end: 660 },
      { service: 'Hair styling', staff: 'Aýna', start: 660, end: 705 },
      { service: 'Manicure', staff: null, start: 705, end: 765 },
    ]
    expect(whatParts({ type: 'appointment', items })).toEqual(['Women’s haircut, Hair styling, Manicure', 'Aýna'])
  })

  it('names a class with its trainer, and a table by its area', () => {
    expect(whatParts({ type: 'class', session: 'Morning flow', trainer: 'Aýgözel', seats: 1 })).toEqual(['Morning flow', 'Aýgözel'])
    expect(whatParts({ type: 'class', session: 'Morning flow', trainer: null, seats: 1 })).toEqual(['Morning flow'])
    expect(whatParts({ type: 'table', partySize: 4, area: 'Terrace', requests: [] })).toEqual(['Terrace'])
  })
})
