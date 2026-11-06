/**
 * The client card — B-Client (v0.6 round 3, English), in the app's shell over a `fetch` that answers like the api: the
 * card as the owner reads it, a note, the edit, Phone only, removing a report, more history, the delete modal both ways,
 * a specialist's card, a client who isn't theirs, a phone.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { ClientCard } from '@yeral/contract/clients'
import type { Workspace } from '@yeral/contract/team'
import { addDays, epochOf, today } from '@yeral/domain/time'
import { expect, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { ClientPage } from './client-page'

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
const STAFF = '00000000-0000-4000-8000-000000000002'
const glow = (level: Workspace['level']): Workspace => ({
  slug: 'glow-studio',
  name: 'Glow Studio',
  address: 'Bitarap Türkmenistan şaýoly 12',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  logo: null,
  level,
  staffId: STAFF,
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer: 0,
  requestsToAnswer: 0,
  lastOpenedAt: null,
})
const ID = '00000000-0000-4000-8000-000000000001'
const DAY = today(Date.now())
const booking = (code: string, date: string, status: ClientCard['history'][number]['status'], service = 'Hair colouring') => ({
  code,
  date,
  start: 690,
  end: 810,
  status,
  holdUntil: null,
  items: [{ serviceId: null, service, staffId: STAFF, staff: 'Aýna', start: 690, end: 810 }],
  price: { type: 'fixed' as const, amount: 250 },
})
const card: ClientCard = {
  id: ID,
  name: 'Aýjemal Gurbanowa',
  phone: '+99365123451',
  account: true,
  birthday: '1994-03-14',
  source: 'instagram',
  tags: ['VIP'],
  segments: ['regular'],
  since: '2024-03-02',
  stats: { visits: 12, avgCheck: 145, lastVisit: addDays(DAY, -30), noShows: 1 },
  notes: [
    { id: 'n-1', text: 'She can only come in the morning.', alert: false, by: 'Selbi', at: epochOf('2026-07-03', 600) },
    { id: 'n-2', text: 'Use ammonia-free colour — allergy.', alert: true, by: 'Aýna', at: epochOf('2026-08-12', 600) },
  ],
  upcoming: [],
  history: [booking('YR-30001', addDays(DAY, -30), 'completed', 'Haircut'), booking('YR-30002', addDays(DAY, -60), 'noshow')],
  moreHistory: false,
  reports: [
    {
      code: 'YR-30002',
      date: addDays(DAY, -60),
      type: 'noshow',
      text: null,
      by: { staffId: STAFF, name: 'Aýna Myradowa' },
      at: Date.now() - 2 * 86_400_000,
    },
  ],
  settings: { phoneOnly: false, phoneOnlyByCount: false, noReminders: false },
}
const ahead: ClientCard['upcoming'] = [
  { ...booking('YR-40001', addDays(DAY, 1), 'confirmed'), start: 660, end: 780 },
  { ...booking('YR-40002', addDays(DAY, 2), 'pending'), holdUntil: Date.now() + 40 * 60_000 },
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

type Options = { level?: Workspace['level']; start?: ClientCard; hidden?: boolean }

/** A card that takes the writes, as the api would: what the stories send lands in `sent`. */
const fakeApi =
  ({ level = 'owner', start = card, hidden = false }: Options = {}, sent: unknown[] = []): (() => typeof fetch) =>
  () => {
    let now = start
    let gone = false
    const answer = async (request: Request): Promise<Response> => {
      const url = new URL(request.url)
      const route = `${request.method} ${url.pathname.replace(/^\/v1/, '')}`
      const w = glow(level)
      const path = `/w/glow-studio/clients/${ID}`
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [w], current: w.slug })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (route === 'GET /w/glow-studio/requests') return json({ items: [] })
      if (route === 'GET /w/glow-studio/settings/hours') return json({ hours: [], specialDays: [] })
      if (route === 'GET /w/glow-studio/settings/rules') return json({ blockAfterNoShows: 2 })
      if (route === `GET ${path}`) {
        if (hidden || gone) return json({ error: { code: 'not_found' } }, 404)
        const history = Number(url.searchParams.get('history') ?? 10)
        return json({ ...now, moreHistory: start.moreHistory && history === 10 })
      }
      if (route === `PATCH ${path}`) {
        const body = (await request.json()) as Partial<ClientCard> & ClientCard['settings']
        sent.push(body)
        const { phoneOnly, noReminders, ...rest } = body
        now = {
          ...now,
          ...rest,
          settings: {
            ...now.settings,
            ...(phoneOnly === undefined ? {} : { phoneOnly, phoneOnlyByCount: false }),
            ...(noReminders === undefined ? {} : { noReminders }),
          },
        }
        return json({})
      }
      if (route === `POST ${path}/notes`) {
        const body = (await request.json()) as { text: string; alert: boolean }
        sent.push(body)
        now = { ...now, notes: [{ id: 'n-new', by: 'Maýsa', at: Date.now(), ...body }, ...now.notes] }
        return json({ id: 'n-new' }, 201)
      }
      if (route === `DELETE ${path}`) {
        gone = true
        sent.push('deleted')
        return new Response(null, { status: 204 })
      }
      if (route === 'DELETE /w/glow-studio/bookings/YR-30002/complaint') {
        now = { ...now, reports: [] }
        return new Response(null, { status: 204 })
      }
      return json({ error: { code: 'not_found' } }, 404)
    }
    return (input: RequestInfo | URL, init?: RequestInit) => answer(new Request(input, init))
  }

const meta = {
  title: 'Business/Clients/Card',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: {
    routes: {},
    layouts: {
      '/w/$slug': {
        component: WorkspaceShell,
        children: {
          'clients/$id': ClientPage,
          clients: () => <p>The clients list</p>,
          calendar: () => <p>The calendar</p>,
          bookings: () => <p>The bookings</p>,
        },
      },
    },
    path: `/w/glow-studio/clients/${ID}`,
    server: fakeApi(),
  },
} satisfies Meta<typeof PageStory>

export default meta
type Story = StoryObj<typeof meta>

/** The owner's card: the head, the figures, alerts first, the history, the report, the switches. */
export const Owner: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Aýjemal Gurbanowa' })).toBeVisible()
    await expect(canvas.getByRole('heading', { level: 1, name: 'Aýjemal Gurbanowa' })).toBeVisible()
    const top = within(canvas.getByRole('banner'))
    await expect(top.getByRole('link', { name: 'Clients' })).toHaveAttribute('href', '/w/glow-studio/clients')
    await expect(top.getByRole('link', { name: 'New booking' })).toBeVisible()
    await expect(canvas.getByText('Ýeral account')).toBeVisible()
    await expect(canvas.getByText('since March 2024 · Instagram')).toBeVisible()
    const figures = within(canvas.getByRole('list', { name: 'Key figures' }))
    await expect(figures.getByText('Average check')).toBeVisible()
    await expect(figures.getByText('145 TMT')).toBeVisible()
    await expect(figures.getByText('Haircut · Aýna')).toBeVisible()
    await expect(canvas.getByText('Shown when booking')).toBeVisible()
    const alert = canvas.getByText('Use ammonia-free colour — allergy.')
    const plain = canvas.getByText('She can only come in the morning.')
    await expect(alert.compareDocumentPosition(plain) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await expect(canvas.getByText('No upcoming bookings.')).toBeVisible()
    await expect(canvas.getByRole('table', { name: 'History' })).toBeVisible()
    await expect(canvas.getByRole('switch', { name: 'Phone only' })).not.toBeChecked()
    await expect(await canvas.findByText(/Turns on by itself after 2 no-shows/)).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Client settings' })).toBeVisible()
  },
}

/** What's ahead: a visit opens the calendar, a request opens Bookings and shows its timer. */
export const Upcoming: Story = {
  args: { server: fakeApi({ start: { ...card, upcoming: ahead } }) },
  play: async ({ canvas }) => {
    const request = await canvas.findByRole('link', { name: /Pending.*Open the request/ })
    await expect(request).toHaveAttribute('href', '/w/glow-studio/bookings?request=YR-40002')
    await expect(within(request).getByRole('timer')).toBeVisible()
    await expect(canvas.getByRole('link', { name: /Confirmed.*Open in the calendar/ })).toHaveAttribute(
      'href',
      `/w/glow-studio/calendar?booking=YR-40001&date=${addDays(DAY, 1)}`,
    )
  },
}

/** Add note: Save waits for words; an alert says so on the note. */
const notes: unknown[] = []
export const AddNote: Story = {
  args: { server: fakeApi({}, notes) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Add note' }))
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.type(canvas.getByRole('textbox', { name: 'New note' }), 'Prefers tea')
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Show when booking (alert)' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    await expect(await canvas.findByText('Prefers tea')).toBeVisible()
    await page.findByText('Note added')
    await expect(notes).toEqual([{ text: 'Prefers tea', alert: true }])
    await expect(canvas.getByRole('button', { name: 'Add note' })).toBeVisible()
  },
}

/** Change: an account's number stays read-only, and only what's on the form goes. */
const edits: unknown[] = []
export const Edit: Story = {
  args: { server: fakeApi({}, edits) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Change' }))
    await expect(canvas.getByRole('heading', { name: 'Client details' })).toBeVisible()
    await expect(canvas.getByRole('textbox', { name: 'Phone' })).toHaveAttribute('readonly')
    await expect(canvas.getByText('The client changes this number in their Ýeral account; it updates here too.')).toBeVisible()
    await expect(canvas.queryByRole('link', { name: 'New booking' })).toBeNull()
    const name = canvas.getByRole('textbox', { name: 'Name and surname' })
    await userEvent.clear(name)
    await userEvent.type(name, 'Aýjemal G.')
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    await page.findByText('Changes saved')
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Aýjemal G.' })).toBeVisible()
    await expect(edits).toEqual([{ name: 'Aýjemal G.', birthday: '1994-03-14', source: 'instagram', tags: ['VIP'] }])
  },
}

/** A number a client typed can change, and must be whole to save. */
export const EditNumber: Story = {
  args: { server: fakeApi({ start: { ...card, account: false } }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Change' }))
    const phone = canvas.getByRole('textbox', { name: 'Phone' })
    await userEvent.type(phone, '{Backspace}')
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled()
  },
}

/** Phone only off after the no-show count turned it on: the count starts again, and the caption says so. */
export const PhoneOnlyBack: Story = {
  args: {
    server: fakeApi({ start: { ...card, settings: { phoneOnly: true, phoneOnlyByCount: true, noReminders: false } } }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('1 no-show — online booking is off for this client')).toBeVisible()
    await userEvent.click(canvas.getByRole('switch', { name: 'Phone only' }))
    await page.findByText('Phone only is off · online booking is back')
    await expect(await canvas.findByText('Online booking is back. The no-show count starts again from zero.')).toBeVisible()
  },
}

/** Don't send reminders says what it did. */
export const Reminders: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'Don’t send reminders' }))
    await page.findByText('No reminders go to this client')
    await waitFor(() => expect(canvas.getByRole('switch', { name: 'Don’t send reminders' })).toBeChecked())
  },
}

/** Remove report: within the week the button names what it takes back, and a no-show says the booking's status. */
export const RemoveReport: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/You can remove it until/)).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /^Remove report: No-show/ }))
    await page.findByText('Report removed · the booking is Completed again')
    await expect(await canvas.findByText('No reports.')).toBeVisible()
  },
}

/**
 * Show more asks for the next ten; the api has no more, so the button goes. The person has read down to it, and stays
 * there: the longer history changes the address, which used to scroll the page to the top (the owner's #12).
 */
export const MoreHistory: Story = {
  args: { server: fakeApi({ start: { ...card, moreHistory: true } }) },
  play: async ({ canvas }) => {
    const more = await canvas.findByRole('button', { name: 'Show more' })
    window.scrollTo(0, document.documentElement.scrollHeight)
    await waitFor(() => expect(window.scrollY).toBeGreaterThan(0))
    await userEvent.click(more)
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Show more' })).toBeNull())
    await expect(window.scrollY).toBeGreaterThan(0)
  },
}

/** Delete: what goes, what stays, and back to the list. */
const deletes: unknown[] = []
export const Delete: Story = {
  args: { server: fakeApi({}, deletes) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete client' }))
    const d = within(await page.findByRole('dialog', { name: 'Delete this client?' }))
    await waitFor(() => expect(d.getByText(/is removed from your clients/)).toBeVisible())
    await userEvent.click(d.getByRole('button', { name: 'Delete client' }))
    await expect(await canvas.findByText('The clients list')).toBeVisible()
    await page.findByText('Client deleted')
    await expect(deletes).toEqual(['deleted'])
  },
}

/** Bookings ahead (opened from the list's menu by the address): they're listed, and there's no delete to press. */
export const DeleteBlocked: Story = {
  args: { path: `/w/glow-studio/clients/${ID}?remove=true`, server: fakeApi({ start: { ...card, upcoming: ahead } }) },
  play: async () => {
    const d = within(await page.findByRole('dialog', { name: 'Can’t delete this client yet' }))
    await waitFor(() => expect(d.getByText(/has 1 upcoming booking and 1 waiting request/)).toBeVisible())
    await expect(d.getAllByRole('link')).toHaveLength(2)
    await expect(d.queryByRole('button', { name: 'Delete client' })).toBeNull()
  },
}

/** A specialist: their own figures, no average, no Change, no switches; a note still goes. */
export const Specialist: Story = {
  args: {
    server: fakeApi({ level: 'specialist', start: { ...card, stats: { ...card.stats, avgCheck: null } } }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Details' })).toBeVisible()
    await expect(canvas.getByText('with you')).toBeVisible()
    await expect(canvas.queryByText('Average check')).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Change' })).toBeNull()
    await expect(canvas.queryByRole('switch')).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Delete client' })).toBeNull()
    await expect(canvas.getByRole('button', { name: 'Add note' })).toBeVisible()
  },
}

/** Someone else's client: the card says so and leads back. */
export const NotInList: Story = {
  args: { server: fakeApi({ level: 'specialist', hidden: true }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('This client isn’t in your list')).toBeVisible()
    await expect(canvas.getByText('You see only clients who have a booking with you.')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Back to clients' })).toHaveAttribute('href', '/w/glow-studio/clients')
  },
}

/** A phone (B-Mobile 9b–9c): the top bar's words go but stay named, the side comes under the card, the history is a list. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { server: fakeApi({ start: { ...card, upcoming: ahead } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Aýjemal Gurbanowa' })).toBeVisible()
    await expect(within(canvas.getByRole('banner')).getByRole('link', { name: 'Clients' })).toBeVisible()
    await expect(canvas.getByRole('list', { name: 'History' })).toBeVisible()
    await expect(canvas.queryByRole('table', { name: 'History' })).toBeNull()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}
