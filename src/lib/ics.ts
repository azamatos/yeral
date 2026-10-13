import { epochOf } from '@/domain/time'

/** «Добавить в календарь»: a one-event .ics file (times in UTC, so any calendar app gets it right). */
export function downloadIcs(o: { title: string; date: string; start: number; dur: number; location: string; id: string }) {
  const z = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const from = epochOf(o.date, o.start)
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Yeral//RU', 'BEGIN:VEVENT',
    `UID:${o.id}@yeral.app`, `DTSTAMP:${z(Date.now())}`, `DTSTART:${z(from)}`, `DTEND:${z(from + o.dur * 60000)}`,
    `SUMMARY:${o.title}`, `LOCATION:${o.location}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = 'yeral.ics'
  a.click()
}
