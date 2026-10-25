/**
 * A booking in the drawer over My bookings (Account-Bookings `.drw`, book C-28–C-31): a request waiting (its note
 * edited, then cancelled with a reason and Undo), a move waiting and withdrawn, a declined one with offered times, one
 * past its free cancel (Call), a move the business refused, a code not in the account, opening and closing it from
 * the list, the phone's bottom sheet.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useParams } from '@tanstack/react-router'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { MY_BOOKINGS, myBookingsApi, PageStory } from '@/shared/storybook'
import { BookingDrawer } from './booking-drawer'
import { MyBookingsPage } from './my-bookings-page'

// the list with the drawer over it in one route, so the list stays as the drawer opens and closes (the app's child route)
function ListAndDrawer() {
  const { code } = useParams({ strict: false })
  return (
    <>
      <MyBookingsPage />
      {code && <BookingDrawer />}
    </>
  )
}
const routes = {
  '/$lang': () => null,
  '/$lang/b/$slug': () => <p>Business page</p>,
  '/$lang/account/bookings/{-$code}': ListAndDrawer,
}
const body = within(document.body)
const drawer = async () => within(await body.findByRole('dialog'))
/** A toast, once it has faded in. */
const toasted = async (text: string | RegExp) => {
  const toast = await body.findByText(text)
  await waitFor(() => expect(toast).toBeVisible())
}

const meta = {
  title: 'Client/Pages/BookingDrawer',
  component: PageStory,
  parameters: { layout: 'padded' },
  args: { routes, path: '/en/account/bookings/YR-48213', server: myBookingsApi() },
  globals: { viewport: { value: 'xl' } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** A request waiting: its history, details and note; the note edited and saved; then cancelled with a reason, and Undo. */
export const Pending: Story = {
  play: async () => {
    const d = await drawer()
    await expect(await d.findByText('Waiting for the business to confirm')).toBeVisible()
    const steps = within(d.getByRole('list', { name: 'Booking status' }))
    await expect(steps.getByText('Sent')).toBeVisible()
    await expect(steps.getByText('Waiting for confirmation')).toBeVisible()
    await expect(d.getByText('YR-48213')).toBeVisible()
    await expect(d.getByText('No note')).toBeVisible()
    await expect(d.getByRole('link', { name: 'Glow Studio' })).toHaveAttribute('href', '/en/b/glow-studio')
    await userEvent.click(d.getByRole('button', { name: 'Edit the note' }))
    await userEvent.type(d.getByRole('textbox', { name: 'Your note for the business' }), 'Short, please')
    await userEvent.click(d.getByRole('button', { name: 'Save' }))
    await toasted('The note is saved')
    await expect(await d.findByText('Short, please')).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Cancel the booking' }))
    const ask = within(await body.findByRole('dialog', { name: 'Cancel the booking?' }))
    await userEvent.click(ask.getByRole('button', { name: 'My plans changed' }))
    await expect(ask.getByRole('button', { name: 'My plans changed' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(ask.getByRole('button', { name: 'Yes, cancel' }))
    // the drawer closes; the toast's Undo brings the booking back
    await toasted('The booking is cancelled')
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await userEvent.click(body.getByRole('button', { name: 'Undo' }))
    await toasted('Your booking is back')
  },
}

/** Opened again after the client's own cancel: who cancelled and why, Undo and Book again. */
export const CancelledByYou: Story = {
  args: {
    path: '/en/account/bookings/YR-48150?tab=past',
    server: myBookingsApi({ details: { 'YR-48150': { cancelReason: 'My plans changed' } } }),
  },
  play: async () => {
    const d = await drawer()
    // the status line and its step in the history
    await expect(await d.findAllByText('You cancelled')).toHaveLength(2)
    await expect(d.getByText('Reason: My plans changed')).toBeVisible()
    await expect(d.getByRole('button', { name: 'Undo' })).toBeVisible()
    await expect(d.getByRole('link', { name: 'Book again' })).toHaveAttribute('href', '/en/b/glow-studio')
  },
}

/** A move waiting: the box with the two times; withdrawn, it goes. */
export const MoveWaiting: Story = {
  args: { path: '/en/account/bookings/YR-48190' },
  play: async () => {
    const d = await drawer()
    const move = within(await d.findByRole('region', { name: 'Move request' }))
    await expect(move.getByText('Your current time stays until the business confirms.')).toBeVisible()
    await userEvent.click(move.getByRole('button', { name: 'Withdraw the request' }))
    await toasted('The move request is withdrawn')
    await waitFor(() => expect(d.queryByRole('region', { name: 'Move request' })).toBeNull())
  },
}

/** Declined with offered times (one taken): a tap books one and the drawer goes on to it; «Choose another time» goes to the page. */
export const Declined: Story = {
  args: { path: '/en/account/bookings/YR-48230' },
  play: async () => {
    const d = await drawer()
    await expect(await d.findByText("Reason: This time isn't free")).toBeVisible()
    await expect(d.getByRole('link', { name: 'Choose another time' })).toHaveAttribute('href', '/en/b/glow-studio')
    await userEvent.click(within(d.getByRole('group', { name: 'Offered times' })).getAllByRole('button')[0]!)
    const ask = within(await body.findByRole('dialog', { name: /book this time\?$/ }))
    await waitFor(() => expect(ask.getByRole('button', { name: 'Book' })).toBeVisible())
    await userEvent.click(ask.getByRole('button', { name: 'Book' }))
    await toasted(/^Booked: /)
    const made = await drawer()
    await expect(await made.findByText('YR-48231')).toBeVisible()
    await expect(made.getByText(/^Confirmed · /)).toBeVisible()
  },
}

/** Undo refused (the time went to someone else): said in the drawer with the way to another time, Undo gone. */
export const UndoRefused: Story = {
  args: { path: '/en/account/bookings/YR-48150?tab=past', server: myBookingsApi({ refuse: 'slot_taken' }) },
  play: async () => {
    const d = await drawer()
    await userEvent.click(await d.findByRole('button', { name: 'Undo' }))
    await expect(await d.findByRole('alert')).toHaveTextContent("Couldn't undo — this time was already given to another client.")
    await expect(d.queryByRole('button', { name: 'Undo' })).toBeNull()
    await expect(d.getByRole('link', { name: 'Choose another time' })).toHaveAttribute('href', '/en/b/glow-studio')
  },
}

/** Past its free cancel: no Cancel, the note to call with the number. */
export const PastFreeCancel: Story = {
  args: {
    path: '/en/account/bookings/YR-48205',
    server: myBookingsApi({
      details: {
        'YR-48205': {
          cancelDeadline: Date.now() - 60_000,
          actions: { ...MY_BOOKINGS.upcoming[4]!.actions, cancel: false, reschedule: false },
        },
      },
    }),
  },
  play: async () => {
    const d = await drawer()
    await expect(await d.findByText('The time to cancel has passed: call the business.')).toBeVisible()
    await expect(d.queryByRole('button', { name: 'Cancel the booking' })).toBeNull()
    await expect(d.getByRole('link', { name: 'Call · +993 12 33 44 55' })).toHaveAttribute('href', 'tel:+99312334455')
    await expect(d.getByRole('link', { name: /^Call Barber Loft: / })).toBeVisible()
  },
}

/** The business refused the new time: the booking keeps its own, with the reason. */
export const MoveRefused: Story = {
  args: {
    path: '/en/account/bookings/YR-48205',
    server: myBookingsApi({
      details: {
        'YR-48205': { moveRefused: { date: '2026-10-30', start: 600, end: 630, by: 'business', reason: 'slot_busy', text: null } },
      },
    }),
  },
  play: async () => {
    const d = await drawer()
    await expect(await d.findByText("The new time wasn't accepted: your booking stays at its time.")).toBeVisible()
    await expect(d.getByText("Reason: This time isn't free")).toBeVisible()
  },
}

/** A code not in this account says so. */
export const NotFound: Story = {
  args: { path: '/en/account/bookings/YR-10000' },
  play: async () => {
    const d = await drawer()
    await expect(await d.findByText("This booking isn't in your account.")).toBeVisible()
  },
}

/** The row opens its booking over the list; Close goes back to the list, the focus back to the row. */
export const FromTheList: Story = {
  args: { path: '/en/account/bookings' },
  play: async ({ canvas }) => {
    const row = (await canvas.findAllByRole('link', { name: /^Barber Loft, .*: open the booking$/ }))[0]!
    await userEvent.click(row)
    const d = await drawer()
    await expect(await d.findByText('YR-48241')).toBeVisible()
    await userEvent.click(d.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(row).toHaveFocus())
  },
}

/** Phone: the drawer is a bottom sheet. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async () => {
    const d = await drawer()
    await expect(await d.findByText('Waiting for the business to confirm')).toBeVisible()
  },
}
