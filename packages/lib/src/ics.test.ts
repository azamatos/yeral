import { describe, expect, it } from 'vitest'
import { buildIcs } from './ics'

const event = {
  uid: 'YR-48213@yeral.app',
  product: 'Ýeral',
  start: Date.UTC(2026, 9, 25, 9, 30),
  end: Date.UTC(2026, 9, 25, 10, 30),
  title: 'Women’s haircut, Glow Studio',
  location: 'Bitarap Türkmenistan avenue 247; 2nd floor',
  stamp: Date.UTC(2026, 9, 24, 12, 0),
}

describe('an event for the calendar', () => {
  it('writes the booking as one event in UTC with CRLF lines', () => {
    const ics = buildIcs(event)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics).toContain('DTSTART:20261025T093000Z\r\n')
    expect(ics).toContain('DTEND:20261025T103000Z\r\n')
    expect(ics).toContain('DTSTAMP:20261024T120000Z\r\n')
    expect(ics).toContain('UID:YR-48213@yeral.app\r\n')
    expect(ics).toContain('PRODID:-//Ýeral//Booking//EN\r\n')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
  })

  it('escapes commas and semicolons in text', () => {
    const ics = buildIcs(event)
    expect(ics).toContain('SUMMARY:Women’s haircut\\, Glow Studio')
    expect(ics).toContain('LOCATION:Bitarap Türkmenistan avenue 247\\; 2nd floor')
  })

  it('folds a long line at 75 octets', () => {
    const ics = buildIcs({ ...event, description: 'x'.repeat(200) })
    const lines = ics.split('\r\n')
    expect(lines.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
    expect(lines.some((l) => l.startsWith(' x'))).toBe(true)
  })

  it('leaves out what it has no words for', () => {
    expect(buildIcs({ uid: 'a', product: 'p', start: 0, end: 1, title: 't' })).not.toContain('LOCATION')
  })
})
