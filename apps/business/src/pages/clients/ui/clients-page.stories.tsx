/**
 * Clients — B7-Clients B5 (design v0.7, DS-Lists A6), in the app's shell over a `fetch` that answers like the api: one
 * line per client with the tags and «+N», the chips with their counts, the sortable headers, the row as the link to the
 * card, the copy icon and the one «New booking» icon, the search, no results, no clients yet, adding a client (a number
 * already saved, Save and book), the phone's list items, a reader who doesn't see revenue.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { ClientRow } from '@yeral/contract/clients'
import type { Workspace } from '@yeral/contract/team'
import { addDays, today } from '@yeral/domain/time'
import { expect, screen as page, spyOn, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { ClientsPage } from './clients-page'

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
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const client = (n: number, name: string | null, patch: Partial<ClientRow> = {}): ClientRow => ({
  id: id(n),
  name,
  phone: `+9936512345${n}`,
  tags: [],
  segments: [],
  phoneOnly: false,
  visits: 3,
  lastVisit: addDays(DAY, -9),
  total: 450,
  avgCheck: 150,
  next: null,
  ...patch,
})
const rows = [
  client(1, 'Gözel Annaýewa', {
    segments: ['regular'],
    tags: ['VIP'],
    visits: 11,
    next: { code: 'YR-48001', date: addDays(DAY, 1), start: 660, status: 'confirmed', holdUntil: null },
  }),
  client(2, 'Ogulnabat Ç.', { segments: ['flagged'], phoneOnly: true }),
  client(3, null, { visits: 0, lastVisit: null, total: 0 }),
  client(4, 'Mähribangül Nurmuhammedowa-Allaberdiýewa', {
    segments: ['regular'],
    tags: ['VIP', 'Allergy: ammonia', 'Mornings only', 'Colour client'],
    visits: 14,
    lastVisit: addDays(DAY, -2),
    total: 1680,
  }),
]
const SORTS = {
  name: (r: ClientRow) => r.name ?? '',
  visits: (r: ClientRow) => r.visits,
  lastVisit: (r: ClientRow) => r.lastVisit ?? '',
  total: (r: ClientRow) => r.total ?? 0,
  nextBooking: (r: ClientRow) => r.next?.date ?? '9999',
} as const
const sorted = (items: ClientRow[], url: URL) => {
  const by = SORTS[url.searchParams.get('sort') as keyof typeof SORTS]
  if (!by) return items
  const dir =
    url.searchParams.get('dir') ??
    (url.searchParams.get('sort') === 'name' || url.searchParams.get('sort') === 'nextBooking' ? 'asc' : 'desc')
  return [...items].sort((a, b) => (by(a) < by(b) ? -1 : by(a) > by(b) ? 1 : 0) * (dir === 'asc' ? 1 : -1))
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const answer = async (request: Request, level: Workspace['level'], none: boolean): Promise<Response> => {
  const url = new URL(request.url)
  const route = `${request.method} ${url.pathname.replace(/^\/v1/, '')}`
  const w = glow(level)
  if (route === 'GET /me') return json(me)
  if (route === 'GET /me/workspaces') return json({ items: [w], current: w.slug })
  if (route === 'GET /me/invites') return json({ items: [] })
  if (route === 'GET /w/glow-studio/requests') return json({ items: [] })
  if (route === 'GET /w/glow-studio/clients/lookup') {
    const digits = url.searchParams.get('phone')?.replace(/\D/g, '')
    return json({ items: digits && rows[0]!.phone?.endsWith(digits) ? [{ ...rows[0], alerts: [], usualServices: [] }] : [] })
  }
  if (route === 'GET /w/glow-studio/clients') {
    const q = url.searchParams.get('q')?.toLowerCase()
    const segment = url.searchParams.get('segment')
    const items = none
      ? []
      : sorted(rows, url)
          .filter((r) => !q || r.name?.toLowerCase().includes(q))
          .filter((r) => !segment || r.segments.includes(segment as never))
          .map((r) => (level === 'specialist' ? { ...r, total: null, avgCheck: null } : r))
    const shown = none ? [] : rows.filter((r) => !q || r.name?.toLowerCase().includes(q))
    const counts = {
      all: shown.length,
      regular: shown.filter((r) => r.segments.includes('regular')).length,
      new: shown.filter((r) => r.segments.includes('new')).length,
      lapsed: shown.filter((r) => r.segments.includes('lapsed')).length,
      flagged: shown.filter((r) => r.segments.includes('flagged')).length,
    }
    return json({ items, total: items.length, cursor: null, counts })
  }
  if (route === 'POST /w/glow-studio/clients') {
    await request.json()
    return json({ id: id(7) })
  }
  return json({ error: { code: 'not_found' } }, 404)
}

const fakeApi =
  (level: Workspace['level'], { none = false }: { none?: boolean } = {}): (() => typeof fetch) =>
  () =>
  (input: RequestInfo | URL, init?: RequestInit) =>
    answer(new Request(input, init), level, none)

const meta = {
  title: 'Business/Clients/List',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: {
    routes: {},
    layouts: { '/w/$slug': { component: WorkspaceShell, children: { clients: ClientsPage, calendar: () => <p>The calendar</p> } } },
    path: '/w/glow-studio/clients',
    server: fakeApi('owner'),
  },
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

/** One line per client: the tags with «+N», the counts on the chips, the name as the row's link, Total. */
export const List: Story = {
  play: async ({ canvas }) => {
    const table = within(await canvas.findByRole('table', { name: 'Clients' }))
    await expect(table.getByRole('link', { name: 'Gözel Annaýewa' })).toHaveAttribute('href', `/w/glow-studio/clients/${id(1)}`)
    await expect(table.getAllByText('VIP')[0]).toBeVisible()
    await expect(table.getByText('Phone only')).toBeVisible()
    await expect(table.getByText('Unnamed client')).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Total' })).toHaveAttribute('aria-sort', 'none')
    await expect(table.queryByRole('button', { name: /Actions for/ })).toBeNull()
    await expect(canvas.getByRole('radio', { name: 'Regular 2' })).toBeVisible()
    await userEvent.click(table.getByRole('button', { name: '3 more tags' }))
    await waitFor(() => expect(page.getByRole('dialog', { name: '3 more tags' })).toHaveTextContent('Colour client'))
  },
}

/** The headers sort through the address: Visits most first, then fewest first; Name A → Z. */
export const Sorting: Story = {
  play: async ({ canvas }) => {
    const table = within(await canvas.findByRole('table', { name: 'Clients' }))
    const visits = table.getByRole('columnheader', { name: 'Visits' })
    await userEvent.click(within(visits).getByRole('button'))
    await waitFor(() => expect(visits).toHaveAttribute('aria-sort', 'descending'))
    await waitFor(() => expect(table.getAllByRole('link')[0]).toHaveTextContent('Mähribangül'))
    await userEvent.click(within(visits).getByRole('button'))
    await waitFor(() => expect(visits).toHaveAttribute('aria-sort', 'ascending'))
    await waitFor(() => expect(table.getAllByRole('link')[0]).toHaveTextContent('Unnamed client'))
    const name = table.getByRole('columnheader', { name: 'Name' })
    await userEvent.click(within(name).getByRole('button'))
    await waitFor(() => expect(name).toHaveAttribute('aria-sort', 'ascending'))
    await expect(visits).toHaveAttribute('aria-sort', 'none')
  },
}

/** Sorted by Last visit, newest first, straight from the address. */
export const SortedFromAddress: Story = {
  args: { path: '/w/glow-studio/clients?sort=lastVisit' },
  play: async ({ canvas }) => {
    const table = within(await canvas.findByRole('table', { name: 'Clients' }))
    await expect(table.getByRole('columnheader', { name: 'Last visit' })).toHaveAttribute('aria-sort', 'descending')
    await waitFor(() => expect(table.getAllByRole('link')[0]).toHaveTextContent('Mähribangül'))
  },
}

/** The copy icon copies the grouped number and never opens the row; the one row action opens a new booking. */
export const RowActions: Story = {
  play: async ({ canvas }) => {
    const table = within(await canvas.findByRole('table', { name: 'Clients' }))
    const write = spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    await userEvent.click(table.getAllByRole('button', { name: 'Copy number' })[0]!)
    await page.findByText('Number copied')
    await expect(write).toHaveBeenCalledWith('+993 65 12 34 51')
    await expect(canvas.getByRole('table', { name: 'Clients' })).toBeVisible()
    await userEvent.click(table.getByRole('button', { name: 'New booking for Gözel Annaýewa' }))
    await expect(await canvas.findByText('The calendar')).toBeVisible()
  },
}

/** A chip, the search, no results and back. */
export const Filters: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('table', { name: 'Clients' })
    await userEvent.click(canvas.getByRole('radio', { name: /^Reported/ }))
    await waitFor(() => expect(canvas.queryByText('Gözel Annaýewa')).toBeNull())
    await userEvent.type(canvas.getByRole('textbox', { name: 'Name or phone number' }), 'zzz')
    await expect(await canvas.findByText('No clients match “zzz”')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }))
    await expect(await canvas.findByText('Gözel Annaýewa')).toBeVisible()
  },
}

export const NoClients: Story = {
  args: { server: fakeApi('owner', { none: true }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No clients yet')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Add a client' }))
    await waitFor(() => expect(page.getByRole('dialog', { name: 'New client' })).toBeVisible())
  },
}

/** Add a client: a number already saved says whose it is and can't be saved; a new one saves. */
export const AddClient: Story = {
  args: { path: '/w/glow-studio/clients?modal=add' },
  play: async () => {
    const d = within(await page.findByRole('dialog', { name: 'New client' }))
    const phone = d.getByRole('textbox', { name: 'Phone number' })
    await userEvent.type(phone, '65123451')
    await expect(await d.findByText(/This number belongs to Gözel Annaýewa/)).toBeVisible()
    await expect(d.getByRole('link', { name: 'open the card' })).toHaveAttribute('href', `/w/glow-studio/clients/${id(1)}`)
    await expect(d.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.clear(phone)
    await userEvent.type(phone, '65123459')
    await userEvent.type(d.getByRole('textbox', { name: 'Name' }), 'Aýgözel')
    await waitFor(() => expect(d.getByRole('button', { name: 'Save' })).toBeEnabled())
    await userEvent.click(d.getByRole('button', { name: 'Save' }))
    await page.findByText('Client added')
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
  },
}

/** Save and book goes to the new booking for them. */
export const SaveAndBook: Story = {
  args: { path: '/w/glow-studio/clients?modal=add' },
  play: async ({ canvas }) => {
    const d = within(await page.findByRole('dialog', { name: 'New client' }))
    await userEvent.type(d.getByRole('textbox', { name: 'Phone number' }), '65123459')
    await waitFor(() => expect(d.getByRole('button', { name: 'Save and book' })).toBeEnabled())
    await userEvent.click(d.getByRole('button', { name: 'Save and book' }))
    await expect(await canvas.findByText('The calendar')).toBeVisible()
  },
}

/** A reader who doesn't see revenue has no Total. */
export const NoRevenue: Story = {
  args: { server: fakeApi('specialist') },
  play: async ({ canvas }) => {
    const table = within(await canvas.findByRole('table', { name: 'Clients' }))
    await expect(table.queryByRole('columnheader', { name: 'Total' })).toBeNull()
  },
}

/** 390: 68-high list items, the whole item opens the card, no row action. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const list = within(await canvas.findByRole('list', { name: 'Clients' }))
    await expect(list.getByRole('link', { name: /Gözel Annaýewa/ })).toHaveAttribute('href', `/w/glow-studio/clients/${id(1)}`)
    await expect(list.getAllByText(/11 visits/)[0]).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /New booking for/ })).toBeNull()
  },
}

/** The words about a third longer (Russian). */
export const RussianLength: Story = { globals: { text: 'longer' } }
