/**
 * My bookings (Account-Bookings, book C-23–C-26, C-40): Upcoming with a waiting request and its timer, a declined one
 * with offered times (one taken), an expired one with free times, a waiting move; Past with a completed visit and the
 * client's own cancel with Undo; the empty tabs; the phone.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { myBookingsApi, PageStory } from '@/shared/storybook'
import { MyBookingsPage } from './my-bookings-page'

const routes = {
  '/$lang': () => null,
  '/$lang/b/$slug': () => <p>Business page</p>,
  '/$lang/account/bookings': MyBookingsPage,
}

const meta = {
  title: 'Client/Pages/MyBookings',
  component: PageStory,
  parameters: { layout: 'padded' },
  args: { routes, path: '/en/account/bookings', server: myBookingsApi() },
  globals: { viewport: { value: 'xl' } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** Upcoming: the request's timer, the declined one's reason and offered times; a tap asks, Book takes it. */
export const Upcoming: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'My bookings' })).toBeVisible()
    await expect(await canvas.findByText('The business declined')).toBeVisible()
    await expect(canvas.getByText("Reason: This time isn't free")).toBeVisible()
    await expect(canvas.getByText('No answer in time')).toBeVisible()
    await expect(canvas.getByText(/didn't answer in time/)).toBeVisible()
    await expect(canvas.getByText(/New time requested:/)).toBeVisible()
    await expect(canvas.getByRole('timer')).toBeVisible()
    await expect(canvas.getByText('Already taken')).toBeVisible()
    await userEvent.click(canvas.getAllByRole('button', { name: /^Book .* 10:00–11:00$/ })[0]!)
    const ask = within(await within(document.body).findByRole('dialog'))
    // the popover may still be fading in
    await waitFor(() => expect(ask.getByText(/book this time\?$/)).toBeVisible())
    await userEvent.click(ask.getByRole('button', { name: 'Book' }))
    const booked = await within(document.body).findByText(/^Booked: /)
    await waitFor(() => expect(booked).toBeVisible())
  },
}

/** Past: a completed visit with Book again, and the client's own cancel with Undo. */
export const Past: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('tab', { name: 'Past' }))
    await expect(await canvas.findByText('You cancelled')).toBeVisible()
    await expect(canvas.getAllByRole('link', { name: 'Book again' })[0]).toHaveAttribute('href', '/en/b/glow-studio')
    await userEvent.click(canvas.getByRole('button', { name: 'Undo' }))
    const back = await within(document.body).findByText('Your booking is back')
    await waitFor(() => expect(back).toBeVisible())
  },
}

/** No bookings yet: the empty Upcoming with the way to a place. */
export const Empty: Story = {
  args: { server: myBookingsApi({ lists: { upcoming: [], past: [] } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No upcoming bookings')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Find a place' })).toHaveAttribute('href', '/en')
  },
}

/** Phone: the rows stack their price and actions under the text. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('The business declined')).toBeVisible()
  },
}
