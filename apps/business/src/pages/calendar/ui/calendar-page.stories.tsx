/**
 * Calendar · day — B-Calendar (v0.6 round 2, English), in the app's shell over a `fetch` that answers like the api:
 * Glow Studio's day, everyone's column with their count, the bookings by status, a request with its timer, the day's
 * line, the now line; Show cancelled, the next day, a specialist's own column, the timer of a request that came in
 * while the business was closed.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { CalendarView } from '@yeral/contract/calendar'
import type { Workspace } from '@yeral/contract/team'
import { addDays, localOf, today } from '@yeral/domain/time'
import { expect, userEvent, waitFor, within } from 'storybook/test'
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
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const staff = [
  { staffId: id(1), name: 'Aýna', hasApp: true },
  { staffId: id(2), name: 'Maral', hasApp: true },
  { staffId: id(3), name: 'Jeren', hasApp: true },
  { staffId: id(4), name: 'Leýli', hasApp: false },
]
const column = (s: (typeof staff)[number], date: string) => ({
  ...s,
  photo: null,
  level: 'specialist' as const,
  removed: false,
  days: [{ date, working: { open: 540, close: 1200 }, breaks: [], off: null }],
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
  items: [{ serviceId: null, service, staffId: id(who), staff: staff[who - 1]!.name, start, end, bufferAfter: 10 }],
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

/** Glow Studio's day (demo-data v06r2): every status, a phone booking with an alert note, a request waiting 18 min. */
const dayBookings = [
  booking(1, DAY, 600, 645, 'confirmed', 'Gözel A.', 'Women’s haircut'),
  booking(1, DAY, 660, 780, 'pending', 'Mähri G.', 'Hair colouring'),
  booking(2, DAY, 540, 600, 'completed', 'Bahar N.', 'Manicure'),
  booking(2, DAY, 630, 720, 'confirmed', 'Ogulgerek M.', 'Gel manicure', { source: 'phone', alert: true }),
  booking(3, DAY, 720, 750, 'noshow', 'Aýgül T.', 'Brows and lashes'),
  booking(4, DAY, 840, 900, 'confirmed', 'Leýla S.', 'Back massage'),
]
const cancelledOne = booking(1, DAY, 615, 660, 'cancelled', 'Şemşat K.', 'Hair styling')
const tomorrowBookings = [booking(2, TOMORROW, 600, 660, 'confirmed', 'Jemal B.', 'Pedicure')]

const viewOf = (date: string, cancelled: boolean, only?: string): CalendarView => {
  const all = [...(date === DAY ? dayBookings : tomorrowBookings), ...(cancelled && date === DAY ? [cancelledOne] : [])]
  const columns = staff.filter((s) => !only || s.staffId === only).map((s) => column(s, date))
  const bookings = all.filter((b) => !only || b.items.some((i) => i.staffId === only))
  const live = bookings.filter((b) => b.status !== 'cancelled')
  return {
    from: date,
    to: date,
    columns,
    bookings,
    moves: [],
    blocks: [],
    elsewhere: [],
    summary: [
      {
        date,
        count: live.filter((b) => b.status !== 'pending').length,
        requests: live.filter((b) => b.status === 'pending').length,
        revenue: only ? 570 : 1410,
      },
    ],
    internalStatuses: [],
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and the calendar ask it; `open` false: the business is closed every day (a late request). */
const fakeApi =
  (level: Workspace['level'], open = true): (() => typeof fetch) =>
  () =>
  // eslint-disable-next-line @typescript-eslint/require-await -- the fetch it stands in for answers a promise
  async (input: RequestInfo | URL, init?: RequestInit) => {
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
    return json({ error: { code: 'not_found' } }, 404)
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
    const grid = within(await canvas.findByRole('region', { name: /^Calendar, / }))
    const ayna = within(grid.getByRole('group', { name: 'Aýna' }))
    await expect(ayna.getByRole('button', { name: /^10:00 Gözel A\. Women’s haircut.*10:00–10:45, Confirmed$/ })).toBeVisible()
    // the request: its timer in the block, its time left in its name
    const request = ayna.getByRole('button', { name: /Mähri G\. Hair colouring.*Pending, \d+ min left to answer$/ })
    await expect(within(request).getByText(/^\d+ min$/)).toBeVisible()
    const maral = within(grid.getByRole('group', { name: 'Maral' }))
    await expect(maral.getByRole('button', { name: /Ogulgerek M\..*by phone, alert note about the client$/ })).toBeVisible()
    await expect(grid.getByText('Doesn’t use the app')).toBeVisible()
    await expect(canvas.getByText(/^Revenue \(planned\)/)).toBeVisible()
    await expect(canvas.getByText('1 request', { selector: 'span:not(.sr-only)' })).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Calendar · Glow Studio · Ýeral Business'))
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
    await expect(canvas.getByText('No new requests')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Today' }))
    await expect(await canvas.findByRole('button', { name: /Gözel A\./ })).toBeVisible()
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

/** The phone. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
