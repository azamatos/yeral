/**
 * The booking drawer — B-Calendar `panel=booking` and `internal` (v0.6 round 3, English), DS-Business BookingDrawer, over
 * a `fetch` that answers like the api: a confirmed booking with the client's facts from the card, the internal status
 * on it, the note saved as it's typed, each status's look, the owner's, an administrator's and a specialist's read,
 * one the reader can't see, a phone, and the Russian length.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { CalendarBooking } from '@yeral/contract/calendar'
import type { ClientCard } from '@yeral/contract/clients'
import type { InternalStatus as Status } from '@yeral/contract/settings'
import type { Level } from '@yeral/domain/permissions'
import { addDays, today } from '@yeral/domain/time'
import { expect, fn, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { BookingDrawer } from './booking-drawer'

const now = Date.now()
const DAY = today(now)
const TOMORROW = addDays(DAY, 1)
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`
const CODE = 'YR-48210'

const booking = (patch: Partial<CalendarBooking> = {}): CalendarBooking => ({
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
const card = (patch: Partial<ClientCard> = {}, stats: Partial<ClientCard['stats']> = {}): ClientCard => ({
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
    { id: id(8), text: 'Allergic to ammonia dyes', alert: true, by: 'Maýsa', at: now - 86_400_000 },
    { id: id(9), text: 'Prefers mornings', alert: false, by: 'Maýsa', at: now - 86_400_000 },
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

const statuses: Status[] = [
  { id: id(2), preset: 'arrived', name: 'Arrived', icon: 'user-check', color: '#066a41', enabled: true },
  { id: id(3), preset: 'started', name: 'Started', icon: 'play', color: '#4429d6', enabled: false },
  { id: id(4), preset: null, name: 'Preparing', icon: 'hourglass', color: '#93500a', enabled: true },
]

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the drawer asks it; `calls` collects what it was sent. */
const fakeApi =
  ({
    booking: b = booking(),
    card: c = card(),
    internal = false,
    gone = false,
    calls = [],
  }: {
    booking?: CalendarBooking
    card?: ClientCard | null
    /** The workspace switched internal statuses on. */
    internal?: boolean
    /** The reader doesn't see this booking. */
    gone?: boolean
    calls?: { route: string; body: unknown }[]
  } = {}): (() => typeof fetch) =>
  () => {
    // what was saved in this story, read back
    let note = b.internalNote
    let internalStatusId = b.internalStatusId
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const url = new URL(request.url)
      const route = `${request.method} ${url.pathname.replace(/^\/v1/, '')}`
      if (route === `GET /w/glow-studio/bookings/${CODE}`)
        return gone ? json({ error: { code: 'not_found' } }, 404) : json({ ...b, internalNote: note, internalStatusId })
      if (route === 'GET /w/glow-studio/settings/statuses') return json({ items: internal ? statuses : [], max: 5 })
      if (route === `GET /w/glow-studio/clients/${id(7)}`) return c ? json(c) : json({ error: { code: 'not_found' } }, 404)
      if (route === `PUT /w/glow-studio/bookings/${CODE}/note`) {
        const body = (await request.json()) as { note: string | null }
        calls.push({ route, body })
        note = body.note
        return new Response(null, { status: 204 })
      }
      if (route === `PUT /w/glow-studio/bookings/${CODE}/internal-status`) {
        const body = (await request.json()) as { statusId: string | null }
        calls.push({ route, body })
        internalStatusId = body.statusId
        return new Response(null, { status: 204 })
      }
      return json({ error: { code: 'not_found' } }, 404)
    }
  }

const onClose = fn()
const onMove = fn()
const onBookAgain = fn()

/** The drawer over an empty page, as the calendar opens it. */
const drawer =
  (level: Level, extra: { move?: boolean; bookAgain?: boolean } = {}) =>
  () => (
    <BookingDrawer
      slug="glow-studio"
      code={CODE}
      now={now}
      level={level}
      onClose={onClose}
      onMove={extra.move ? onMove : undefined}
      onBookAgain={extra.bookAgain ? onBookAgain : undefined}
    />
  )

const meta = {
  title: 'Business/Bookings/BookingDrawer',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: { routes: { '/': drawer('owner') }, path: '/', server: fakeApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const open = () => page.findByRole('dialog', { name: 'Booking' })

/**
 * The owner's read of a confirmed online booking: the status and source, the client with her facts from the card
 * (visits, the average check, a no-show), her alert note, Call and the card's link, the details, her note, the empty
 * internal note, the last three other visits with their prices.
 */
export const Confirmed: Story = {
  play: async () => {
    const d = within(await open())
    await expect(d.getByText('Confirmed')).toBeVisible()
    await expect(d.getByText('Online')).toBeVisible()
    await expect(d.getByText('Gözel Annaýewa')).toBeVisible()
    await expect(await d.findByText('12 visits · average check 145 TMT')).toBeVisible()
    await expect(d.getByText('1 no-show')).toBeVisible()
    await expect(d.getByText('Allergic to ammonia dyes')).toBeVisible()
    await expect(d.queryByText('Prefers mornings')).toBeNull()
    await expect(d.getByRole('link', { name: 'Call Gözel Annaýewa, +993 65 10 20 30' })).toHaveAttribute('href', 'tel:+99365102030')
    await expect(d.getByText('Women’s haircut', { selector: 'dd' })).toBeVisible()
    await expect(d.getByText('Aýna')).toBeVisible()
    await expect(d.getByText(/ · 10:00–11:00$/)).toBeVisible()
    await expect(d.getByText('60 min')).toBeVisible()
    await expect(d.getByText('120 TMT', { selector: 'dd' })).toBeVisible()
    await expect(d.getByText('“Could you use the same colour as last time?”')).toBeVisible()
    await expect(d.getByRole('textbox', { name: 'Internal note' })).toHaveValue('')
    await expect(d.getByText('Only your team sees it · saved automatically')).toBeVisible()
    // the visits: the booking open isn't among them; a no-show reads as one
    const visits = d.getAllByRole('listitem')
    await expect(visits).toHaveLength(3)
    await expect(within(visits[1]!).getByText('No-show')).toBeVisible()
    await expect(within(visits[1]!).getByText('250 TMT')).toBeVisible()
    // no internal statuses switched on, no move offered: no select, no footer
    await expect(d.queryByRole('combobox')).toBeNull()
    await expect(d.queryByRole('button', { name: 'Move to another time' })).toBeNull()
  },
}

/** Internal statuses switched on: None, Arrived and the business's own (Started is off); picking one saves at once, the toast's Undo puts None back. */
export const InternalStatus: Story = {
  args: { server: fakeApi({ internal: true }) },
  play: async ({ canvas }) => {
    const d = within(await open())
    const select = await d.findByRole('combobox', { name: 'Internal status' })
    await expect(d.getByText('Only the team sees it · the booking status doesn’t change')).toBeVisible()
    await expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['None', 'Arrived', 'Preparing'])
    await userEvent.selectOptions(select, 'Arrived')
    const saved = await canvas
      .findByText('Internal status: Arrived', {}, { timeout: 3000 })
      .then((n) => n.closest('[data-sonner-toast]') as HTMLElement)
    await expect(select).toHaveValue(id(2))
    await userEvent.click(within(saved).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(select).toHaveValue(''))
  },
}

/** A booking with its marker: the select shows it. */
export const InternalStatusSet: Story = {
  args: { server: fakeApi({ internal: true, booking: booking({ internalStatusId: id(2) }) }) },
  play: async () => {
    const d = within(await open())
    await expect(await d.findByRole('combobox', { name: 'Internal status' })).toHaveValue(id(2))
  },
}

/** What the autosave story's api was sent. */
const noteCalls: { route: string; body: unknown }[] = []

/** The internal note: typed, it goes to the api whole after a pause in the typing, and the caption says «saved». */
export const NoteAutosave: Story = {
  args: { server: fakeApi({ calls: noteCalls }) },
  play: async () => {
    noteCalls.length = 0
    const d = within(await open())
    const note = d.getByRole('textbox', { name: 'Internal note' })
    await userEvent.type(note, 'Colour 7.1')
    await expect(d.getByText('Only your team sees it · saving…')).toBeVisible()
    await expect(await d.findByText('Only your team sees it · saved', {}, { timeout: 3000 })).toBeVisible()
    await expect(note).toHaveValue('Colour 7.1')
    // the whole note, once
    await expect(noteCalls.map((c) => c.body)).toEqual([{ note: 'Colour 7.1' }])
  },
}

/** A note already written: shown, with «saved». */
export const NoteSaved: Story = {
  args: { server: fakeApi({ booking: booking({ internalNote: 'Colour 7.1, no ammonia' }) }) },
  play: async () => {
    const d = within(await open())
    await expect(d.getByRole('textbox', { name: 'Internal note' })).toHaveValue('Colour 7.1, no ammonia')
    await expect(d.getByText('Only your team sees it · saved')).toBeVisible()
  },
}

/** «Move to another time» (B4's move mode) and «Book again» (B5), when the page offers them: a confirmed booking ahead. */
export const WithActions: Story = {
  args: { routes: { '/': drawer('owner', { move: true, bookAgain: true }) } },
  play: async () => {
    const d = within(await open())
    await userEvent.click(await d.findByRole('button', { name: 'Move to another time' }))
    await expect(onMove).toHaveBeenCalled()
    await userEvent.click(d.getByRole('button', { name: 'Book again' }))
    await expect(onBookAgain).toHaveBeenCalled()
  },
}

/** An administrator without «See revenue»: the client's line has no average check (the api leaves it out). */
export const Administrator: Story = {
  args: { routes: { '/': drawer('admin') }, server: fakeApi({ card: card({}, { avgCheck: null }) }) },
  play: async () => {
    const d = within(await open())
    await expect(await d.findByText('12 visits')).toBeVisible()
    await expect(d.queryByText(/average check/)).toBeNull()
  },
}

/** A specialist's read: her own booking, no average check and no prices in the visits (B-Calendar `role=specialist`). */
export const Specialist: Story = {
  args: { routes: { '/': drawer('specialist') }, server: fakeApi({ card: card({}, { avgCheck: null }) }) },
  play: async () => {
    const d = within(await open())
    await expect(await d.findByText('Recent visits')).toBeVisible()
    await expect(d.queryByText(/average check/)).toBeNull()
    await expect(within(d.getAllByRole('listitem')[0]!).queryByText(/TMT$/)).toBeNull()
  },
}

/** A walk-in by phone booking of a client with no card (the record is gone): the name alone, no facts, no link. */
export const WalkInNoCard: Story = {
  args: {
    server: fakeApi({
      booking: booking({ source: 'walkin', client: { id: null, name: null, phone: null }, clientNote: null, price: null }),
      card: null,
    }),
  },
  play: async () => {
    const d = within(await open())
    await expect(d.getByText('Walk-in')).toBeVisible()
    await expect(d.getByText('Unnamed client')).toBeVisible()
    await expect(d.queryByRole('link')).toBeNull()
    await expect(d.queryByText('Recent visits')).toBeNull()
    await expect(d.queryByText('Price')).toBeNull()
  },
}

/** A phone booking of a client who may only book by phone. */
export const ByPhonePhoneOnly: Story = {
  args: {
    server: fakeApi({
      booking: booking({ source: 'phone' }),
      card: card({ settings: { phoneOnly: true, phoneOnlyByCount: true, noReminders: false } }),
    }),
  },
  play: async () => {
    const d = within(await open())
    await expect(d.getByText('By phone')).toBeVisible()
    await expect(await d.findByText('Phone only')).toBeVisible()
  },
}

/** A completed visit: no internal status, no move; the visits list its earlier ones. */
export const Completed: Story = {
  args: {
    routes: { '/': drawer('owner', { move: true }) },
    server: fakeApi({ internal: true, booking: booking({ date: addDays(DAY, -1), status: 'completed' }) }),
  },
  play: async () => {
    const d = within(await open())
    await expect(d.getByText('Completed')).toBeVisible()
    await expect(d.queryByRole('combobox')).toBeNull()
    await expect(d.queryByRole('button', { name: 'Move to another time' })).toBeNull()
  },
}

/** Cancelled by the client: who cancelled where the source was. */
export const Cancelled: Story = {
  args: { server: fakeApi({ booking: booking({ status: 'cancelled', cancelledBy: 'client' }) }) },
  play: async () => {
    const d = within(await open())
    await expect(d.getByText('Cancelled')).toBeVisible()
    await expect(d.getByText('The client cancelled')).toBeVisible()
  },
}

/** Cancelled by the system: nobody answered the request in time. */
export const CancelledNoAnswer: Story = {
  args: { server: fakeApi({ booking: booking({ status: 'cancelled', cancelledBy: 'system' }) }) },
  play: async () => {
    const d = within(await open())
    await expect(d.getByText('Cancelled · no answer in time')).toBeVisible()
  },
}

/** A no-show (B3 puts its report box under the details): the client's facts count it. */
export const NoShow: Story = {
  args: {
    server: fakeApi({ booking: booking({ date: addDays(DAY, -1), status: 'noshow' }), card: card({}, { noShows: 2 }) }),
  },
  play: async () => {
    const d = within(await open())
    await expect(await d.findByText('2 no-shows')).toBeVisible()
    // the badge, and the earlier no-show in the visits
    await expect(d.getAllByText('No-show')).toHaveLength(2)
  },
}

/** A client with no past visits: when she last came isn't known, so «No earlier visits». */
export const FirstVisit: Story = {
  args: { server: fakeApi({ card: card({ history: [] }, { visits: 0, avgCheck: null, lastVisit: null, noShows: 0 }) }) },
  play: async () => {
    const d = within(await open())
    await expect(await d.findByText('No earlier visits')).toBeVisible()
    await expect(d.getByText('0 visits')).toBeVisible()
  },
}

/** A code the reader's calendar doesn't show (a colleague's column for a specialist, or gone). */
export const Gone: Story = {
  args: { server: fakeApi({ gone: true }) },
  play: async () => {
    const d = within(await open())
    await expect(await d.findByRole('status')).toHaveTextContent(/^This booking isn’t in your calendar/)
  },
}

/** On a phone the drawer is a bottom sheet; everything stays in reach. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { server: fakeApi({ internal: true }) },
  play: async () => {
    const d = within(await open())
    await expect(await d.findByText('12 visits · average check 145 TMT')).toBeVisible()
    await expect(d.getByRole('combobox', { name: 'Internal status' })).toBeVisible()
  },
}

/** The words about a third longer (Russian): the captions wrap, the facts and the visits' rows hold. */
export const RussianLength: Story = {
  globals: { text: 'longer' },
  args: { routes: { '/': drawer('owner', { move: true, bookAgain: true }) }, server: fakeApi({ internal: true }) },
  play: async () => {
    // the words are stretched, the title with them
    const d = within(await page.findByRole('dialog'))
    await expect(await d.findByRole('combobox')).toBeVisible()
    await expect(await d.findAllByRole('listitem')).toHaveLength(3)
  },
}
