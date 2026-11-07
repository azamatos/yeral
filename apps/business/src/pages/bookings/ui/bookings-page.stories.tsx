/**
 * Bookings — B-Bookings (v0.6 rounds 2–3, English), in the app's shell over a `fetch` that answers like the api: the
 * tabs, who cancelled, the search and the filters, nothing found, empty tabs, «Show more», a row opening the same drawer
 * as the calendar, the row menu going to the calendar, a specialist's own rows, a phone.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { BookingRow, CalendarBooking } from '@yeral/contract/calendar'
import type { BookingRequest } from '@yeral/contract/requests'
import type { Workspace } from '@yeral/contract/team'
import { addDays, today } from '@yeral/domain/time'
import { expect, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { BookingsPage } from './bookings-page'

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
  photo: null,
}
const glow = (level: Workspace['level']): Workspace => ({
  slug: 'glow-studio',
  name: 'Glow Studio',
  address: 'Bitarap Türkmenistan şaýoly 12',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  logo: null,
  level,
  staffId: '00000000-0000-4000-8000-000000000002',
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer: 0,
  requestsToAnswer: 0,
  lastOpenedAt: null,
})
const DAY = today(Date.now())
const LATER = addDays(DAY, 5)
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
let n = 0
const row = (
  date: string,
  start: number,
  status: BookingRow['status'],
  name: string,
  service: string,
  patch: Partial<BookingRow> = {},
): BookingRow => ({
  code: `YR-${48500 + n++}`,
  type: 'appointment',
  date,
  start,
  end: start + 60,
  status,
  cancelledBy: null,
  source: 'web',
  client: { id: '00000000-0000-4000-8000-000000000009', name, phone: '+99365000000', isNew: false },
  items: [{ serviceId: id(5), service, staffId: id(2), staff: 'Maral', start, end: start + 60 }],
  price: { type: 'fixed', amount: 120 },
  holdUntil: null,
  complaint: null,
  ...patch,
})
const rows = {
  today: [
    row(DAY, 600, 'confirmed', 'Gözel A.', 'Women’s haircut', { source: 'phone' }),
    row(DAY, 720, 'completed', 'Bahar N.', 'Manicure', { client: { id: null, name: 'Bahar N.', phone: null, isNew: true } }),
    row(DAY, 840, 'pending', 'Leýli G.', 'Gel manicure', {
      items: [{ serviceId: id(6), service: 'Gel manicure', staffId: id(3), staff: 'Jeren', start: 840, end: 900 }],
    }),
  ],
  upcoming: [row(LATER, 660, 'confirmed', 'Jemal B.', 'Pedicure')],
  past: [] as BookingRow[],
  cancelled: [
    row(DAY, 900, 'cancelled', 'Şemşat K.', 'Hair styling', { cancelledBy: 'client' }),
    row(LATER, 900, 'cancelled', 'Aýgül T.', 'Brows', { cancelledBy: 'system' }),
  ],
}
const asBooking = (r: BookingRow): CalendarBooking => ({
  ...r,
  client: { id: null, name: r.client.name, phone: r.client.phone },
  items: r.items.map((i) => ({ ...i, bufferAfter: 0 })),
  internalStatusId: null,
  alert: false,
  clientNote: null,
  internalNote: null,
  complaint: null,
  move: null,
})
/** Waiting: a new request, a client's move, and one the reader may not answer. */
const request = (code: string, name: string, patch: Partial<BookingRequest> = {}): BookingRequest => ({
  code,
  kind: 'new',
  type: 'appointment',
  date: LATER,
  start: 660,
  end: 720,
  holdUntil: Date.now() + 25 * 60_000,
  warnAt: null,
  sentAt: Date.now(),
  items: [{ serviceId: id(5), service: 'Women’s haircut', staffId: id(2), staff: 'Maral', start: 660, end: 720 }],
  price: null,
  note: null,
  from: null,
  fits: null,
  client: { id: null, name, phone: '+99365000000', visits: 2, noShows: 0, trusted: false, alerts: [] },
  canAnswer: true,
  answeredBy: 'desk',
  ...patch,
})
const waiting = [
  request('YR-49101', 'Mähri G.'),
  request('YR-49102', 'Ogulgerek M.', { kind: 'move', from: { date: DAY, start: 600, end: 660 }, fits: true }),
  request('YR-49103', 'Selbi H.', { canAnswer: false, answeredBy: 'specialist' }),
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and the list ask it. */
const answer = (request: Request, level: Workspace['level'], more: boolean, none: boolean): Response => {
  const url = new URL(request.url)
  const route = `${request.method} ${url.pathname.replace(/^\/v1/, '')}`
  const w = glow(level)
  if (route === 'GET /me') return json(me)
  if (route === 'GET /me/workspaces') return json({ items: [w], current: w.slug })
  if (route === 'GET /me/invites') return json({ items: [] })
  if (route === 'GET /w/glow-studio/requests') return json({ items: none ? [] : waiting.slice() })
  if (/^POST \/w\/glow-studio\/requests\/[^/]+\/(confirm|decline)$/.test(route)) return json({})
  if (route === 'GET /w/glow-studio/services')
    return json({
      groups: [
        { id: id(1), name: { en: 'Hair' }, services: [{ id: id(5), name: { en: 'Women’s haircut' }, staffIds: [id(2)] }] },
        {
          id: id(4),
          name: { en: 'Nails' },
          services: [
            { id: id(6), name: { en: 'Gel manicure' }, staffIds: [id(3)] },
            { id: id(7), name: { en: 'Pedicure' }, staffIds: [id(3)] },
          ],
        },
      ],
    })
  if (route === 'GET /w/glow-studio/settings/hours') return json({ hours: [], specialDays: [] })
  if (route === 'GET /w/glow-studio/settings/statuses') return json({ items: [], max: 5 })
  if (route === 'GET /w/glow-studio/calendar')
    return json({
      columns: [
        { staffId: id(2), name: 'Maral' },
        { staffId: id(3), name: 'Jeren' },
      ],
    })
  if (route === 'GET /w/glow-studio/bookings') {
    const tab = url.searchParams.get('tab') as keyof typeof rows
    const q = url.searchParams.get('q')?.toLowerCase()
    // several specialists, services and statuses come comma-separated; a list matches any of its values
    // as the api's `queryList` reads it: the key repeated (what the sdk sends) or comma-separated
    const listed = (key: string) => url.searchParams.getAll(key).flatMap((v) => v.split(','))
    const [staff, service, status] = [listed('staff'), listed('service'), listed('status')]
    const found = rows[tab].filter(
      (r) =>
        (!q || r.client.name?.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)) &&
        (!staff.length || r.items.some((i) => staff.includes(i.staffId ?? ''))) &&
        (!service.length || r.items.some((i) => service.includes(i.serviceId ?? ''))) &&
        (!status.length || status.includes(r.status)),
    )
    const items = url.searchParams.get('sort') === 'latest' ? [...found].reverse() : found
    const counts = { total: items.length, tabTotal: rows[tab].length }
    if (more && !url.searchParams.get('cursor')) return json({ items: items.slice(0, 1), ...counts, cursor: 'next' })
    return json({ items: more ? items.slice(1) : items, ...counts, cursor: null })
  }
  const one = /^GET \/w\/glow-studio\/bookings\/([^/]+)$/.exec(route)
  if (one) {
    const found = Object.values(rows)
      .flat()
      .find((r) => r.code === one[1])
    return found ? json(asBooking(found)) : json({ error: { code: 'not_found' } }, 404)
  }
  return json({ error: { code: 'not_found' } }, 404)
}

const fakeApi =
  (level: Workspace['level'], { more = false, none = false }: { more?: boolean; none?: boolean } = {}): (() => typeof fetch) =>
  () =>
  (input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(answer(new Request(input, init), level, more, none))

const meta = {
  title: 'Business/Bookings/List',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: {
    routes: {},
    layouts: { '/w/$slug': { component: WorkspaceShell, children: { bookings: BookingsPage, calendar: () => <p>The calendar</p> } } },
    path: '/w/glow-studio/bookings?tab=today',
    server: fakeApi('owner'),
  },
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

/** Today: the client, «New» on a first visit, the source, the status. */
export const Today: Story = {
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Bookings' })
    await expect(within(table).getByRole('button', { name: 'Gözel A.' })).toBeVisible()
    await expect(within(table).getByText('New')).toBeVisible()
    await expect(within(table).getByText('Phone')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Export CSV' })).toHaveAttribute('href', expect.stringContaining('tab=today'))
  },
}

/** Cancelled says who cancelled, a request that ran out too. */
export const Cancelled: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('table', { name: 'Bookings' })
    await userEvent.click(canvas.getByRole('tab', { name: 'Cancelled' }))
    await expect(await canvas.findByText('The client cancelled')).toBeVisible()
    await expect(canvas.getByText('No answer in time')).toBeVisible()
  },
}

/** An empty tab says so. */
export const EmptyTab: Story = {
  args: { path: '/w/glow-studio/bookings?tab=past' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No past bookings yet')).toBeVisible()
  },
}

/** The search finds a client; nothing found clears the filters from a button. */
export const Search: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('table', { name: 'Bookings' })
    const box = canvas.getByRole('textbox', { name: 'Client, phone or booking code' })
    await userEvent.type(box, 'bahar')
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Gözel A.' })).toBeNull())
    await expect(canvas.getByRole('button', { name: 'Bahar N.' })).toBeVisible()
    await userEvent.type(box, 'zzz')
    await expect(await canvas.findByText('Nothing found')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }))
    await expect(await canvas.findByRole('button', { name: 'Gözel A.' })).toBeVisible()
    await expect(box).toHaveValue('')
  },
}

/** The filter bar (DS-Lists A5): Service ticks one (grouped), the chip and «N of M» show on row 2, the address keeps it, Clear all clears. */
export const Filters: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('table', { name: 'Bookings' })
    await userEvent.click(canvas.getByRole('combobox', { name: 'Service' }))
    await userEvent.click(within(await page.findByRole('listbox')).getByRole('option', { name: /Women’s haircut/ }))
    await userEvent.keyboard('{Escape}')
    await expect(await canvas.findByRole('combobox', { name: 'Service · 1' })).toBeVisible()
    await expect(canvas.getByText('Service: Women’s haircut')).toBeVisible()
    await expect(await canvas.findByText('2 of 3 bookings')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Export CSV' })).toHaveAttribute('href', expect.stringContaining('service='))
    await userEvent.click(canvas.getByRole('combobox', { name: 'Date' }))
    await userEvent.click(within(await page.findByRole('listbox')).getByRole('option', { name: 'Tomorrow' }))
    await expect(await canvas.findByText('Date: Tomorrow')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(canvas.queryByText(/Service: |Date: /)).toBeNull())
    await expect(canvas.getByRole('combobox', { name: 'Service' })).toBeVisible()
  },
}

/** An old link's filters still open: the triggers read them. */
export const OldLink: Story = {
  args: { path: '/w/glow-studio/bookings?tab=today&when=week&staff=00000000-0000-4000-8000-000000000003' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('combobox', { name: 'Date · This week' })).toBeVisible()
    await expect(await canvas.findByRole('combobox', { name: 'Specialist · 1' })).toBeVisible()
    await expect(canvas.getByText('Specialist: Jeren')).toBeVisible()
  },
}

/** Several specialists and a status ticked, the order changed: the triggers count, «N of M», the address and the export keep them. */
export const SeveralFilters: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('table', { name: 'Bookings' })
    await userEvent.click(canvas.getByRole('combobox', { name: 'Specialist' }))
    const people = await page.findByRole('listbox')
    await userEvent.click(within(people).getByRole('option', { name: /Maral/ }))
    await userEvent.click(within(people).getByRole('option', { name: /Jeren/ }))
    await userEvent.keyboard('{Escape}')
    await expect(await canvas.findByRole('combobox', { name: 'Specialist · 2' })).toBeVisible()
    await userEvent.click(canvas.getByRole('combobox', { name: 'Status' }))
    const statuses = await page.findByRole('listbox')
    await userEvent.click(within(statuses).getByRole('option', { name: /Pending/ }))
    await userEvent.click(within(statuses).getByRole('option', { name: /Confirmed/ }))
    await userEvent.keyboard('{Escape}')
    await expect(await canvas.findByText('2 of 3 bookings')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Sort: Time, soonest first' }))
    await userEvent.click(within(await page.findByRole('listbox')).getByRole('option', { name: 'Time, latest first' }))
    await expect(await canvas.findByRole('button', { name: 'Sort: Time, latest first' })).toBeVisible()
    const names = within(canvas.getByRole('table', { name: 'Bookings' })).getAllByRole('button', { name: /Leýli G\.|Gözel A\./ })
    await expect(names.map((b) => b.textContent).filter(Boolean)).toEqual(['Leýli G.', 'Gözel A.'])
    await expect(canvas.getByRole('link', { name: 'Export CSV' })).toHaveAttribute(
      'href',
      // both statuses, the key repeated as the sdk sends a list
      expect.stringMatching(/status=(pending|confirmed)&(.*&)?status=(pending|confirmed)/),
    )
  },
}

/** A link with several values in each filter and an order opens as it was (the 1440 screenshot). */
export const SeveralFromLink: Story = {
  args: {
    path: `/w/glow-studio/bookings?tab=today&staff=${id(2)},${id(3)}&service=${id(5)},${id(6)}&status=pending,confirmed&sortBy=latest`,
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('2 of 3 bookings')).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Service · 2' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Sort: Time, latest first' })).toBeVisible()
  },
}

/** «Show more» adds the next page. */
export const ShowMore: Story = {
  args: { server: fakeApi('owner', { more: true }) },
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: 'Gözel A.' })
    await expect(canvas.queryByRole('button', { name: 'Bahar N.' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Show more' }))
    await expect(await canvas.findByRole('button', { name: 'Bahar N.' })).toBeVisible()
  },
}

/** A row opens the same drawer as the calendar. */
export const OpenRow: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Gözel A.' }))
    const d = within(await page.findByRole('dialog', { name: 'Booking' }))
    await expect(await d.findByText('Women’s haircut', { selector: 'dd' })).toBeVisible()
  },
}

/** The menu moves a booking on the calendar, by the address. */
export const MoveFromMenu: Story = {
  args: { path: '/w/glow-studio/bookings?tab=upcoming' },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Actions for Jemal B.' }))
    await page.findByRole('menuitem', { name: 'Open the client’s card' })
    await userEvent.click(await page.findByRole('menuitem', { name: 'Move to another time' }))
    await expect(await canvas.findByText('The calendar')).toBeVisible()
  },
}

/** A specialist: no specialist column, filter or export. */
export const Specialist: Story = {
  args: { server: fakeApi('specialist') },
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Bookings' })
    await expect(within(table).queryByRole('columnheader', { name: 'Specialist' })).toBeNull()
    await expect(canvas.queryByRole('combobox', { name: 'Specialist' })).toBeNull()
    await expect(canvas.queryByRole('link', { name: 'Export CSV' })).toBeNull()
  },
}

/** On a phone the rows are a list, and one opens the same drawer; the filters sit in the Filters sheet. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Filters' }))
    const sheet = within(await page.findByRole('dialog', { name: 'Filters' }))
    await userEvent.click(sheet.getByRole('option', { name: 'Today' }))
    await userEvent.click(sheet.getByRole('button', { name: 'Show results' }))
    await expect(await canvas.findByRole('button', { name: 'Filters 1' })).toBeVisible()
    await userEvent.click(await canvas.findByRole('button', { name: /Gözel A\./ }))
    await expect(await page.findByRole('dialog', { name: 'Booking' })).toBeVisible()
  },
}

/** Requests open the page: the timer, confirm and decline, a move's two times, who answers the one the reader can't. */
export const Requests: Story = {
  args: { path: '/w/glow-studio/bookings' },
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Requests' })
    await expect(canvas.getByRole('tab', { name: /^Requests/ })).toHaveAttribute('aria-selected', 'true')
    await expect(within(table).getByRole('button', { name: 'Confirm Mähri G.' })).toBeVisible()
    await expect(within(table).getByText(/→/)).toBeVisible()
    await expect(within(table).getByText('Answers: Maral')).toBeVisible()
    await expect(within(table).getByRole('columnheader', { name: 'Answer by' })).toBeVisible()
    await expect(within(table).getByRole('columnheader', { name: 'Answer' })).toBeVisible()
    await expect(within(table).queryByRole('checkbox', { name: 'Select Selbi H.' })).toBeNull()
    await userEvent.click(within(table).getByRole('button', { name: 'Confirm Mähri G.' }))
    await page.findByText('Booking confirmed · the client is notified')
  },
}

/** Ticked rows get the bar; confirm says how many landed (book B-31). */
export const BulkConfirm: Story = {
  args: { path: '/w/glow-studio/bookings' },
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Requests' })
    await userEvent.click(within(table).getByRole('checkbox', { name: 'Select all' }))
    const bar = within(await canvas.findByRole('region', { name: 'Selected requests' }))
    await expect(bar.getByText('2 selected')).toBeVisible()
    await userEvent.click(bar.getByRole('button', { name: 'Confirm' }))
    await page.findByText('2 of 2 confirmed · the clients are notified')
  },
}

/** Decline them together: one reason, words for another. */
export const BulkDecline: Story = {
  args: { path: '/w/glow-studio/bookings' },
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Requests' })
    await userEvent.click(within(table).getByRole('checkbox', { name: 'Select Mähri G.' }))
    await userEvent.click(within(await canvas.findByRole('region', { name: 'Selected requests' })).getByRole('button', { name: 'Decline' }))
    const d = within(await page.findByRole('dialog', { name: 'Decline 1 request' }))
    await expect(d.getByRole('button', { name: 'Decline' })).toBeDisabled()
    await userEvent.click(d.getByRole('radio', { name: 'Another reason' }))
    await userEvent.type(d.getByRole('textbox', { name: 'Another reason' }), 'We’re closed that day')
    await userEvent.click(d.getByRole('button', { name: 'Decline' }))
    await page.findByText('1 of 1 declined · the clients see the reason')
  },
}

/** No requests: said so, with the way to the calendar. */
export const NoRequests: Story = {
  args: { path: '/w/glow-studio/bookings', server: fakeApi('owner', { none: true }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No new requests')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Open the calendar' })).toBeVisible()
  },
}

/** A phone: the requests as a list, the timer on each. */
export const RequestsPhone: Story = {
  args: { path: '/w/glow-studio/bookings' },
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Mähri G\./ })).toBeVisible()
    await expect(canvas.getAllByRole('timer').length).toBe(3)
  },
}

/** The words about a third longer (Russian). */
export const RussianLength: Story = { globals: { text: 'longer' } }
