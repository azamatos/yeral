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
import { expect, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { CalendarPage } from './calendar-page'

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
      date === DAY ? [{ id: id(9), staffId: id(3), date, start: 990, end: 1050, reason: 'Training', seriesId: null }].filter(mine) : [],
    elsewhere: date === DAY ? [{ staffId: id(1), date, start: 1140, end: 1200 }].filter(mine) : [],
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

/** The waiting requests, most urgent first: Mähri G.'s (18 min) and Ogulgerek M.'s move (25 min). */
const requestsOf = (canAnswer: boolean): BookingRequest[] => {
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
      fits: true,
      client: { id: null, name: 'Ogulgerek M.', phone: '+99365000000', visits: 0, noShows: 0, alerts: [] },
      canAnswer,
      answeredBy: 'desk',
    },
  ]
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and the calendar ask it; `open` false: the business is closed every day (a late request). */
const fakeApi =
  (level: Workspace['level'], open = true, arrives = false): (() => typeof fetch) =>
  () => {
    // the requests confirmed in this story
    const answered = new Set<string>()
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      const route = `${request.method} ${url.pathname.replace(/^\/v1/, '')}`
      const w = glow(level)
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [w], current: w.slug })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
      if (route === 'GET /w/glow-studio/calendar')
        return json(
          viewOf(url.searchParams.get('date')!, url.searchParams.get('cancelled') === 'true', level === 'specialist' ? id(2) : undefined),
        )
      if (route === 'GET /w/glow-studio/settings/hours')
        return json({
          hours: Array.from({ length: 7 }, () => (open ? { open: 0, close: 1440, break: null } : null)),
          specialDays: [],
        })
      if (route === 'GET /w/glow-studio/requests') {
        const items = requestsOf(level !== 'specialist')
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
          date: DAY,
          slots: [],
          days: [],
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
    const region = await canvas.findByRole('region', { name: /^Calendar, / })
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
    // Aýna's request and Maral's client asking to move: in their columns and the toolbar
    await expect(canvas.getAllByText('1 request', { selector: 'span:not(.sr-only)' })).toHaveLength(2)
    await expect(canvas.getByRole('button', { name: '2 requests — open the most urgent' })).toBeVisible()
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

/** Show cancelled: the cancelled booking struck through, beside the live one at its time. */
export const ShowCancelled: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Show cancelled' }))
    const block = await canvas.findByRole('button', { name: /Şemşat K\..*Cancelled$/ })
    await expect(block).toHaveClass('left-[52%]')
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
  args: { server: fakeApi('owner', false) },
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
    await userEvent.click(within(canvas.getByRole('group', { name: 'Specialist' })).getByRole('button', { name: 'Maral' }))
    await waitFor(() => expect(grid.getByRole('group', { name: 'Maral' })).toBeVisible())
    await expect(grid.queryByRole('group', { name: 'Aýna' })).toBeNull()
  },
}

/** The chip opens the most urgent request: its timer, the client, the details; Confirm, then «Next request». */
export const ConfirmRequest: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(await canvas.findByRole('button', { name: '2 requests — open the most urgent' }))
    const drawer = within(await page.findByRole('dialog', { name: 'Request' }))
    await expect(drawer.getByText('1 / 2')).toBeVisible()
    await expect(await drawer.findByText(/^\d+ min left to answer$/)).toBeVisible()
    await expect(
      drawer.getByText(/^If no one answers, the request is cancelled at \d\d:\d\d and the client is offered 3 other times\.$/),
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
    await expect(next.getByRole('button', { name: 'Show the previous time' })).toBeVisible()
  },
}

/** A request that comes in while the page is open: the shell's toast, on any page of the workspace. */
export const RequestArrives: Story = {
  args: { server: fakeApi('owner', true, true) },
  play: async ({ canvas }) => {
    await canvas.findByRole('region', { name: /^Calendar, / })
    await userEvent.click(await canvas.findByRole('button', { name: '2 requests — open the most urgent' }))
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
    await userEvent.click(await canvas.findByRole('button', { name: '2 requests — open the most urgent' }))
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
