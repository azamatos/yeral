/**
 * Clients — B-Clients (v0.6 round 3, English), in the app's shell over a `fetch` that answers like the api: the rows with
 * their tags, the chips, the search, nothing found, no clients yet, adding a client (a number already saved, Save and
 * book), a phone, a reader who doesn't see revenue.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { ClientRow } from '@yeral/contract/clients'
import type { Workspace } from '@yeral/contract/team'
import { addDays, today } from '@yeral/domain/time'
import { expect, screen as page, userEvent, waitFor, within } from 'storybook/test'
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
    next: { code: 'YR-48001', date: addDays(DAY, 1), start: 660, status: 'confirmed', holdUntil: null },
  }),
  client(2, 'Ogulnabat Ç.', { segments: ['flagged'], phoneOnly: true }),
  client(3, null, { visits: 0, lastVisit: null, total: 0 }),
]
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
      : rows
          .filter((r) => !q || r.name?.toLowerCase().includes(q))
          .filter((r) => !segment || r.segments.includes(segment as never))
          .map((r) => (level === 'specialist' ? { ...r, total: null, avgCheck: null } : r))
    return json({ items, cursor: null })
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

/** The rows: tags with Phone only and Reported, an unnamed client, Total, the next booking. */
export const List: Story = {
  play: async ({ canvas }) => {
    const table = within(await canvas.findByRole('table', { name: 'Clients' }))
    await expect(table.getByText('Gözel Annaýewa')).toBeVisible()
    await expect(table.getByText('VIP')).toBeVisible()
    await expect(table.getByText('Phone only')).toBeVisible()
    await expect(table.getByText('Unnamed client')).toBeVisible()
    await expect(table.getByRole('columnheader', { name: 'Total' })).toBeVisible()
  },
}

/** A chip, the search, nothing found and back. */
export const Filters: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('table', { name: 'Clients' })
    await userEvent.click(canvas.getByRole('radio', { name: 'Reported' }))
    await waitFor(() => expect(canvas.queryByText('Gözel Annaýewa')).toBeNull())
    await userEvent.type(canvas.getByRole('textbox', { name: 'Name or phone number' }), 'zzz')
    await expect(await canvas.findByText('No clients found')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }))
    await expect(await canvas.findByText('Gözel Annaýewa')).toBeVisible()
  },
}

export const NoClients: Story = {
  args: { server: fakeApi('owner', { none: true }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No clients yet')).toBeVisible()
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

export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Gözel Annaýewa')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Actions for Gözel Annaýewa' })).toBeVisible()
  },
}

/** The words about a third longer (Russian). */
export const RussianLength: Story = { globals: { text: 'longer' } }
