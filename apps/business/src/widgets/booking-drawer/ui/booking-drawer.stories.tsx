/**
 * The booking drawer — B-Calendar `panel=booking` and `internal` (v0.6 round 3, English), DS-Business BookingDrawer, over
 * a `fetch` that answers like the api: a confirmed booking with the client's facts from the card, the internal status
 * on it, the note saved as it's typed, each status's look, the owner's, an administrator's and a specialist's read,
 * one the reader can't see, a phone, and the Russian length.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Level } from '@yeral/domain/permissions'
import { addDays } from '@yeral/domain/time'
import { expect, fn, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { BookingDrawer } from './booking-drawer'
import { booking, card, CODE, DAY, fakeApi, id, NOW as now, type Call } from './booking-drawer.fixtures'

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
    await expect(d.getByRole('link', { name: 'Open the client’s card' })).toBeVisible()
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
    // no internal statuses switched on, no move offered: no select, no move; the footer holds Report and Cancel booking (B3's stories)
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
const noteCalls: Call[] = []

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
