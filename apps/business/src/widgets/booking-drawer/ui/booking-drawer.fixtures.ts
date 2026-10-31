/**
 * The booking drawer's stories' world: a fixed clock (Wednesday, 14 October 2026, 11:30 business time, so nothing
 * depends on the day the stories run), Gözel's confirmed booking tomorrow with her card, the internal statuses, and a
 * `fetch` that answers like the api and keeps what the drawer saves (the note, the internal status, a report filed
 * or removed, a cancel).
 */
import type { CalendarBooking } from '@yeral/contract/calendar'
import type { ClientCard } from '@yeral/contract/clients'
import type { InternalStatus } from '@yeral/contract/settings'
import type { ComplaintType } from '@yeral/domain/model'
import { addDays, epochOf } from '@yeral/domain/time'

export const DAY = '2026-10-14'
export const TOMORROW = addDays(DAY, 1)
/** 11:30 on the day. */
export const NOW = epochOf(DAY, 690)
export const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
export const CODE = 'YR-48210'
/** The specialist whose column the booking is in. */
export const AYNA = { staffId: id(1), name: 'Aýna' }
/** The owner. */
export const MAYSA = { staffId: id(6), name: 'Maýsa Annaýewa' }

export const booking = (patch: Partial<CalendarBooking> = {}): CalendarBooking => ({
  code: CODE,
  type: 'appointment',
  date: TOMORROW,
  start: 600,
  end: 660,
  status: 'confirmed',
  cancelledBy: null,
  source: 'web',
  client: { id: id(7), name: 'Gözel Annaýewa', phone: '+99365102030' },
  items: [{ serviceId: id(5), service: 'Women’s haircut', staffId: id(1), staff: 'Aýna', start: 600, end: 660, bufferAfter: 10 }],
  price: { type: 'fixed', amount: 120 },
  internalStatusId: null,
  alert: false,
  clientNote: 'Could you use the same colour as last time?',
  internalNote: null,
  holdUntil: null,
  complaint: null,
  move: null,
  ...patch,
})

/** A report as the api holds it: filed at `at` (11:15 today without one) by Maýsa. */
export const report = (
  type: ComplaintType,
  patch: Partial<NonNullable<CalendarBooking['complaint']>> = {},
): NonNullable<CalendarBooking['complaint']> => ({ type, text: null, by: MAYSA, at: epochOf(DAY, 675), ...patch })

const visit = (n: number, daysAgo: number, service: string, status: ClientCard['history'][number]['status'], amount: number) => ({
  code: `YR-4810${n}`,
  date: addDays(DAY, -daysAgo),
  start: 600,
  end: 660,
  status,
  holdUntil: null,
  items: [{ serviceId: id(5), service, staffId: id(1), staff: 'Aýna', start: 600, end: 660 }],
  price: { type: 'fixed' as const, amount },
})

/** Gözel's card: 12 visits, one no-show, a note shown when she books, four past bookings (the one open among them). */
export const card = (patch: Partial<ClientCard> = {}, stats: Partial<ClientCard['stats']> = {}): ClientCard => ({
  id: id(7),
  name: 'Gözel Annaýewa',
  phone: '+99365102030',
  account: true,
  birthday: null,
  source: 'instagram',
  tags: ['VIP'],
  segments: ['regular'],
  since: '2024-03-02',
  stats: { visits: 12, avgCheck: 145, lastVisit: addDays(DAY, -9), noShows: 1, ...stats },
  notes: [
    { id: id(8), text: 'Allergic to ammonia dyes', alert: true, by: 'Maýsa', at: NOW - 86_400_000 },
    { id: id(9), text: 'Prefers mornings', alert: false, by: 'Maýsa', at: NOW - 86_400_000 },
  ],
  upcoming: [],
  history: [
    { ...visit(0, 0, 'Women’s haircut', 'completed', 120), code: CODE },
    visit(1, 9, 'Women’s haircut', 'completed', 120),
    visit(2, 30, 'Hair colouring', 'noshow', 250),
    visit(3, 62, 'Hair colouring', 'completed', 250),
  ],
  moreHistory: true,
  reports: [],
  settings: { phoneOnly: false, phoneOnlyByCount: false, noReminders: false },
  ...patch,
})

export const statuses: InternalStatus[] = [
  { id: id(2), preset: 'arrived', name: 'Arrived', icon: 'user-check', color: '#066a41', enabled: true },
  { id: id(3), preset: 'started', name: 'Started', icon: 'play', color: '#4429d6', enabled: false },
  { id: id(4), preset: null, name: 'Preparing', icon: 'hourglass', color: '#93500a', enabled: true },
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export type Call = { route: string; body: unknown }

/** The api as the drawer asks it; `calls` collects what it was sent. */
export const fakeApi =
  ({
    booking: b = booking(),
    card: c = card(),
    internal = false,
    gone = false,
    by = MAYSA,
    calls = [],
  }: {
    booking?: CalendarBooking
    card?: ClientCard | null
    /** The workspace switched internal statuses on. */
    internal?: boolean
    /** The reader doesn't see this booking. */
    gone?: boolean
    /** Who files a report in this story (the reader). */
    by?: { staffId: string; name: string }
    calls?: Call[]
  } = {}): (() => typeof fetch) =>
  () => {
    // what was saved in this story, read back
    let note = b.internalNote
    let internalStatusId = b.internalStatusId
    let complaint = b.complaint
    let status = b.status
    let cancelledBy = b.cancelledBy
    const one = `/w/glow-studio/bookings/${CODE}`
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      const route = `${request.method} ${url.pathname.replace(/^\/v1/, '')}`
      const sent = async () => {
        const body: unknown = await request.json()
        calls.push({ route, body })
        return body
      }
      if (route === `GET ${one}`)
        return gone
          ? json({ error: { code: 'not_found' } }, 404)
          : json({ ...b, internalNote: note, internalStatusId, complaint, status, cancelledBy })
      if (route === 'GET /w/glow-studio/settings/statuses') return json({ items: internal ? statuses : [], max: 5 })
      if (route === `GET /w/glow-studio/clients/${id(7)}`) return c ? json(c) : json({ error: { code: 'not_found' } }, 404)
      if (route === `PUT ${one}/note`) {
        note = ((await sent()) as { note: string | null }).note
        return new Response(null, { status: 204 })
      }
      if (route === `PUT ${one}/internal-status`) {
        internalStatusId = ((await sent()) as { statusId: string | null }).statusId
        return new Response(null, { status: 204 })
      }
      if (route === `POST ${one}/complaint`) {
        const input = (await sent()) as { type: ComplaintType; text?: string }
        complaint = { type: input.type, text: input.text ?? null, by, at: NOW }
        if (input.type === 'noshow') status = 'noshow'
        return new Response(null, { status: 204 })
      }
      if (route === `DELETE ${one}/complaint`) {
        calls.push({ route, body: null })
        complaint = null
        if (status === 'noshow') status = NOW >= epochOf(b.date, b.end) ? 'completed' : 'confirmed'
        return new Response(null, { status: 204 })
      }
      if (route === `POST ${one}/cancel`) {
        const input = (await sent()) as { reason: string }
        status = 'cancelled'
        cancelledBy = input.reason === 'client_called' ? 'client' : 'business'
        return new Response(null, { status: 204 })
      }
      return json({ error: { code: 'not_found' } }, 404)
    }
  }
