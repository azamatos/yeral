/**
 * «Add to calendar» (Booking sent page, client spec §4.4: «Senenama goş» downloads an `.ics` file): one event as an
 * iCalendar file (RFC 5545) any calendar app opens. Times are instants (epoch ms), written in UTC, so the event lands at
 * the business's local time wherever the phone is. The words (the title, the place) are the caller's.
 */
export interface IcsEvent {
  /** Unique and stable for the booking, so adding it twice updates one event: `YR-48213@yeral.app`. */
  uid: string
  start: number
  end: number
  title: string
  location?: string
  description?: string
  /** When the file was made (defaults to now). */
  stamp?: number
}

/** `20261025T113000Z` */
const utc = (epoch: number) =>
  new Date(epoch)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

/** Text values escape backslashes, semicolons, commas and line breaks (RFC 5545 §3.3.11). */
const text = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Lines longer than 75 octets fold onto continuation lines that start with a space (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder()
  const out: string[] = []
  let current = ''
  for (const ch of line) {
    if (bytes.encode(current + ch).length > (out.length === 0 ? 75 : 74)) {
      out.push(current)
      current = ''
    }
    current += ch
  }
  out.push(current)
  return out.join('\r\n ')
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Yeral//Booking//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${text(event.uid)}`,
    `DTSTAMP:${utc(event.stamp ?? Date.now())}`,
    `DTSTART:${utc(event.start)}`,
    `DTEND:${utc(event.end)}`,
    `SUMMARY:${text(event.title)}`,
    ...(event.location ? [`LOCATION:${text(event.location)}`] : []),
    ...(event.description ? [`DESCRIPTION:${text(event.description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return `${lines.map(fold).join('\r\n')}\r\n`
}

/** The calendar file's media type, for the app that saves it. */
export const ICS_TYPE = 'text/calendar;charset=utf-8'
