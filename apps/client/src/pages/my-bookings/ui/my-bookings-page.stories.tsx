/**
 * My bookings (Account-Bookings, book C-23–C-26, C-40): Upcoming with a waiting request, a declined one with offered
 * times (one taken), an expired one with free times, a waiting move, Call; Past with a completed visit, the client's own
 * cancel with Undo and a phone booking whose offered time has passed; an offered time just taken; Undo refused; the
 * empty tabs; the phone.
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

/** Upcoming: the waiting request, the declined one's reason and offered times; a tap asks, Book takes it. */
export const Upcoming: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'My bookings' })).toBeVisible()
    await expect(await canvas.findByText('The business declined')).toBeVisible()
    await expect(canvas.getByText("Reason: This time isn't free")).toBeVisible()
    await expect(canvas.getByText('No answer in time')).toBeVisible()
    await expect(canvas.getByText(/didn't answer in time/)).toBeVisible()
    await expect(canvas.getByText(/New time requested:/)).toBeVisible()
    await expect(canvas.getByText('Waiting for the business to confirm')).toBeVisible()
    await expect(canvas.getByText('Already taken')).toBeVisible()
    await expect(canvas.getAllByRole('link', { name: 'Call Glow Studio' })[0]).toHaveAttribute('href', 'tel:+99312456789')
    await userEvent.click(canvas.getAllByRole('button', { name: /^Book .* 10:00–11:00$/ })[0]!)
    const ask = within(await within(document.body).findByRole('dialog'))
    // the popover may still be fading in
    await waitFor(() => expect(ask.getByText(/book this time\?$/)).toBeVisible())
    await userEvent.click(ask.getByRole('button', { name: 'Book' }))
    const booked = await within(document.body).findByText(/^Booked: /)
    await waitFor(() => expect(booked).toBeVisible())
  },
}

/** An offered time someone took a moment before: the toast says so and the list is read again. */
export const OfferJustTaken: Story = {
  args: { server: myBookingsApi({ refuse: 'slot_taken' }) },
  play: async ({ canvas }) => {
    await userEvent.click((await canvas.findAllByRole('button', { name: /^Book .* 10:00–11:00$/ }))[0]!)
    const ask = within(await within(document.body).findByRole('dialog'))
    await waitFor(() => expect(ask.getByRole('button', { name: 'Book' })).toBeVisible())
    await userEvent.click(ask.getByRole('button', { name: 'Book' }))
    const gone = await within(document.body).findByText('This time was just taken. Pick another one.')
    await waitFor(() => expect(gone).toBeVisible())
  },
}

/** Past: a completed visit with Book again, the client's own cancel with Undo, an offered time that has passed. */
export const Past: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('tab', { name: 'Past' }))
    await expect(await canvas.findByText('You cancelled')).toBeVisible()
    await expect(canvas.getAllByRole('link', { name: 'Book again' })[0]).toHaveAttribute('href', '/en/b/glow-studio')
    await expect(canvas.getByText('The offered times have passed')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Choose another time' })).toHaveAttribute('href', '/en/b/barber-loft')
    await expect(canvas.getByRole('img', { name: 'Booked by phone' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /^Undo: Glow Studio, / }))
    const back = await within(document.body).findByText('Your booking is back')
    await waitFor(() => expect(back).toBeVisible())
  },
}

/** A visit to review: «Write a review» opens the review form over the list. */
export const WriteAReview: Story = {
  args: { path: '/en/account/bookings?tab=past' },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^Write a review: Glow Studio, / }))
    const form = await within(document.body).findByRole('dialog', { name: 'How was it?' })
    await waitFor(() => expect(form).toBeVisible())
  },
}

/** Undo refused (the time went to someone else): said in the row with the way to another time, Undo gone. */
export const UndoRefused: Story = {
  args: { path: '/en/account/bookings?tab=past', server: myBookingsApi({ refuse: 'slot_taken' }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^Undo: Glow Studio, / }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent("Couldn't undo — this time was already given to another client.")
    await expect(canvas.queryByRole('button', { name: /^Undo: / })).toBeNull()
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
