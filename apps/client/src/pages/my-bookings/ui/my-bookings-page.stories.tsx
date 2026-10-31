/**
 * My bookings (Account-Bookings, book C-23–C-26, C-40): Upcoming with a waiting request, a declined one with offered
 * times (one taken), an expired one with free times, a waiting move, Call; Past with a completed visit, the client's own
 * cancel with Undo and a phone booking whose offered time has passed; an offered time just taken; Undo refused; the
 * «How was it?» card (F-243: its stars open the form, sent the row says «You rated»; closed for good), a reviewed row
 * with «Edit the review», the review refused (the booking read again); the tabs' counts; the empty tabs; the phone;
 * the page with words a third longer.
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
type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']

/**
 * Upcoming: the waiting request, the declined one's reason and offered times; a tap asks, Book takes it. Each tab
 * carries how many bookings it holds (the list's `total`), the count part of its name.
 */
export const Upcoming: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'My bookings' })).toBeVisible()
    await expect(await canvas.findByRole('tab', { name: 'Upcoming 5' })).toHaveAttribute('aria-selected', 'true')
    await expect(await canvas.findByRole('tab', { name: 'Past 4' })).toBeVisible()
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
    await userEvent.click(await canvas.findByRole('tab', { name: 'Past 4' }))
    await expect(await canvas.findByText('You cancelled')).toBeVisible()
    await expect(canvas.getAllByRole('link', { name: 'Book again' })[0]).toHaveAttribute('href', '/en/b/glow-studio')
    await expect(canvas.getByText('The offered times have passed')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Choose another time' })).toHaveAttribute('href', '/en/b/barber-loft')
    await expect(canvas.getByRole('img', { name: 'Booked by phone' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /^Undo Glow Studio, / }))
    const back = await within(document.body).findByText('Your booking is back')
    await waitFor(() => expect(back).toBeVisible())
  },
}

/** A visit to review: «Write a review» opens the form; sent, it thanks and the focus is back on the row. */
export const WriteAReview: Story = {
  args: { path: '/en/account/bookings?tab=past' },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^Write a review Glow Studio, / }))
    const form = within(await within(document.body).findByRole('dialog', { name: 'How was it?' }))
    await waitFor(() => expect(form.getByRole('radiogroup', { name: 'Rating' })).toBeVisible())
    await userEvent.click(form.getByRole('radio', { name: '5 stars' }))
    await userEvent.click(form.getByRole('button', { name: 'Send review' }))
    const thanks = await within(document.body).findByText('Thank you! Your review is published.')
    await waitFor(() => expect(thanks).toBeVisible())
    const row = canvas.getAllByRole('link', { name: /^Glow Studio, .*: open the booking$/ })
    await waitFor(() => expect(row.some((r) => r === document.activeElement)).toBe(true))
  },
}

/** The «How was it?» card (F-243) over the list; the card's section, named by its title. */
const card = async (canvas: Canvas) => within(await canvas.findByRole('region', { name: 'How was it?' }))

/**
 * The «How was it?» card asks about the latest completed visit without a review: a star pressed opens the form with it
 * picked; sent, the card goes and the visit's row says «★ 5 · You rated» with «Edit the review».
 */
export const HowWasIt: Story = {
  args: { path: '/en/account/bookings?tab=past' },
  play: async ({ canvas }) => {
    const ask = await card(canvas)
    await expect(ask.getByText('Glow Studio')).toBeVisible()
    await expect(ask.getByText(/^Women’s haircut · Aýna · \w{3}, \d+ \w{3}$/)).toBeVisible()
    await expect(ask.getByRole('button', { name: 'Close' })).toBeVisible()
    await userEvent.click(ask.getByRole('radio', { name: '5 stars' }))
    const form = within(await within(document.body).findByRole('dialog', { name: 'How was it?' }))
    await expect(form.getByRole('radio', { name: '5 stars' })).toBeChecked()
    await expect(form.getByRole('button', { name: 'Send review' })).toBeEnabled()
    // the story before may have thanked moments ago (a toast lives 4–6 s): this send adds one more
    const thanked = within(document.body).queryAllByText('Thank you! Your review is published.').length
    await userEvent.click(form.getByRole('button', { name: 'Send review' }))
    await waitFor(() => expect(within(document.body).getAllByText('Thank you! Your review is published.')).toHaveLength(thanked + 1))
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'How was it?' })).toBeNull())
    const edit = await canvas.findByRole('button', { name: /^Edit the review Glow Studio, / })
    await expect(edit).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /^Write a review / })).toBeNull()
    // Glow Studio's row now, Barber Loft's already
    await expect(canvas.getAllByRole('img', { name: 'You rated it 5 out of 5' })).toHaveLength(2)
  },
}

/** The cross closes the card for good for that visit (one tap, no «Later»); the row still offers «Write a review». */
export const HowWasItClosed: Story = {
  args: { path: '/en/account/bookings?tab=past' },
  play: async ({ canvas }) => {
    const ask = await card(canvas)
    await userEvent.click(ask.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'How was it?' })).toBeNull())
    await expect(canvas.getByRole('button', { name: /^Write a review Glow Studio, / })).toBeVisible()
  },
}

/** A reviewed visit: «★ 5 · You rated» in the row; «Edit the review» changes it while it may (C-35, 7 days). */
export const Reviewed: Story = {
  args: { path: '/en/account/bookings?tab=past' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('img', { name: 'You rated it 5 out of 5' })).toHaveTextContent('5 · You rated')
    await userEvent.click(canvas.getByRole('button', { name: /^Edit the review Barber Loft, / }))
    const form = within(await within(document.body).findByRole('dialog', { name: 'How was it?' }))
    await waitFor(() => expect(form.getByRole('radio', { name: '5 stars' })).toBeChecked())
    await expect(form.getByRole('button', { name: 'On time' })).toHaveAttribute('aria-pressed', 'true')
    const save = form.getByRole('button', { name: 'Save changes' })
    await expect(save).toBeDisabled()
    await userEvent.click(form.getByRole('radio', { name: '4 stars' }))
    await userEvent.click(save)
    const changed = await within(document.body).findByText('Your review is changed.')
    await waitFor(() => expect(changed).toBeVisible())
    await expect(await canvas.findByRole('img', { name: 'You rated it 4 out of 5' })).toHaveTextContent('4 · You rated')
  },
}

/**
 * The review refused (its 30 days passed meanwhile): the form closes with the reason, and the booking read again no
 * longer offers a review, in the row or on the card.
 */
export const ReviewRefused: Story = {
  args: { path: '/en/account/bookings?tab=past', server: myBookingsApi({ refuseReview: 'review_window_passed' }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^Write a review Glow Studio, / }))
    const form = within(await within(document.body).findByRole('dialog', { name: 'How was it?' }))
    await waitFor(() => expect(form.getByRole('radiogroup', { name: 'Rating' })).toBeVisible())
    await userEvent.click(form.getByRole('radio', { name: '5 stars' }))
    await userEvent.click(form.getByRole('button', { name: 'Send review' }))
    const why = await within(document.body).findByText('Reviews can be written up to 30 days after the visit.')
    await waitFor(() => expect(why).toBeVisible())
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(canvas.queryByRole('button', { name: /^Write a review / })).toBeNull())
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'How was it?' })).toBeNull())
  },
}

/** Undo refused (the time went to someone else): said in the row with the way to another time, Undo gone. */
export const UndoRefused: Story = {
  args: { path: '/en/account/bookings?tab=past', server: myBookingsApi({ refuse: 'slot_taken' }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^Undo Glow Studio, / }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent("Couldn't undo — this time was already given to another client.")
    await expect(canvas.queryByRole('button', { name: /^Undo / })).toBeNull()
  },
}

/** No bookings yet: the empty Upcoming with the way to a place; the tabs count 0 (Account-Bookings draws every count). */
export const Empty: Story = {
  args: { server: myBookingsApi({ lists: { upcoming: [], past: [] } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No upcoming bookings')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Find a place' })).toHaveAttribute('href', '/en')
    await expect(await canvas.findByRole('tab', { name: 'Upcoming 0' })).toBeVisible()
    await expect(await canvas.findByRole('tab', { name: 'Past 0' })).toBeVisible()
  },
}

/**
 * The page with words a third longer (Storybook's «Text: Russian length») on a phone: the rows' «Call» keeps the word
 * it shows in its name (axe's label-content-name-mismatch fails the story otherwise), the counts stay numbers, and
 * nothing overflows 390.
 */
export const LongWords: Story = {
  globals: { viewport: { value: 'xs' }, text: 'longer' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^The business declined/)).toBeVisible()
    await expect(await canvas.findByRole('tab', { name: /^Upcoming\b.* 5$/ })).toBeVisible()
    await expect(await canvas.findByRole('tab', { name: /^Past\b.* 4$/ })).toBeVisible()
    const call = canvas.getAllByRole('link', { name: /^Call\b.*Glow Studio/ })[0]!
    await expect(call).toHaveAttribute('href', 'tel:+99312456789')
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
  },
}

/** Past with words a third longer: Undo, «Write a review» and «Edit the review» keep their words in their names too. */
export const LongWordsPast: Story = {
  args: { path: '/en/account/bookings?tab=past' },
  globals: { viewport: { value: 'xs' }, text: 'longer' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /^Undo\b.*Glow Studio/ })).toBeVisible()
    await expect(canvas.getByRole('button', { name: /^Write a review\b.*Glow Studio/ })).toBeVisible()
    await expect(canvas.getByRole('button', { name: /^Edit the review\b.*Barber Loft/ })).toBeVisible()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth)
  },
}

/** Phone: the card's stars and word wrap within 390; the rows stack their price and actions under the text. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('The business declined')).toBeVisible()
    await expect((await card(canvas)).getByRole('radio', { name: '5 stars' })).toBeVisible()
  },
}
