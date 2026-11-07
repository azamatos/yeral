/**
 * Calendar · day — B-Calendar (v0.6 round 2, English), in the app's shell over a `fetch` that answers like the api:
 * Glow Studio's day, everyone's column with their count, the bookings by status, a request with its timer, the day's
 * line, the now line; Show cancelled, the next day, a specialist's own column, the timer of a request that came in
 * while the business was closed.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { CalendarView } from '@yeral/contract/calendar'
import type { BookingRequest } from '@yeral/contract/requests'
import type { Workspace } from '@yeral/contract/team'
import { addDays, localOf, today } from '@yeral/domain/time'
import { expect, screen, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { mondayOf } from '../model/grid'
import { CalendarPage } from './calendar-page'

/** Opens a Select's list (a portal: found on `screen`) and picks a row; waits for the list to close. */
async function pick(trigger: HTMLElement, option: string | RegExp) {
  await userEvent.click(trigger)
  const list = await screen.findByRole('listbox')
  await userEvent.click(await within(list).findByRole('option', { name: option }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

const me: Me = {
  id: 'u-maysa',
  name: 'Maýsa Annaýewa',
  firstName: 'Maýsa',
  surname: 'Annaýewa',
  phone: '+99365102030',
  lang: 'en',
  notifications: { confirmation: true, reminderDay: true, reminder2h: true, reviewAsk: false },
  hasBusiness: true,
  canChangePhone: true,
  demo: false,
  photo: null,
}

const glow = (level: Workspace['level']): Workspace => ({
  slug: 'glow-studio',
  name: 'Glow Studio',
  address: '247 Bitarap Türkmenistan Avenue',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  logo: null,
  level,
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer: 0,
  staffId: '00000000-0000-4000-8000-0000000000aa',
  requestsToAnswer: 1,
  lastOpenedAt: 1,
})

const now = Date.now()
const DAY = today(now)
const TOMORROW = addDays(DAY, 1)
const HOLIDAY = addDays(DAY, 2)
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const staff = [
  { staffId: id(1), name: 'Aýna', hasApp: true },
  { staffId: id(2), name: 'Maral', hasApp: true },
  { staffId: id(3), name: 'Jeren', hasApp: true },
  { staffId: id(4), name: 'Leýli', hasApp: false },
]
/** Everyone 09:00–20:00, Jeren 10:00–18:00; Aýna's break at 14:00; Leýli's day off tomorrow; the business closed after. */
const dayOf = (s: (typeof staff)[number], date: string): CalendarView['columns'][number]['days'][number] => {
  if (date === HOLIDAY) return { date, working: null, breaks: [], off: { kind: 'business-closed', name: 'Independence Day' } }
  if (date === TOMORROW && s.name === 'Leýli') return { date, working: null, breaks: [], off: { kind: 'dayoff', name: null } }
  const working = s.name === 'Jeren' ? { open: 600, close: 1080 } : { open: 540, close: 1200 }
  return { date, working, breaks: date === DAY && s.name === 'Aýna' ? [{ start: 840, end: 880 }] : [], off: null }
}
const column = (s: (typeof staff)[number], date: string) => ({
  ...s,
  photo: null,
  level: 'specialist' as const,
  removed: false,
  days: [dayOf(s, date)],
})
let n = 0
const booking = (
  who: number,
  date: string,
  start: number,
  end: number,
  status: CalendarView['bookings'][number]['status'],
  client: string,
  service: string,
  patch: Partial<CalendarView['bookings'][number]> = {},
): CalendarView['bookings'][number] => ({
  code: `YR-${48200 + n++}`,
  type: 'appointment',
  date,
  start,
  end,
  status,
  cancelledBy: status === 'cancelled' ? 'client' : null,
  source: 'web',
  client: { id: null, name: client, phone: '+99365000000' },
  items: [{ serviceId: id(5), service, staffId: id(who), staff: staff[who - 1]!.name, start, end, bufferAfter: 10 }],
  price: null,
  internalStatusId: null,
  alert: false,
  clientNote: null,
  internalNote: null,
  holdUntil: status === 'pending' ? now + 18 * 60_000 : null,
  complaint: null,
  move: null,
  ...patch,
})

/**
 * Glow Studio's day (demo-data v06r2): every status, a phone booking with an alert note, a request waiting 18 min,
 * a client asking to move hers to 16:00.
 */
const asked = { code: 'YR-49001', date: DAY, start: 960, end: 1050, holdUntil: now + 25 * 60_000 }
const dayBookings = [
  booking(1, DAY, 600, 645, 'confirmed', 'Gözel A.', 'Women’s haircut'),
  booking(1, DAY, 660, 780, 'pending', 'Mähri G.', 'Hair colouring'),
  booking(2, DAY, 540, 600, 'completed', 'Bahar N.', 'Manicure'),
  booking(2, DAY, 630, 720, 'confirmed', 'Ogulgerek M.', 'Gel manicure', { source: 'phone', alert: true, move: asked }),
  booking(3, DAY, 720, 750, 'noshow', 'Aýgül T.', 'Brows and lashes'),
  booking(4, DAY, 840, 900, 'confirmed', 'Leýla S.', 'Back massage'),
]
const cancelledOne = booking(1, DAY, 615, 660, 'cancelled', 'Şemşat K.', 'Hair styling')
const tomorrowBookings = [booking(2, TOMORROW, 600, 660, 'confirmed', 'Jemal B.', 'Pedicure')]
/** A busy day for the week (B7-Calendar · B3): Aýna's 15-minute brow shaping, and two bookings at one time, one by phone. */
const busyDay = [
  booking(1, DAY, 900, 915, 'confirmed', 'Jahan Berdiýewa', 'Brow shaping'),
  booking(1, DAY, 960, 1020, 'confirmed', 'Aýlar Hommadowa', 'Peeling'),
  booking(1, DAY, 990, 1050, 'completed', 'Sona Pirmuhammedowa', 'Lash lift', { source: 'phone' }),
]
const moved = dayBookings[3]!
const move: CalendarView['moves'][number] = {
  ...asked,
  of: { code: moved.code, date: DAY, start: 630, end: 720 },
  items: moved.items.map((i) => ({ ...i, start: 960, end: 1050 })),
  client: { name: 'Ogulgerek M.', phone: '+99365000000' },
}

const viewOf = (date: string, cancelled: boolean, only?: string): CalendarView => {
  const all = [
    ...(date === DAY ? dayBookings : date === TOMORROW ? tomorrowBookings : []),
    ...(cancelled && date === DAY ? [cancelledOne] : []),
  ]
  const mine = (x: { staffId: string | null }) => !only || x.staffId === only
  const columns = staff.filter((s) => !only || s.staffId === only).map((s) => column(s, date))
  const bookings = all.filter((b) => !only || b.items.some((i) => i.staffId === only))
  const live = bookings.filter((b) => b.status !== 'cancelled')
  return {
    from: date,
    to: date,
    columns,
    bookings,
    moves: date === DAY ? [move].filter((m) => m.items.some(mine)) : [],
    blocks:
      date === DAY
        ? [
            { id: id(9), staffId: id(3), date, start: 990, end: 1050, kind: 'training' as const, reason: 'Training', seriesId: null },
          ].filter(mine)
        : [],
    // Aýna busy elsewhere 19:00–20:00 today and tomorrow (tomorrow's is clicked: today's may be gone by)
    elsewhere: date === DAY || date === TOMORROW ? [{ staffId: id(1), date, start: 1140, end: 1200 }].filter(mine) : [],
    summary: [
      {
        date,
        count: live.length,
        requests: live.filter((b) => b.status === 'pending').length,
        revenue: only ? 570 : 1410,
      },
    ],
    internalStatuses: [],
  }
}

/** Seven days as the api answers `days=7`: everyone's column across the week, the bookings and summaries of them all. */
const weekOf = (from: string, cancelled: boolean, only?: string): CalendarView => {
  const days = Array.from({ length: 7 }, (_, i) => viewOf(addDays(from, i), cancelled, only))
  return {
    ...days[0]!,
    to: addDays(from, 6),
    columns: days[0]!.columns.map((c, k) => ({ ...c, days: days.flatMap((d) => d.columns[k]!.days) })),
    bookings: days.flatMap((d) => d.bookings),
    moves: days.flatMap((d) => d.moves),
    blocks: days.flatMap((d) => d.blocks),
    elsewhere: days.flatMap((d) => d.elsewhere),
    summary: days.flatMap((d) => d.summary),
  }
}

/** The waiting requests, most urgent first: Mähri G.'s (18 min) and Ogulgerek M.'s move (25 min). */
const requestsOf = (canAnswer: boolean, moveFits = true): BookingRequest[] => {
  const asking = dayBookings[1]!
  return [
    {
      code: asking.code,
      kind: 'new',
      type: 'appointment',
      date: DAY,
      start: asking.start,
      end: asking.end,
      holdUntil: asking.holdUntil!,
      warnAt: null,
      sentAt: now - 12 * 60_000,
      items: asking.items,
      price: { type: 'fixed', amount: 250 },
      note: 'Could you use the same colour as last time?',
      from: null,
      fits: null,
      client: { id: null, name: 'Mähri G.', phone: '+99365123456', visits: 3, noShows: 1, alerts: ['Allergic to ammonia dyes'] },
      canAnswer,
      answeredBy: 'desk',
    },
    {
      code: move.code,
      kind: 'move',
      type: 'appointment',
      date: DAY,
      start: move.start,
      end: move.end,
      holdUntil: move.holdUntil!,
      warnAt: null,
      sentAt: now - 5 * 60_000,
      items: move.items,
      price: null,
      note: null,
      from: { date: DAY, start: 630, end: 720 },
      fits: moveFits,
      client: { id: null, name: 'Ogulgerek M.', phone: '+99365000000', visits: 0, noShows: 0, alerts: [] },
      canAnswer,
      answeredBy: 'desk',
    },
  ]
}

/** The menu (book B-38): Aýna cuts and colours, Maral cuts and does nails; nobody does colouring and nails. */
const service = (n: number, name: string, durationMin: number, priceAmount: number, staffIds: string[], priceType = 'fixed') => ({
  id: id(n),
  groupId: id(0),
  name: { en: name },
  description: null,
  durationMin,
  priceType,
  priceAmount,
  bufferMin: null,
  online: true,
  staffIds,
  futureBookings: 0,
})
const menu = {
  groups: [
    {
      id: id(0),
      name: { en: 'Hair' },
      services: [service(5, 'Women’s haircut', 45, 120, [id(1), id(2)]), service(6, 'Hair colouring', 120, 300, [id(1)], 'from')],
    },
    { id: id(7), name: { en: 'Nails' }, services: [service(8, 'Manicure', 60, 80, [id(2)])] },
  ],
}
/** The business's client with an alert note, whom the drawer finds by number or name. */
const gozel = {
  id: id(9),
  name: 'Gözel Annaýewa',
  phone: '+99365123456',
  visits: 12,
  avgCheck: 145,
  phoneOnly: false,
  alerts: ['Allergic to ammonia'],
  usualServices: [id(8)],
}
/** The clients list as the new booking's one field searches it (B7): Gözel and Jemal, by visits. */
const clients = [
  { ...gozel, tags: [], segments: ['regular'], lastVisit: '2026-10-02', total: null, next: null },
  {
    id: id(3),
    name: 'Jemal Berdiýewa',
    phone: '+99361234567',
    tags: [],
    segments: ['new'],
    phoneOnly: false,
    visits: 2,
    lastVisit: '2026-09-20',
    total: null,
    avgCheck: null,
    next: null,
  },
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and the calendar ask it; `open` false: the business is closed every day (a late request). */
const fakeApi =
  (
    level: Workspace['level'],
    {
      open = true,
      arrives = false,
      moveFits = true,
      internal = false,
      busy = false,
      refuseMove,
    }: {
      /** false: the business is closed every day (a late request). */
      open?: boolean
      /** A new request comes in once one is answered (the shell's toast). */
      arrives?: boolean
      /** The client's move fits now (B-21's fit line). */
      moveFits?: boolean
      /** Internal statuses switched on, «Arrived» set on Gözel A.'s booking (book B-29). */
      internal?: boolean
      /** The team's move is refused with this `cannot_move` (book B-26). */
      refuseMove?: { problem: string; staffId: string; busy?: { start: number; end: number } }
      /** Aýna's busy day too (`busyDay`): the week's short and overlapping blocks. */
      busy?: boolean
    } = {},
  ): (() => typeof fetch) =>
  () => {
    // the requests confirmed in this story
    const answered = new Set<string>()
    // the time blocked in this story (book B-18); over a booking the api refuses, naming it
    const blocked: CalendarView['blocks'] = []
    const arrived: CalendarView['internalStatuses'][number] = {
      id: id(6),
      preset: 'arrived',
      name: 'Arrived',
      icon: 'user-check',
      color: '#066a41',
      enabled: true,
    }
    // the bookings moved in this story (book B-26): the new day and time, and another specialist's when given
    const movedTo = new Map<string, { date: string; start: number; staffId?: string }>()
    // the bookings saved in this story (book B-23), gone again with Undo
    const saved: CalendarView['bookings'] = []
    const marked = (b: CalendarView['bookings'][number]) => {
      const to = movedTo.get(b.code)
      if (to) {
        const end = to.start + b.end - b.start
        const who = staff.find((s) => s.staffId === to.staffId)
        const items = b.items.map((i) => ({ ...i, start: to.start, end, ...(who ? { staffId: who.staffId, staff: who.name } : {}) }))
        return { ...b, date: to.date, start: to.start, end, items }
      }
      return internal && b.code === dayBookings[0]!.code ? { ...b, internalStatusId: arrived.id } : b
    }
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      const route = `${request.method} ${url.pathname.replace(/^\/v1/, '')}`
      const w = glow(level)
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [w], current: w.slug })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
      if (route === 'GET /w/glow-studio/calendar') {
        const view = (url.searchParams.get('days') === '7' ? weekOf : viewOf)(
          url.searchParams.get('date')!,
          url.searchParams.get('cancelled') === 'true',
          level === 'specialist' ? id(2) : undefined,
        )
        return json({
          ...view,
          bookings: [...view.bookings.map(marked), ...(busy ? busyDay : []), ...saved.filter((b) => b.date === view.from)],
          blocks: [...view.blocks, ...blocked.filter((k) => k.date === view.from)],
          internalStatuses: internal ? [arrived] : [],
        })
      }
      if (route === 'POST /w/glow-studio/calendar/blocks') {
        const body = (await request.json()) as {
          staffId: string
          date: string
          start: number
          end: number
          kind?: 'training'
          reason?: string
          repeat?: string
        }
        const dates = body.repeat ? [body.date, addDays(body.date, body.repeat === 'daily' ? 1 : 7)] : [body.date]
        const hits = [...dayBookings, ...tomorrowBookings].filter(
          (b) => dates.includes(b.date) && b.items.some((i) => i.staffId === body.staffId) && b.start < body.end && body.start < b.end,
        )
        if (hits.length)
          return json(
            {
              error: {
                code: 'block_over_bookings',
                details: { bookings: hits.map(({ code, date, start, end }) => ({ code, date, start, end })) },
              },
            },
            409,
          )
        const items = dates.map((date, i) => ({
          id: id(7 + i),
          staffId: body.staffId,
          date,
          start: body.start,
          end: body.end,
          kind: body.kind ?? null,
          reason: body.reason ?? null,
          seriesId: null,
        }))
        blocked.push(...items)
        return json({ items })
      }
      if (route === 'GET /w/glow-studio/services') return json(menu)
      if (route === 'GET /w/glow-studio/clients') {
        const q = url.searchParams.get('q')?.toLowerCase() ?? ''
        const digits = /^\d+$/.test(q)
        const items = clients
          .filter((c) => !q || (digits ? c.phone.replace(/\D/g, '').includes(q) : c.name.toLowerCase().includes(q)))
          .slice(0, Number(url.searchParams.get('limit') ?? 12))
        return json({ items, cursor: null, counts: { all: items.length, regular: 0, new: 0, lapsed: 0, flagged: 0 } })
      }
      if (route === 'GET /w/glow-studio/clients/lookup') {
        const digits = url.searchParams.get('phone')?.replace(/\D/g, '')
        const name = url.searchParams.get('name')?.toLowerCase()
        const hit = digits ? gozel.phone.slice(4).startsWith(digits) : !!name && gozel.name.toLowerCase().startsWith(name)
        return json({ items: hit ? [gozel] : [] })
      }
      if (route === `GET /w/glow-studio/clients/${gozel.id}`)
        return json({ ...gozel, stats: { visits: 12, lastVisit: '2026-10-02' }, settings: { phoneOnly: false } })
      if (route === 'POST /w/glow-studio/bookings') {
        const body = (await request.json()) as { staffId: string; date: string; start: number; serviceIds: string[] }
        const who = staff.findIndex((s) => s.staffId === body.staffId) + 1
        const code = `YR-4840${saved.length}`
        saved.push(booking(who, body.date, body.start, body.start + 45, 'confirmed', 'Gözel A.', 'Women’s haircut', { code }))
        return json({ code, undoUntil: now + 10_000 })
      }
      const undo = /^POST \/w\/glow-studio\/bookings\/([^/]+)\/undo$/.exec(route)
      if (undo) {
        saved.splice(
          saved.findIndex((b) => b.code === undo[1]),
          1,
        )
        return new Response(null, { status: 204 })
      }
      const moving = /^POST \/w\/glow-studio\/bookings\/([^/]+)\/move$/.exec(route)
      if (moving) {
        if (refuseMove) return json({ error: { code: 'cannot_move', details: refuseMove } }, 409)
        movedTo.set(moving[1]!, (await request.json()) as { date: string; start: number; staffId?: string })
        return new Response(null, { status: 204 })
      }
      // one booking on its own (the booking drawer), the team's note and marker on it
      const one = /^(GET|PUT) \/w\/glow-studio\/bookings\/([^/]+)(\/note|\/internal-status)?$/.exec(route)
      if (one) {
        const found = [...dayBookings, ...tomorrowBookings, cancelledOne, ...busyDay].find((b) => b.code === one[2])
        if (!found) return json({ error: { code: 'not_found' } }, 404)
        return one[1] === 'GET' ? json(marked(found)) : new Response(null, { status: 204 })
      }
      if (route === 'GET /w/glow-studio/settings/statuses') return json({ items: internal ? [arrived] : [], max: 5 })
      if (route === 'GET /w/glow-studio/settings/hours')
        return json({
          hours: Array.from({ length: 7 }, () => (open ? { open: 0, close: 1440, break: null } : null)),
          specialDays: [],
        })
      if (route === 'GET /w/glow-studio/requests') {
        const items = requestsOf(level !== 'specialist', moveFits)
        // `arrives`: once one is answered, a new one comes in (the shell's toast)
        const first = items[0]!
        const arrived =
          arrives && answered.size
            ? [{ ...first, code: 'YR-48300', start: 930, end: 990, client: { ...first.client, name: 'Ejegyz T.' } }]
            : []
        return json({ items: [...items, ...arrived].filter((r) => !answered.has(r.code)) })
      }
      const answer = /^POST \/w\/glow-studio\/requests\/([^/]+)\/(confirm|decline)$/.exec(route)
      if (answer) {
        // a decline names its reason (another one in words) and up to 3 offered times
        if (answer[2] === 'decline') {
          const body = (await request.json()) as { reason: string; text?: string; offers?: unknown[] }
          if (body.reason === 'other' && !body.text) return json({ error: { code: 'validation_error' } }, 400)
        }
        answered.add(answer[1]!)
        return json({ code: answer[1] })
      }
      if (route === 'GET /w/glow-studio/free-times')
        return json({
          nearest: [
            // the declined time itself, free to the search: not offered back
            { date: DAY, start: 660, end: 780, staffId: id(1) },
            { date: DAY, start: 990, end: 1110, staffId: id(1) },
            { date: DAY, start: 1020, end: 1140, staffId: id(1) },
            { date: TOMORROW, start: 600, end: 720, staffId: id(1) },
            { date: TOMORROW, start: 660, end: 780, staffId: id(3) },
          ],
          date: url.searchParams.get('date') ?? DAY,
          slots: [600, 660, 780, 840, 1080].map((start) => ({
            start,
            end: start + 60,
            staffIds: url.searchParams.has('staff') ? [url.searchParams.get('staff')] : [id(1), id(2)],
          })),
          days: Array.from({ length: 14 }, (_, i) => ({
            date: addDays(DAY, i),
            state: i === 3 ? 'closed' : 'open',
            closedReason: null,
          })),
        })
      return json({ error: { code: 'not_found' } }, 404)
    }
  }

const meta = {
  title: 'Business/Calendar/Day',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: {
    routes: {},
    layouts: { '/w/$slug': { component: WorkspaceShell, children: { calendar: CalendarPage } } },
    path: '/w/glow-studio/calendar',
    server: fakeApi('owner'),
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The owner's day: everyone's column with their count, the bookings by status, the request's timer, the day's line. */
export const Day: Story = {
  play: async ({ canvas }) => {
    // the file's first story loads the page cold, seconds on CI: past the default second it failed main on 01.11
    const region = await canvas.findByRole('region', { name: /^Calendar, / }, { timeout: 15_000 })
    // the page is as tall as the screen and the day scrolls inside it, under the names
    await expect(region.clientHeight).toBeLessThan(region.scrollHeight)
    const grid = within(region)
    const ayna = within(grid.getByRole('group', { name: 'Aýna' }))
    await expect(ayna.getByRole('button', { name: /^10:00 Gözel A\. Women’s haircut.*10:00–10:45, Confirmed$/ })).toBeVisible()
    // the request: its timer in the block, its time left in its name
    const request = ayna.getByRole('button', { name: /Mähri G\. Hair colouring.*Pending, \d+ min left to answer$/ })
    await expect(within(request).getByText(/^\d+ min$/)).toBeVisible()
    const maral = within(grid.getByRole('group', { name: 'Maral' }))
    await expect(maral.getByRole('button', { name: /Ogulgerek M\..*by phone, alert note about the client/ })).toBeVisible()
    await expect(grid.getByText('Doesn’t use the app')).toBeVisible()
    await expect(canvas.getByText(/^Revenue \(planned\)/)).toBeVisible()
    // Aýna's request and Maral's client asking to move: in their columns and the toolbar's Requests (the summary line
    // no longer repeats them, B7-Calendar · B2); Today greyed out with «You're on today»
    await expect(canvas.getAllByText('1 request', { selector: 'span:not(.sr-only)' })).toHaveLength(2)
    await expect(canvas.getByRole('button', { name: 'Requests 2 — open the most urgent' })).toBeVisible()
    await expect(canvas.getByText(/^Revenue \(planned\)/).closest('p')).not.toHaveTextContent('request')
    await expect(canvas.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-disabled', 'true')
    await waitFor(() => expect(document.title).toBe('Calendar · Glow Studio · Ýeral Business'))
  },
}

/** The day's layers: a break, blocked time, busy elsewhere, the hours off, a client's move at the asked time. */
export const Layers: Story = {
  play: async ({ canvas }) => {
    const grid = within(await canvas.findByRole('region', { name: /^Calendar, / }))
    const ayna = within(grid.getByRole('group', { name: 'Aýna' }))
    await expect(ayna.getByText('Break')).toBeVisible()
    await expect(ayna.getByText('Busy elsewhere')).toBeVisible()
    await expect(within(grid.getByRole('group', { name: 'Jeren' })).getByText('Closed · Training')).toBeVisible()
    const maral = within(grid.getByRole('group', { name: 'Maral' }))
    const original = maral.getByRole('button', { name: /Ogulgerek M\..*→ .* · 16:00\?/ })
    const ghost = maral.getByRole('button', { name: /^16:00 New time\? Ogulgerek M\. from .* · 10:30/ })
    // pointing at one rings both
    await userEvent.hover(ghost)
    await expect(original).toHaveClass('z-5')
    await userEvent.unhover(ghost)
    await expect(original).not.toHaveClass('z-5')
    // the move opens its booking
    await userEvent.click(ghost)
    await waitFor(() => expect(original).toHaveAttribute('aria-pressed', 'true'))
    // Aýna's request and Maral's move, each counted with their column's bookings
    await expect(grid.getAllByText('2 bookings ·')).toHaveLength(2)
  },
}

/** The business closed by a special day: everyone's column says so. */
export const Closed: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
    // the next day: Leýli's day off
    await expect(await canvas.findByText('Day off')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
    await waitFor(() => expect(canvas.getAllByText('Closed · Independence Day')).toHaveLength(4))
  },
}

/** Show cancelled, a switch inside Filters (B7-Calendar · B2): the cancelled booking struck through, beside the live one at its time; «Filters · 1». */
export const ShowCancelled: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    await userEvent.click(await page.findByRole('switch', { name: 'Show cancelled' }))
    const block = await canvas.findByRole('button', { name: /Şemşat K\..*Cancelled$/ })
    await expect(block).toHaveClass('left-[52%]')
    await userEvent.keyboard('{Escape}')
    await expect(await canvas.findByRole('button', { name: 'Filters · 1' })).toBeVisible()
  },
}

/** Another day: Today is a live Tertiary S inside the DateNav box and brings today back; ‹ › move by a day. */
export const AnotherDay: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Previous day' }))
    const todayButton = await canvas.findByRole('button', { name: 'Today' })
    await waitFor(() => expect(todayButton).not.toHaveAttribute('aria-disabled'))
    await userEvent.click(todayButton)
    await expect(await canvas.findByRole('button', { name: /Gözel A\./ })).toBeVisible()
  },
}

/** 1024 (B7-Calendar · B2): nothing wraps — Filters and Requests are icons with a count badge. */
export const Laptop: Story = {
  globals: { viewport: { value: 'md' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    const requests = canvas.getByRole('button', { name: '2 — open the most urgent' })
    await expect(requests).toBeVisible()
    await expect(within(requests).getByText('2')).toBeVisible()
    await expect(within(requests).queryByText('Requests')).not.toBeVisible()
  },
}

/** The next day, and back to today. */
export const NextDay: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
    await expect(await canvas.findByRole('button', { name: /Jemal B\..*Confirmed$/ })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Today' }))
    await expect(await canvas.findByRole('button', { name: /Gözel A\./ })).toBeVisible()
  },
}

/** A day gone by: what it earned, no longer planned. */
export const PastDay: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Previous day' }))
    await expect(await canvas.findByText(/^Revenue:/)).toBeVisible()
  },
}

/** A block picked: the ink ring, again to let it go. */
export const Picked: Story = {
  play: async ({ canvas }) => {
    const block = await canvas.findByRole('button', { name: /Gözel A\./ })
    await userEvent.click(block)
    await waitFor(() => expect(canvas.getByRole('button', { name: /Gözel A\./ })).toHaveAttribute('aria-pressed', 'true'))
  },
}

/** A specialist: her own column, her earnings. */
export const Specialist: Story = {
  args: { server: fakeApi('specialist') },
  play: async ({ canvas }) => {
    const grid = within(await canvas.findByRole('region', { name: /^Calendar, / }))
    await expect(grid.getByRole('group', { name: 'Maral' })).toBeVisible()
    await expect(grid.queryByRole('group', { name: 'Aýna' })).toBeNull()
    await expect(canvas.getByText(/^Your earnings \(planned\)/)).toBeVisible()
  },
}

/** The business closed now: the request waits for the opening, its timer says by when. */
export const ClosedNow: Story = {
  args: { server: fakeApi('owner', { open: false }) },
  play: async ({ canvas }) => {
    const by = localOf(now + 18 * 60_000).min
    const time = `${String(Math.floor(by / 60)).padStart(2, '0')}:${String(by % 60).padStart(2, '0')}`
    await expect(await canvas.findByRole('button', { name: new RegExp(`Mähri G\\..*Answer by ${time}$`) })).toBeVisible()
    await expect(canvas.getByText(`by ${time}`)).toBeVisible()
  },
}

/** A tablet: the columns scroll sideways under the names and beside the hours. */
export const Tablet: Story = { globals: { viewport: { value: 'sm' } } }

/** The phone: one person's day at a time, a chip each. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const grid = within(await canvas.findByRole('region', { name: /^Calendar, / }))
    await expect(grid.getByRole('group', { name: 'Aýna' })).toBeVisible()
    await expect(grid.queryByRole('group', { name: 'Maral' })).toBeNull()
    await userEvent.click(within(canvas.getByRole('radiogroup', { name: 'Specialist' })).getByRole('radio', { name: 'Maral' }))
    await waitFor(() => expect(grid.getByRole('group', { name: 'Maral' })).toBeVisible())
    await expect(grid.queryByRole('group', { name: 'Aýna' })).toBeNull()
    // a request opened from her column keeps her day on screen
    await userEvent.click(grid.getByRole('button', { name: /^10:30 Ogulgerek M\./ }))
    await userEvent.click(within(await page.findByRole('dialog', { name: 'Time change request' })).getByRole('button', { name: 'Close' }))
    await expect(grid.getByRole('group', { name: 'Maral' })).toBeVisible()
  },
}

/** The chip opens the most urgent request: its timer, the client, the details; Confirm, then «Next request». */
export const ConfirmRequest: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(await canvas.findByRole('button', { name: 'Requests 2 — open the most urgent' }))
    const drawer = within(await page.findByRole('dialog', { name: 'Request' }))
    await expect(drawer.getByText('1 / 2')).toBeVisible()
    await expect(await drawer.findByText(/^\d+ min left to answer$/)).toBeVisible()
    await expect(
      // the hold (18 min from the real clock) may run out past midnight in the market's zone: «at 00:13 tomorrow»
      drawer.getByText(/^If no one answers, the request is cancelled at \d\d:\d\d( tomorrow)? and the client is offered 3 other times\.$/),
    ).toBeVisible()
    await expect(drawer.getByText('3 visits')).toBeVisible()
    await expect(drawer.getByText('1 no-show')).toBeVisible()
    await expect(drawer.getByText('Allergic to ammonia dyes')).toBeVisible()
    await expect(drawer.getByText('“Could you use the same colour as last time?”')).toBeVisible()
    await userEvent.click(drawer.getByRole('button', { name: 'Confirm' }))
    const confirmed = await canvas
      .findByText('Booking confirmed · the client is notified', {}, { timeout: 3000 })
      .then((n) => n.closest('[data-sonner-toast]') as HTMLElement)
    await userEvent.click(within(confirmed).getByRole('button', { name: 'Next request' }))
    const next = within(await page.findByRole('dialog', { name: 'Time change request' }))
    await expect(next.getByText('New client')).toBeVisible()
    await expect(next.getByRole('button', { name: 'Confirm the new time' })).toBeVisible()
    // the time it moves from and to, each with Show
    await expect(next.getByText('Previous time')).toBeVisible()
    await expect(next.getByText(/ · 16:00–17:30$/)).toBeVisible()
    await expect(next.getByText(/^If you confirm, the booking moves to the new time/)).toBeVisible()
    await expect(next.getByText('Maral is free at the new time — you can confirm.')).toBeVisible()
    await expect(next.getByRole('button', { name: 'Show the previous time' })).toBeVisible()
  },
}

/** A request that comes in while the page is open: the shell's toast, on any page of the workspace. */
export const RequestArrives: Story = {
  args: { server: fakeApi('owner', { arrives: true }) },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(await canvas.findByRole('button', { name: 'Requests 2 — open the most urgent' }))
    const drawer = within(await page.findByRole('dialog', { name: 'Request' }))
    await userEvent.click(await drawer.findByRole('button', { name: 'Confirm' }))
    // the list read again after the answer brings the new one; the answer's own toast stacks on it
    const arrived = await canvas.findByText('New request: Ejegyz T. · Aýna · today · 15:30', {}, { timeout: 3000 })
    await userEvent.hover(arrived.closest('ol')!)
    await waitFor(() => expect(arrived).toBeVisible())
    await expect(within(arrived.closest('li')!).getByRole('button', { name: 'Open' })).toBeVisible()
  },
}

/** A request's block opens it; the pager steps to the next. */
export const RequestFromBlock: Story = {
  play: async ({ canvas }) => {
    const grid = within(await canvas.findByRole('region', { name: /^Calendar, / }))
    await userEvent.click(grid.getByRole('button', { name: /Mähri G\. Hair colouring/ }))
    const drawer = within(await page.findByRole('dialog', { name: 'Request' }))
    await userEvent.click(drawer.getByRole('button', { name: 'Next request' }))
    await expect(await page.findByRole('dialog', { name: 'Time change request' })).toBeVisible()
    await expect(within(page.getByRole('dialog')).getByText('2 / 2')).toBeVisible()
  },
}

/** Someone who may not answer reads who does. */
export const RequestViewOnly: Story = {
  args: { server: fakeApi('specialist'), path: '/w/glow-studio/calendar?request=YR-48201' },
  play: async () => {
    const drawer = within(await page.findByRole('dialog', { name: 'Request' }))
    await expect(await drawer.findByText('The owner and admins answer requests — you can only view them.')).toBeVisible()
    await expect(drawer.queryByRole('button', { name: 'Confirm' })).toBeNull()
  },
}

/** A request answered elsewhere, or run out, while it was open. */
export const RequestGone: Story = {
  args: { path: '/w/glow-studio/calendar?request=YR-40000' },
  play: async () => {
    const drawer = within(await page.findByRole('dialog', { name: 'Request' }))
    await expect(await drawer.findByText(/isn’t waiting any more/)).toBeVisible()
    await userEvent.click(drawer.getByRole('button', { name: 'Next request' }))
    await expect(await within(page.getByRole('dialog')).findByText('1 / 2')).toBeVisible()
  },
}

/** Decline with a reason and two other times the client can take in one tap. */
export const DeclineWithTimes: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Requests 2 — open the most urgent' }))
    const drawer = within(await page.findByRole('dialog', { name: 'Request' }))
    await userEvent.click(await drawer.findByRole('button', { name: 'Decline' }))
    const modal = within(await page.findByRole('dialog', { name: 'Decline the request' }))
    const decline = modal.getByRole('button', { name: 'Decline' })
    await expect(decline).toBeDisabled()
    await userEvent.click(modal.getByRole('radio', { name: 'This time isn’t free' }))
    await userEvent.click(modal.getByRole('switch', { name: 'Offer another time' }))
    await userEvent.click(await modal.findByRole('button', { name: '16:30' }))
    await userEvent.click(modal.getByRole('button', { name: '10:00' }))
    await expect(modal.getByText('2 / 3 times selected')).toBeVisible()
    // 11:00 only tomorrow: today's is the time declined
    await expect(modal.getAllByRole('button', { name: '11:00' })).toHaveLength(1)
    await userEvent.click(decline)
    const declined = await page.findByText('Request declined · the client sees the reason and 2 other times')
    await waitFor(() => expect(declined).toBeVisible())
  },
}

/** A move seen from another day: Show takes the calendar to the asked day, the drawer stays beside it. */
export const ShowMove: Story = {
  args: { path: `/w/glow-studio/calendar?date=${TOMORROW}&request=YR-49001` },
  play: async ({ canvas }) => {
    const drawer = within(await page.findByRole('dialog', { name: 'Time change request' }))
    await expect(await canvas.findByRole('button', { name: /Jemal B\./ })).toBeVisible()
    await userEvent.click(await drawer.findByRole('button', { name: 'Show the new time' }))
    await expect(await canvas.findByRole('button', { name: /^16:00 New time\?/ })).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Time change request' })).toBeVisible()
  },
}

/** A move that doesn't fit now: the fit line says so and its Confirm is off. */
export const MoveDoesntFit: Story = {
  args: { server: fakeApi('owner', { moveFits: false }), path: '/w/glow-studio/calendar?request=YR-49001' },
  play: async () => {
    const drawer = within(await page.findByRole('dialog', { name: 'Time change request' }))
    await expect(await drawer.findByText('The new time doesn’t fit — you can’t confirm.')).toBeVisible()
    await expect(drawer.getByRole('button', { name: 'Confirm the new time' })).toBeDisabled()
    // it can still be declined
    await expect(drawer.getByRole('button', { name: 'Decline' })).toBeEnabled()
  },
}

/** Someone who may not answer a move reads who does, without the fit line's «you can confirm». */
export const MoveViewOnly: Story = {
  args: { server: fakeApi('specialist'), path: '/w/glow-studio/calendar?request=YR-49001' },
  play: async () => {
    const drawer = within(await page.findByRole('dialog', { name: 'Time change request' }))
    await expect(await drawer.findByText('The owner and admins answer requests — you can only view them.')).toBeVisible()
    await expect(drawer.queryByText(/you can confirm/)).toBeNull()
  },
}

/** A client's move: the reason only, «Another reason» in words; the booking stays at its time. */
export const DeclineMove: Story = {
  args: { path: '/w/glow-studio/calendar?request=YR-49001' },
  play: async () => {
    const drawer = within(await page.findByRole('dialog', { name: 'Time change request' }))
    await userEvent.click(await drawer.findByRole('button', { name: 'Decline' }))
    const modal = within(await page.findByRole('dialog', { name: 'Decline the new time' }))
    await expect(modal.queryByRole('switch')).toBeNull()
    await expect(modal.queryByRole('radio', { name: 'We can’t do this service' })).toBeNull()
    await userEvent.click(modal.getByRole('radio', { name: 'Another reason' }))
    const decline = modal.getByRole('button', { name: 'Decline' })
    await expect(decline).toBeDisabled()
    await userEvent.type(modal.getByRole('textbox', { name: 'Another reason' }), 'The specialist is ill that day')
    await userEvent.click(decline)
    const declined = await page.findByText('New time declined · the booking stays at its time · the client sees the reason')
    await waitFor(() => expect(declined).toBeVisible())
  },
}

/** A booking block opens its drawer (`?booking=`): the status, the client, the details; Close puts the block's ring away. */
export const OpenBooking: Story = {
  play: async ({ canvas }) => {
    const grid = within(await canvas.findByRole('region', { name: /^Calendar, / }))
    const block = within(grid.getByRole('group', { name: 'Aýna' })).getByRole('button', { name: /^10:00 Gözel A\./ })
    await userEvent.click(block)
    const d = within(await page.findByRole('dialog', { name: 'Booking' }))
    await expect(d.getByText('Confirmed')).toBeVisible()
    await expect(d.getByText('Gözel A.')).toBeVisible()
    await expect(d.getByText('Women’s haircut', { selector: 'dd' })).toBeVisible()
    await expect(d.getByRole('textbox', { name: 'Internal note' })).toBeVisible()
    await expect(block).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(d.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await expect(block).not.toHaveAttribute('aria-pressed')
  },
}

/** Internal statuses switched on (book B-29): «Arrived» as a chip on Gözel A.'s block and in its name; the select in her drawer. */
export const InternalStatuses: Story = {
  args: { server: fakeApi('owner', { internal: true }) },
  play: async ({ canvas }) => {
    const grid = within(await canvas.findByRole('region', { name: /^Calendar, / }))
    const block = within(grid.getByRole('group', { name: 'Aýna' })).getByRole('button', { name: /^10:00 Gözel A\..*Confirmed, Arrived$/ })
    await userEvent.click(block)
    const d = within(await page.findByRole('dialog', { name: 'Booking' }))
    await expect(await d.findByRole('combobox', { name: 'Internal status' })).toHaveTextContent('Arrived')
  },
}

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']
/** Tomorrow's grid (today's slots may be gone by): the free slot's menu and «Block time» from it. */
const openBlockTime = async (canvas: Canvas, name: string, time: string) => {
  await canvas.findByRole('region', { name: /^Calendar, / })
  await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
  const grid = within(canvas.getByRole('region', { name: /^Calendar, / }))
  const slot = await within(grid.getByRole('group', { name })).findByRole('button', {
    name: `${name}, ${time} — new booking or block time`,
  })
  await userEvent.click(slot)
  const menu = within(await page.findByRole('menu', { name: `${time} · ${name}` }))
  await expect(menu.getByRole('menuitem', { name: 'New booking' })).toHaveFocus()
  await userEvent.keyboard('{ArrowDown}')
  await expect(menu.getByRole('menuitem', { name: 'Block time' })).toHaveFocus()
  await userEvent.click(menu.getByRole('menuitem', { name: 'Block time' }))
  const dialog = await page.findByRole('dialog', { name: 'Block time' })
  // its first frame is transparent
  await waitFor(() => expect(dialog).toBeVisible())
  return within(dialog)
}

/**
 * A free slot (book B-18): its menu «15:00 · Maral», Block time prefilled with her and the hour, a reason chip, every
 * week with its caption; saved: the toast and the block drawn as «Closed · Training» on the day.
 */
export const BlockTime: Story = {
  play: async ({ canvas }) => {
    const d = await openBlockTime(canvas, 'Maral', '15:00')
    await expect(d.getByRole('combobox', { name: 'Person' })).toHaveTextContent('Maral')
    await expect(d.getByRole('combobox', { name: 'From' })).toHaveTextContent('15:00')
    await expect(d.getByRole('combobox', { name: 'To' })).toHaveTextContent('16:00')
    const submit = d.getByRole('button', { name: 'Block time' })
    await expect(submit).toBeDisabled()
    await userEvent.click(d.getByRole('radio', { name: 'Training' }))
    await expect(submit).toBeEnabled()
    await userEvent.click(d.getByRole('radio', { name: 'Every week' }))
    await expect(d.getByText(/^Every \w+ from .+ to .+ · 5 times$/)).toBeVisible()
    await userEvent.click(submit)
    await expect(await canvas.findByText(/^Time blocked: Maral · 15:00–16:00 · Training · every week until /)).toBeInTheDocument()
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    const maral = within(within(canvas.getByRole('region', { name: /^Calendar, / })).getByRole('group', { name: 'Maral' }))
    await expect(await maral.findByText('Closed · Training')).toBeVisible()
    // the slot it took is no longer offered; the one after it is
    await expect(maral.queryByRole('button', { name: 'Maral, 15:00 — new booking or block time' })).toBeNull()
    await expect(maral.getByRole('button', { name: 'Maral, 16:00 — new booking or block time' })).toBeVisible()
  },
}

/** Over a booking the api refuses: the booking in the way named under the times, «Open the booking» opens its drawer. */
export const BlockOverBooking: Story = {
  play: async ({ canvas }) => {
    const d = await openBlockTime(canvas, 'Maral', '15:00')
    await pick(d.getByRole('combobox', { name: 'From' }), '10:00')
    await userEvent.click(d.getByRole('radio', { name: 'Personal' }))
    await userEvent.click(d.getByRole('button', { name: 'Block time' }))
    const alert = await d.findByRole('alert')
    await expect(alert).toHaveTextContent(
      'This time has a booking: 10:00–11:00 Jemal B. · Pedicure. Pick another time or move the booking first.',
    )
    await expect(d.getByRole('button', { name: 'Block time' })).toBeDisabled()
    await userEvent.click(within(alert).getByRole('button', { name: 'Open the booking' }))
    await expect(await page.findByRole('dialog', { name: 'Booking' })).toBeVisible()
    await expect(page.queryByRole('dialog', { name: 'Block time' })).toBeNull()
  },
}

/** A click under «Busy elsewhere» (book B-14 step 4): refused with when she's busy; a specialist is told «You’re». */
export const ElsewhereRefused: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
    const ayna = within(within(canvas.getByRole('region', { name: /^Calendar, / })).getByRole('group', { name: 'Aýna' }))
    await userEvent.click(await ayna.findByRole('button', { name: 'Aýna, 19:00 — busy elsewhere' }))
    await expect(await canvas.findByText('Aýna is busy elsewhere 19:00–20:00. Pick another time.')).toBeInTheDocument()
    await expect(page.queryByRole('menu')).toBeNull()
  },
}

/** A specialist blocks only their own time: the person read-only, with the hint. */
export const BlockOwnTime: Story = {
  args: { server: fakeApi('specialist') },
  play: async ({ canvas }) => {
    const d = await openBlockTime(canvas, 'Maral', '15:00')
    await expect(d.queryByRole('combobox', { name: 'Person' })).toBeNull()
    await expect(d.getByRole('textbox', { name: 'Person' })).toHaveValue('Maral')
    await expect(d.getByText('You can block only your own time.')).toBeVisible()
  },
}

/** On a phone (B-Mobile 2b–2c): the slot's sheet, then Block time as a sheet; Esc closes it and the slot keeps the focus. */
export const BlockTimeSheet: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
    const ayna = within(within(canvas.getByRole('region', { name: /^Calendar, / })).getByRole('group', { name: 'Aýna' }))
    const slot = await ayna.findByRole('button', { name: 'Aýna, 15:00 — new booking or block time' })
    await userEvent.click(slot)
    const sheet = within(await page.findByRole('dialog', { name: '15:00 · Aýna' }))
    await expect(sheet.getByRole('menuitem', { name: 'Block time' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(slot).toHaveFocus())
    await userEvent.click(slot)
    await userEvent.click(within(await page.findByRole('dialog', { name: '15:00 · Aýna' })).getByRole('menuitem', { name: 'Block time' }))
    const d = within(await page.findByRole('dialog', { name: 'Block time' }))
    await expect(d.getByRole('radio', { name: 'Doesn’t repeat' })).toBeVisible()
    await expect(d.getByRole('button', { name: 'Block time' })).toBeDisabled()
  },
}

/** Move mode on Jemal B.'s booking tomorrow: from her drawer, the bar over the grid, the block faded (book B-26). */
const startMove = async (canvas: Canvas) => {
  await canvas.findByRole('region', { name: /^Calendar, / })
  await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
  await userEvent.click(await canvas.findByRole('button', { name: /^10:00 Jemal B\./ }))
  await userEvent.click(
    await within(await page.findByRole('dialog', { name: 'Booking' })).findByRole('button', { name: 'Move to another time' }),
  )
  await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
  await expect(await canvas.findByRole('status')).toHaveTextContent('Jemal B. · Pedicure · 60 min — pick a new time')
  return within(canvas.getByRole('region', { name: /^Calendar, / }))
}

/** Move it (book B-26): the slot says «move here», the ghost and the popover ask, the block goes to the new time and the toast says so. */
export const MoveBooking: Story = {
  play: async ({ canvas }) => {
    const grid = await startMove(canvas)
    const maral = within(grid.getByRole('group', { name: 'Maral' }))
    // its own time is free for it: a quarter later is a target, the faded block lets the click through
    await expect(maral.getByRole('button', { name: 'Maral, 10:15 — move here' })).toBeVisible()
    await userEvent.click(maral.getByRole('button', { name: 'Maral, 14:30 — move here' }))
    const d = within(await page.findByRole('dialog', { name: '10:00 → 14:30 · Maral' }))
    await waitFor(() => expect(d.getByText('Jemal B. · Pedicure')).toBeVisible())
    await expect(d.getByRole('checkbox', { name: 'Notify the client' })).toBeChecked()
    await expect(within(canvas.getByRole('region', { name: /^Calendar, / })).getByTestId('move-ghost')).toHaveTextContent(
      '14:30–15:30Jemal B.',
    )
    await userEvent.click(d.getByRole('button', { name: 'Confirm' }))
    await page.findByText('Booking moved: 10:00 → 14:30 · the client is notified')
    await waitFor(() => expect(canvas.queryByRole('status')).toBeNull())
    await expect(await maral.findByRole('button', { name: /^14:30 Jemal B\./ })).toBeVisible()
    await expect(maral.getByRole('button', { name: 'Maral, 11:00 — new booking or block time' })).toBeVisible()
  },
}

/** Another column hands it to that specialist; the box off, the client isn't told and the toast doesn't say so. */
export const MoveToAnotherSpecialist: Story = {
  play: async ({ canvas }) => {
    const grid = await startMove(canvas)
    await userEvent.click(within(grid.getByRole('group', { name: 'Aýna' })).getByRole('button', { name: 'Aýna, 16:00 — move here' }))
    const d = within(await page.findByRole('dialog', { name: '10:00 → 16:00 · Aýna' }))
    await userEvent.click(d.getByRole('checkbox', { name: 'Notify the client' }))
    await userEvent.click(d.getByRole('button', { name: 'Confirm' }))
    await page.findByText('Booking moved: 10:00 → 16:00')
    await expect(await within(grid.getByRole('group', { name: 'Aýna' })).findByRole('button', { name: /^16:00 Jemal B\./ })).toBeVisible()
  },
}

/** Another day is one of the toolbar's buttons away, and then the popover and the toast name both days. */
export const MoveToAnotherDay: Story = {
  args: { server: fakeApi('owner', { open: true }) },
  play: async ({ canvas }) => {
    await startMove(canvas)
    // ahead, past the holiday: back is today, whose 19:00 has gone by in the evening
    await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
    await expect(canvas.getByRole('status')).toHaveTextContent('Jemal B.')
    const grid = within(await canvas.findByRole('region', { name: /^Calendar, / }))
    await userEvent.click(
      await within(grid.getByRole('group', { name: 'Maral' })).findByRole('button', { name: 'Maral, 19:00 — move here' }),
    )
    await page.findByRole('dialog', { name: /^.+ · 10:00 → .+ · 19:00 · Maral$/ })
  },
}

/** Refused (book B-26): the reason in a toast, the ghost gone, the grid still in move mode for another slot. */
export const MoveNotHisService: Story = {
  args: { server: fakeApi('owner', { refuseMove: { problem: 'staff_cannot_do', staffId: id(3) } }) },
  play: async ({ canvas }) => {
    const grid = await startMove(canvas)
    await userEvent.click(within(grid.getByRole('group', { name: 'Jeren' })).getByRole('button', { name: 'Jeren, 12:00 — move here' }))
    await userEvent.click(
      within(await page.findByRole('dialog', { name: '10:00 → 12:00 · Jeren' })).getByRole('button', { name: 'Confirm' }),
    )
    await page.findByText('Jeren doesn’t do this service — pick a specialist who does')
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await expect(canvas.getByRole('status')).toBeVisible()
    await expect(grid.queryByTestId('move-ghost')).toBeNull()
  },
}

export const MoveDoesntFitHere: Story = {
  args: { server: fakeApi('owner', { refuseMove: { problem: 'buffer', staffId: id(2) } }) },
  play: async ({ canvas }) => {
    const grid = await startMove(canvas)
    await userEvent.click(within(grid.getByRole('group', { name: 'Maral' })).getByRole('button', { name: 'Maral, 14:30 — move here' }))
    await userEvent.click(
      within(await page.findByRole('dialog', { name: '10:00 → 14:30 · Maral' })).getByRole('button', { name: 'Confirm' }),
    )
    await page.findByText('Doesn’t fit here — it needs 60 min plus the buffer')
  },
}

export const MoveBusyElsewhere: Story = {
  args: { server: fakeApi('owner', { refuseMove: { problem: 'elsewhere', staffId: id(2), busy: { start: 900, end: 960 } } }) },
  play: async ({ canvas }) => {
    const grid = await startMove(canvas)
    await userEvent.click(within(grid.getByRole('group', { name: 'Maral' })).getByRole('button', { name: 'Maral, 14:30 — move here' }))
    await userEvent.click(
      within(await page.findByRole('dialog', { name: '10:00 → 14:30 · Maral' })).getByRole('button', { name: 'Confirm' }),
    )
    await page.findByText('Maral is busy elsewhere 15:00–16:00. Pick another time.')
  },
}

/** Back, Esc and a click on another slot, one step each: the popover goes first, then move mode. */
export const MoveBackAndEsc: Story = {
  play: async ({ canvas }) => {
    const grid = await startMove(canvas)
    const maral = within(grid.getByRole('group', { name: 'Maral' }))
    await userEvent.click(maral.getByRole('button', { name: 'Maral, 14:30 — move here' }))
    await userEvent.click(within(await page.findByRole('dialog', { name: '10:00 → 14:30 · Maral' })).getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await expect(canvas.getByRole('status')).toBeVisible()
    // a click on another slot, the popover open, picks that one
    await userEvent.click(maral.getByRole('button', { name: 'Maral, 14:30 — move here' }))
    await page.findByRole('dialog', { name: '10:00 → 14:30 · Maral' })
    await userEvent.click(maral.getByRole('button', { name: 'Maral, 16:00 — move here' }))
    await page.findByRole('dialog', { name: '10:00 → 16:00 · Maral' })
    await expect(grid.getByTestId('move-ghost')).toHaveTextContent('16:00–17:00Jemal B.')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await expect(canvas.getByRole('status')).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(canvas.queryByRole('status')).toBeNull())
    await expect(maral.getByRole('button', { name: /^Maral, 14:30 — new booking or block time/ })).toBeVisible()
  },
}

/** Another booking clicked leaves move mode and opens it, as in the board. */
export const MoveLeftForABooking: Story = {
  args: { server: fakeApi('owner') },
  play: async ({ canvas }) => {
    await startMove(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'Today' }))
    await userEvent.click(await canvas.findByRole('button', { name: /Gözel A\./ }))
    await expect(await page.findByRole('dialog', { name: 'Booking' })).toBeVisible()
    await expect(canvas.queryByRole('status')).toBeNull()
  },
}

/** On a phone the confirm is a sheet, and the chips change the person. */
export const MoveSheet: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
    await userEvent.click(within(canvas.getByRole('radiogroup', { name: 'Specialist' })).getByRole('radio', { name: 'Maral' }))
    await userEvent.click(await canvas.findByRole('button', { name: /^10:00 Jemal B\./ }))
    await userEvent.click(
      await within(await page.findByRole('dialog', { name: 'Booking' })).findByRole('button', { name: 'Move to another time' }),
    )
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await expect(await canvas.findByRole('status')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Maral, 15:15 — move here' }))
    const sheet = within(await page.findByRole('dialog', { name: '10:00 → 15:15 · Maral' }))
    await userEvent.click(sheet.getByRole('button', { name: 'Confirm' }))
    await page.findByText('Booking moved: 10:00 → 15:15 · the client is notified')
  },
}

/** The words about a third longer (Russian): the bar wraps at 390 and keeps its way out on the same line. */
export const MoveRussianLength: Story = {
  globals: { viewport: { value: 'xs' }, text: 'longer' },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: /^Next day/ }))
    await userEvent.click(within(canvas.getByRole('radiogroup', { name: /^Specialist/ })).getByRole('radio', { name: /Maral/ }))
    await userEvent.click(await canvas.findByRole('button', { name: /Jemal B\./ }))
    await userEvent.click(await within(await page.findByRole('dialog')).findByRole('button', { name: /Move to another time/ }))
    const bar = await canvas.findByRole('status')
    await expect(within(bar).getByRole('button', { name: /Back/ })).toBeVisible()
    await expect(bar.scrollWidth).toBeLessThanOrEqual(bar.clientWidth)
  },
}

/** The new booking from the toolbar (book B-23). */
const openNew = async (canvas: Canvas) => {
  await canvas.findByRole('region', { name: /^Calendar, / })
  await userEvent.click(canvas.getByRole('button', { name: 'New booking' }))
  return within(await page.findByRole('dialog', { name: 'New booking' }))
}

/** A known client by number (their alert note), a service, the specialist, a nearest time, saved; the toast's Undo takes it back. */
export const NewBooking: Story = {
  play: async ({ canvas }) => {
    const d = await openNew(canvas)
    await expect(d.getByRole('button', { name: 'Save booking' })).toBeDisabled()
    await expect(d.getByText('Still needed: client, service, time')).toBeVisible()
    const client = d.getByRole('combobox', { name: 'Client' })
    await userEvent.click(client)
    await expect(await d.findByText('Frequent clients')).toBeVisible()
    await userEvent.type(client, '651')
    await userEvent.click(await d.findByRole('option', { name: /Gözel Annaýewa/ }))
    await expect(await d.findByText('Allergic to ammonia')).toBeVisible()
    await expect(d.getByText('Last visit 2 Oct · 12 visits')).toBeVisible()
    await userEvent.click(d.getByRole('checkbox', { name: /Women’s haircut/ }))
    await expect(d.getByText('Still needed: specialist, time')).toBeVisible()
    await userEvent.click(await d.findByRole('button', { name: /^Tomorrow 10:00\s*· Aýna/ }))
    await expect(await d.findByRole('button', { name: /^Tomorrow 10:00/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(d.getByRole('button', { name: 'Save booking' }))
    await page.findByText('Booking saved · the client is notified')
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await userEvent.click(page.getByRole('button', { name: 'Undo' }))
    await page.findByText('Booking taken back')
  },
}

/** Digits nobody has: «+ New client» takes them into the inline form; a number already saved offers that client. */
export const NewBookingNewClient: Story = {
  play: async ({ canvas }) => {
    const d = await openNew(canvas)
    await userEvent.type(d.getByRole('combobox', { name: 'Client' }), '6199')
    await expect(await d.findByText('No client “6199”')).toBeVisible()
    await userEvent.click(d.getByRole('option', { name: 'New client “6199”' }))
    const phone = await d.findByRole('textbox', { name: 'Phone number' })
    await expect(phone).toHaveValue('61 99')
    await userEvent.click(phone)
    await userEvent.tab()
    await expect(await d.findByRole('alert')).toHaveTextContent('The number is incomplete — it needs 8 digits.')
    await userEvent.type(phone, '4567')
    await expect(d.getByText('Still needed: service, time')).toBeVisible()
    await userEvent.clear(phone)
    await userEvent.type(phone, '65123456')
    await expect(await d.findByText('This number is saved for Gözel Annaýewa.')).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Choose Gözel Annaýewa' }))
    await expect(await d.findByText('Allergic to ammonia')).toBeVisible()
  },
}

/** Letters search names: no match offers a new client with the name typed; Change brings the search back with the name. */
export const NewBookingByName: Story = {
  play: async ({ canvas }) => {
    const d = await openNew(canvas)
    const search = d.getByRole('combobox', { name: 'Client' })
    await userEvent.type(search, 'Zzz')
    await expect(await d.findByText('No client “Zzz”')).toBeVisible()
    await userEvent.keyboard('{Enter}')
    await expect(await d.findByRole('textbox', { name: /^Name/ })).toHaveValue('Zzz')
    await userEvent.click(d.getByRole('button', { name: 'Cancel' }))
    await userEvent.type(await d.findByRole('combobox', { name: 'Client' }), 'Göz')
    await userEvent.click(await d.findByRole('option', { name: /Gözel Annaýewa/ }))
    await expect(await d.findByText('Allergic to ammonia')).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Change' }))
    await expect(await d.findByRole('combobox', { name: 'Client' })).toHaveValue('Gözel Annaýewa')
  },
}

/** From a free slot: the person given, only their services unless asked; two services nobody does together say so. */
export const NewBookingFromSlot: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Next day' }))
    const maral = within(within(canvas.getByRole('region', { name: /^Calendar, / })).getByRole('group', { name: 'Maral' }))
    await userEvent.click(await maral.findByRole('button', { name: 'Maral, 13:00 — new booking or block time' }))
    await userEvent.click(await page.findByRole('menuitem', { name: 'New booking' }))
    const d = within(await page.findByRole('dialog', { name: 'New booking' }))
    await expect(await d.findByRole('checkbox', { name: /Manicure/ })).toBeVisible()
    await expect(d.queryByRole('checkbox', { name: /Hair colouring/ })).toBeNull()
    await expect(d.getByRole('radio', { name: 'Maral' })).toBeChecked()
    await expect(d.getByRole('radio', { name: 'Maral’s services' })).toBeChecked()
    await userEvent.click(d.getByRole('radio', { name: 'All services' }))
    await userEvent.click(await d.findByRole('checkbox', { name: /Hair colouring.*Maral doesn’t do this/ }))
    await userEvent.click(d.getByRole('checkbox', { name: /Manicure/ }))
    await expect(await d.findByText(/No one specialist does all the chosen services — make/)).toBeVisible()
    await expect(d.getByRole('radio', { name: 'Maral' })).toBeDisabled()
  },
}

/** A walk-in: today from the first free start, the client not told, the toast says walk-in. */
export const NewBookingWalkIn: Story = {
  play: async ({ canvas }) => {
    const d = await openNew(canvas)
    await userEvent.click(d.getByRole('radio', { name: 'Walk-in' }))
    await expect(d.getByText(/The client is here — the booking can start at the current time/)).toBeVisible()
    await expect(d.getByRole('switch', { name: /Notify the client/ })).not.toBeChecked()
    await userEvent.type(d.getByRole('combobox', { name: 'Client' }), '65123456')
    await userEvent.click(await d.findByRole('option', { name: /Gözel Annaýewa/ }))
    await expect(await d.findByText('Allergic to ammonia')).toBeVisible()
    await userEvent.click(d.getByRole('checkbox', { name: /Women’s haircut/ }))
    await userEvent.click(d.getByRole('radio', { name: 'Aýna' }))
    await expect(await d.findByRole('button', { name: '10:00' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(d.getByRole('button', { name: 'Save booking' }))
    await page.findByText('Booking saved · walk-in')
  },
}

/** A specialist books for themself: their own card, their services, no prices. */
export const NewBookingSpecialist: Story = {
  args: { server: fakeApi('specialist') },
  play: async ({ canvas }) => {
    const d = await openNew(canvas)
    await expect(d.getByText('The booking is added to you')).toBeVisible()
    await expect(await d.findByRole('checkbox', { name: /Manicure/ })).toBeVisible()
    await expect(d.queryByRole('checkbox', { name: /Hair colouring/ })).toBeNull()
    await expect(d.queryByText(/TMT/)).toBeNull()
  },
}

/** «Book again» opens it from the address: the client's number found, their services ticked. */
export const NewBookingAgain: Story = {
  args: { path: `/w/glow-studio/calendar?panel=new&client=${id(9)}&services=${id(5)}` },
  play: async () => {
    const d = within(await page.findByRole('dialog', { name: 'New booking' }))
    await expect(await d.findByText('Allergic to ammonia')).toBeVisible()
    await expect(await d.findByRole('checkbox', { name: /Women’s haircut/ })).toBeChecked()
  },
}

/** The words about a third longer (Russian) at 390: nothing leaves the sheet. */
export const NewBookingRussianLength: Story = {
  globals: { viewport: { value: 'xs' }, text: 'longer' },
  args: { path: `/w/glow-studio/calendar?panel=new&services=${id(5)}` },
  play: async () => {
    const dialog = await page.findByRole('dialog')
    await within(dialog).findByRole('button', { name: /Women/ })
    await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth)
  },
}

/** The phone's quick booking (book B-24, B-Mobile 5a–5c): the +, the keypad up, the usual service first, the grid, saved with Undo. */
export const QuickBooking: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'New booking' }))
    const d = within(await page.findByRole('dialog', { name: 'New booking' }))
    const client = d.getByRole('combobox', { name: 'Client' })
    await waitFor(() => expect(client).toHaveFocus())
    await userEvent.keyboard('65123456')
    await userEvent.click(await d.findByRole('option', { name: /Gözel Annaýewa/ }))
    await expect(await d.findByText('Allergic to ammonia')).toBeVisible()
    const chips = within(d.getByRole('group', { name: 'Service' }))
    await expect(chips.getAllByRole('button')[0]).toHaveTextContent('Manicure')
    await userEvent.click(chips.getByRole('button', { name: 'Women’s haircut' }))
    await userEvent.click(d.getByRole('radio', { name: 'Any specialist' }))
    await userEvent.click(await d.findByRole('button', { name: /^10:00\s*Tomorrow · Aýna/ }))
    await userEvent.click(d.getByRole('button', { name: 'Add an internal note' }))
    await userEvent.type(await d.findByRole('textbox', { name: 'Internal note' }), 'Prefers mornings')
    await userEvent.click(d.getByRole('button', { name: 'Save booking' }))
    await page.findByText('Booking saved: Gözel Annaýewa · tomorrow · 10:00, Aýna')
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    // the toast waits above the tab bar, the + moved up out of its way
    await expect(page.getAllByRole('button', { name: 'Undo' }).at(-1)).toBeDefined()
  },
}

/** «Another service» opens the whole menu, and «Another date and time» the days and their starts. */
export const QuickBookingMore: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { path: `/w/glow-studio/calendar?panel=new&staff=${id(1)}` },
  play: async () => {
    const d = within(await page.findByRole('dialog', { name: 'New booking' }))
    await userEvent.click(await d.findByRole('button', { name: 'Women’s haircut' }))
    await expect(d.queryByRole('group', { name: 'Morning' })).toBeNull()
    await userEvent.click(await d.findByRole('button', { name: 'Another date and time' }))
    await expect(await d.findByRole('group', { name: 'Morning' })).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Another service' }))
    await expect(await d.findByRole('checkbox', { name: /Women’s haircut/ })).toBeChecked()
  },
}

/** One specialist (book B-17 step 1): one wide column with the phone and the length and price, a select for the person. */
export const OneSpecialist: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    const picker = canvas.getByRole('combobox', { name: 'Whose calendar' })
    await expect(picker).toHaveTextContent('Everyone4')
    await userEvent.click(picker)
    const list = await screen.findByRole('listbox')
    await expect(within(list).getByRole('option', { name: /^Everyone/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(within(list).getByRole('option', { name: /^Aýna/ }))
    const grid = within(canvas.getByRole('region', { name: /^Calendar, / }))
    await expect(await grid.findByRole('group', { name: 'Aýna' })).toBeVisible()
    await expect(grid.queryByRole('group', { name: 'Maral' })).toBeNull()
    await expect(grid.getByRole('button', { name: /Gözel A\. · \+99365000000/ })).toBeVisible()
    await userEvent.click(within(list).getByRole('option', { name: /^Maral/ }))
    await expect(await grid.findByRole('group', { name: 'Maral' })).toBeVisible()
    await waitFor(() => expect(picker).toHaveTextContent('2 people'))
    // Everyone brings the whole team back
    await userEvent.click(within(list).getByRole('option', { name: /^Everyone/ }))
    await expect(await grid.findByRole('group', { name: 'Jeren' })).toBeVisible()
    await waitFor(() => expect(picker).toHaveTextContent('Everyone4'))
  },
}

/** The team's week (B7-Calendar · B3): a row per person, a timeline bar, the count and the first–last time a day; hover shows the day, a click opens it. */
export const WeekLoad: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('radio', { name: 'Week' }))
    const table = await canvas.findByRole('table', { name: 'The week’s load' })
    await expect(canvas.getByRole('button', { name: 'Previous week' })).toBeVisible()
    await expect(within(table).getByText('4 people')).toBeVisible()
    const cell = within(table).getByRole('button', { name: /^Aýna, .*2 bookings.*1 request 10:00–13:00/ })
    await userEvent.hover(cell)
    const card = within(await page.findByRole('dialog', { name: /^Aýna · / }))
    await waitFor(() => expect(card.getByText('Gözel A.')).toBeVisible())
    await expect(card.getByText('10:00–10:45')).toBeVisible()
    await userEvent.click(cell)
    const grid = within(await canvas.findByRole('region', { name: /^Calendar, / }))
    await expect(await grid.findByRole('group', { name: 'Aýna' })).toBeVisible()
    await expect(grid.queryByRole('group', { name: 'Maral' })).toBeNull()
    await expect(canvas.getByRole('radio', { name: 'Day' })).toHaveAttribute('aria-checked', 'true')
  },
}

/** One person's week (B7-Calendar · B3): picked in the toolbar, every block says when, who and what; a day's head opens that day. */
export const WeekOfOne: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('radio', { name: 'Week' }))
    await canvas.findByRole('table', { name: 'The week’s load' })
    await userEvent.click(canvas.getByRole('combobox', { name: 'Whose calendar' }))
    await userEvent.click(await screen.findByRole('option', { name: /^Aýna/ }))
    const head = await canvas.findByRole('button', { name: /2 bookings.*1 request.*Aýna, / })
    await expect((await canvas.findAllByTestId('week-block')).length).toBe(2)
    await expect(canvas.getByRole('button', { name: /^10:00–10:45 Gözel A\. Women’s haircut.*Confirmed$/ })).toBeVisible()
    await userEvent.click(head)
    await expect(await canvas.findByRole('group', { name: 'Aýna' })).toBeVisible()
    await expect(canvas.queryByRole('group', { name: 'Maral' })).toBeNull()
  },
}

/** A busy week: a 15-minute block («15:00 Jahan B.»), two bookings at one time side by side, the holiday's column; hover shows the card, a click opens the drawer. */
export const WeekBusy: Story = {
  args: { server: fakeApi('owner', { busy: true }), path: `/w/glow-studio/calendar?view=weekOne&staff=${id(1)}` },
  play: async ({ canvas }) => {
    const short = await canvas.findByRole('button', { name: /^15:00 Jahan B\..*15:00–15:15, Brow shaping, Confirmed$/ })
    await expect(short).toBeVisible()
    const left = canvas.getByRole('button', { name: /^16:00–17:00 Aýlar Hommadowa Peeling/ })
    const right = canvas.getByRole('button', { name: /^16:30–17:30 Sona Pirmuhammedowa Lash lift.*Completed, by phone$/ })
    await expect(left.getBoundingClientRect().right).toBeLessThanOrEqual(right.getBoundingClientRect().left + 1)
    // the holiday's column, when it falls in this week
    if (mondayOf(HOLIDAY) === mondayOf(DAY)) await expect(canvas.getByText('Closed · Independence Day')).toBeVisible()
    await userEvent.hover(short)
    const card = within(await page.findByRole('dialog', { name: 'Jahan Berdiýewa · 15:00–15:15' }))
    await waitFor(() => expect(card.getByText('Brow shaping')).toBeVisible())
    await expect(card.getByText('Jahan Berdiýewa')).toBeVisible()
    await userEvent.click(short)
    await expect(await page.findByRole('dialog', { name: 'Booking' })).toBeVisible()
    await waitFor(() => expect(short).toHaveAttribute('aria-pressed', 'true'))
  },
}

/** One person's week at 1024: 68 px an hour, the blocks keep their three lines. */
export const WeekLaptop: Story = {
  args: { server: fakeApi('owner', { busy: true }), path: `/w/glow-studio/calendar?view=weekOne&staff=${id(1)}` },
  globals: { viewport: { value: 'md' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /^16:00–17:00 Aýlar Hommadowa Peeling/ })).toBeVisible()
  },
}

/** A specialist has their own week, and no people picker. */
export const SpecialistWeek: Story = {
  args: { server: fakeApi('specialist') },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await expect(canvas.queryByRole('combobox', { name: 'Whose calendar' })).toBeNull()
    await userEvent.click(canvas.getByRole('radio', { name: 'Week' }))
    await expect(await canvas.findAllByRole('button', { name: /Maral, .*open the day$/ })).toHaveLength(7)
  },
}

/** The week's matrix from the address, stopping on it: the page's axe check reads it as it stands. */
export const WeekLoadAddress: Story = {
  args: { path: '/w/glow-studio/calendar?view=weekAll' },
  play: async ({ canvas }) => {
    await canvas.findByRole('table', { name: 'The week’s load' })
  },
}

/** One person's week from the address, stopping on it. */
export const WeekOfOneAddress: Story = {
  args: { path: '/w/glow-studio/calendar?view=weekOne' },
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByTestId('week-block')).length).toBe(2)
  },
}

/** The legend (F-134) opens from the Filters menu's «What the colours mean» (B7-Calendar · B2). */
export const LegendFromFilters: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    await userEvent.click(await page.findByRole('button', { name: 'What the colours mean' }))
    const d = within(await page.findByRole('dialog', { name: 'Colours and symbols' }))
    await waitFor(() => expect(d.getByText('New request — waiting for an answer')).toBeVisible())
    await expect(d.getByText('Phone — booked during a call')).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Got it' }))
    await waitFor(() => expect(page.queryByRole('dialog', { name: 'Colours and symbols' })).toBeNull())
  },
}
