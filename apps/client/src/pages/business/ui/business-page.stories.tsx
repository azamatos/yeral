/**
 * The business page (Venue, book C-06, C-08–C-11, C-15): the header and photos, the services with their chips and
 * Select, the booking card and its picked services, the phone bar; an example business, the owner's preview, a
 * paused page and a client booked by phone only.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { AYJEMAL, businessApi, GLOW, PageStory } from '@/shared/storybook'
import { BusinessPage } from './business-page'

const routes = {
  '/$lang': () => null,
  '/$lang/b/$slug': BusinessPage,
  '/$lang/b/$slug/book': () => <p>Booking</p>,
}

const meta = {
  title: 'Client/Pages/Business',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes, path: '/en/b/glow-studio', server: businessApi() },
  // the booking card sits beside the page from 1024; the phone stories set their own width
  globals: { viewport: { value: 'xl' } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** Nothing picked: the next free time and Book; picking two services fills the card and its total. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio' })).toBeVisible()
    const card = within(canvas.getByRole('complementary', { name: 'Booking' }))
    await expect(card.getByText(/^Today 15:30$/)).toBeVisible()
    await expect(card.getByRole('link', { name: 'Book' })).toHaveAttribute('href', '/en/b/glow-studio/book')
    await userEvent.click(canvas.getByRole('button', { name: 'Select: Women’s haircut' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Select: Manicure' }))
    await expect(canvas.getByRole('button', { name: 'Selected: Manicure' })).toHaveAttribute('aria-pressed', 'true')
    await expect(card.getByText('Selected services')).toBeVisible()
    await expect(card.getByText('2 services')).toBeVisible()
    await expect(card.getByText('150 TMT')).toBeVisible()
    await expect(card.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/en/b/glow-studio/book?services=s1%2Cs5&step=staff')
    await userEvent.click(card.getByRole('button', { name: 'Remove: Women’s haircut' }))
    await expect(card.getByText('1 service')).toBeVisible()
    await userEvent.click(card.getByRole('button', { name: 'Clear' }))
    await expect(await card.findByText('Next free time')).toBeVisible()
  },
}

/** The group chips filter the list (not scroll): «Nails» leaves only its services. */
export const GroupChips: Story = {
  play: async ({ canvas }) => {
    const chips = within(await canvas.findByRole('group', { name: 'Service groups' }))
    await userEvent.click(chips.getByRole('button', { name: 'Nails' }))
    await expect(chips.getByRole('button', { name: 'Nails' })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('heading', { level: 3, name: 'Nails' })).toBeVisible()
    await expect(canvas.queryByRole('heading', { level: 3, name: 'Hair' })).toBeNull()
  },
}

/** Venue `selection=hidden`: only a price kept for the place picked, the total stays «Price at the place». */
export const HiddenPrice: Story = {
  args: { path: '/en/b/glow-studio?services=s12' },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Booking' }))
    await expect(await card.findByText('1 service')).toBeVisible()
    await expect(card.getAllByText('Price at the place')).toHaveLength(2)
  },
}

/** Venue `selection=mixed`: a price kept for the place beside a fixed one makes the total «from». */
export const MixedPrice: Story = {
  args: { path: '/en/b/glow-studio?services=s12,s2' },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Booking' }))
    await expect(await card.findByText('from 60 TMT')).toBeVisible()
  },
}

/** A first-launch sample (book Q-004): «Example» after the name and the line saying what it is. */
export const Example: Story = {
  args: { server: businessApi({ business: { ...GLOW, example: true, confirmMode: 'instant', typicalConfirmMinutes: null } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: /^Glow Studio\s*,\s*Example$/ })).toBeVisible()
    await expect(canvas.getByText(/This isn’t a real business|This isn't a real business/)).toBeVisible()
    await expect(canvas.getByText('Bookings are confirmed at once')).toBeVisible()
  },
}

/** The owner's own page in review (Venue `ownerPreview`, Q-153): the banner, nothing bookable. */
export const OwnerPreview: Story = {
  args: {
    server: businessApi({ signedIn: AYJEMAL, business: { ...GLOW, preview: { status: 'pending', reason: null }, bookOnline: false } }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Your page is in review/)).toBeVisible()
    const card = within(canvas.getByRole('complementary', { name: 'Booking' }))
    await expect(card.getByRole('button', { name: 'Book' })).toBeDisabled()
  },
}

/** Online booking paused (States 05, C-09): the services without Select, the card to call. */
export const Paused: Story = {
  args: { server: businessApi({ business: { ...GLOW, onlineEnabled: false, bookOnline: false } }) },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Booking' }))
    await expect(card.getByRole('heading', { name: "This place isn't taking online bookings right now" })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Call +993 12 45 67 89' })).toHaveAttribute('href', 'tel:+99312456789')
    await expect(canvas.queryByRole('button', { name: /^Select:/ })).toBeNull()
  },
}

/** A client the business books by phone only (C-11, Venue `restricted`): the call card instead of Book. */
export const PhoneOnly: Story = {
  args: { server: businessApi({ signedIn: AYJEMAL, business: { ...GLOW, bookOnline: false } }) },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Booking' }))
    await expect(card.getByRole('heading', { name: 'You can book this business by phone' })).toBeVisible()
    await expect(canvas.queryByRole('link', { name: 'Book' })).toBeNull()
  },
}

/** Closed now: when it opens next, in grey. */
export const Closed: Story = {
  args: { server: businessApi({ business: { ...GLOW, open: { open: false, inDays: 1, at: 540 } } }) },
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText('Closed · opens tomorrow at 09:00'))[0]).toBeVisible()
  },
}

/** The heart, signed in: saved at once and shown pressed. */
export const Favourite: Story = {
  args: { server: businessApi({ signedIn: AYJEMAL }) },
  play: async ({ canvas }) => {
    const heart = await canvas.findByRole('button', { name: 'Add to favourites' })
    await userEvent.click(heart)
    await waitFor(() => expect(canvas.getByRole('button', { name: 'In your favourites' })).toHaveAttribute('aria-pressed', 'true'))
  },
}

/** Phone (Venue under 768, Mobile 4): the photo first with its count, the bar at the bottom with Book. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Booking' }))
    await expect(bar.getByRole('link', { name: 'Book' })).toBeVisible()
    await expect(canvas.getByLabelText('Photo 1 of 5')).toBeVisible()
  },
}

/** Phone, picked: the bar shows the count, minutes and total beside Continue. */
export const PhonePicked: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { path: '/en/b/glow-studio?services=s1,s5' },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Booking' }))
    await expect(bar.getByText('2 services · 2 h')).toBeVisible()
    await expect(bar.getByRole('link', { name: 'Continue' })).toBeVisible()
  },
}

/** Phone, booked by phone only: the call card first and the bar to call (Mobile 15). */
export const PhoneOnlyPhone: Story = {
  ...PhoneOnly,
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Booking' }))
    await expect(bar.getByRole('link', { name: 'Call +993 12 45 67 89' })).toBeVisible()
  },
}
