/**
 * A search result (C7-Home `VenueResultRow`; Search, a category's page): the photo, the name with its rating, «Category ·
 * distance», whether it's open, the price from, three TimeSlots S and «+N» into the booking; on a phone the 88 photo with
 * the times under it. The service line waits for the api to say which service matched.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { BusinessCard } from '@yeral/contract/catalog'
import { addDays, nowMin, today } from '@yeral/domain/time'
import { expect } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { BusinessRow } from './business-row'

const DAY = today()
/** The pill for a place open until 20:00: amber «Closes at» in the hour before, whenever the stories run. */
const OPEN_UNTIL_20 = /^(Open until|Closes at) 20:00$/
const card = (patch: Partial<BusinessCard> = {}): BusinessCard => ({
  slug: 'barber-loft',
  name: 'Barber Loft',
  example: false,
  category: { id: 'barber', name: 'Barbershop' },
  photo: null,
  rating: 4.9,
  reviewsCount: 96,
  street: 'Magtymguly şaýoly 12',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  geo: { lat: 37.95, lng: 58.39, approximate: false },
  distanceM: 3000,
  bookingType: 'appointment',
  onlineEnabled: true,
  priceFrom: { type: 'from', amount: 80 },
  open: { open: true, until: 1200 },
  availability: { type: 'appointment', date: DAY, starts: [615, 630, 645, 660], more: 29 },
  ...patch,
})

/** One row in the results' column (760 on the board), the searched day today unless said otherwise. */
const row = (c: BusinessCard, from = DAY) => ({
  routes: {
    '/$lang': () => (
      <div className="mx-auto max-w-190 px-8">
        <BusinessRow card={c} from={from} className="border-t border-n-200" />
      </div>
    ),
    '/$lang/b/$slug': () => <p>A business</p>,
    '/$lang/b/$slug/book': () => <p>The booking</p>,
  },
})

const meta = {
  title: 'Client/Search/ResultRow',
  component: PageStory,
  args: row(card()),
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** Open: the green pill, category · distance, the price from, three times and «+30» into the booking on that day. */
export const Open: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'Barber Loft' })).toHaveAttribute('href', '/en/b/barber-loft')
    await expect(canvas.getByText(OPEN_UNTIL_20)).toBeVisible()
    await expect(canvas.getByText(/^Barbershop · 3/)).toBeVisible()
    await expect(canvas.queryByText(/Magtymguly/)).toBeNull()
    await expect(canvas.getByText('from 80 TMT')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Book Barber Loft at 10:15' })).toHaveAttribute(
      'href',
      `/en/b/barber-loft/book?date=${DAY}&time=615`,
    )
    await expect(canvas.getAllByRole('link', { name: /^Book Barber Loft at/ })).toHaveLength(3)
    const more = canvas.getByRole('link', { name: '30 more times' })
    await expect(more).toHaveTextContent('+30')
    await expect(more).toHaveAttribute('href', `/en/b/barber-loft/book?date=${DAY}&step=time`)
  },
}

/** The last hour before closing: the amber «Closes at …». */
export const ClosesSoon: Story = {
  args: row(card({ open: { open: true, until: nowMin() + 30 } })),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Closes at \d{2}:\d{2}$/)).toBeVisible()
  },
}

/** Closed: the grey pill says when it opens; the times are the day's all the same. */
export const Closed: Story = {
  args: row(card({ open: { open: false, inDays: 1, at: 600 } })),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Closed · opens tomorrow at 10:00')).toBeVisible()
    await expect(canvas.getAllByRole('link', { name: /^Book Barber Loft at/ })).toHaveLength(3)
  },
}

/** Without a position the line is the category alone; no rating yet, a photo, no more times than shown. */
export const NoPosition: Story = {
  args: row(
    card({
      distanceM: null,
      rating: null,
      reviewsCount: 0,
      photo: { url: 'https://picsum.photos/seed/barber/400/300', alt: '' },
      availability: { type: 'appointment', date: DAY, starts: [615, 630], more: 0 },
    }),
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Barbershop')).toBeVisible()
    await expect(canvas.getAllByRole('link', { name: /^Book Barber Loft at/ })).toHaveLength(2)
    await expect(canvas.queryByRole('link', { name: /more time/ })).toBeNull()
  },
}

/** A search over the week: the first time of a later day carries its weekday. */
export const AnyTime: Story = {
  args: row(card({ availability: { type: 'appointment', date: addDays(DAY, 2), starts: [615, 630, 645], more: 0 } })),
  play: async ({ canvas }) => {
    const first = await canvas.findByRole('link', { name: /^Book Barber Loft, \w+ 10:15$/ })
    await expect(first).toHaveAttribute('href', `/en/b/barber-loft/book?date=${addDays(DAY, 2)}&time=615`)
    await expect(canvas.getByRole('link', { name: 'Book Barber Loft at 10:30' })).toBeVisible()
  },
}

/** Under 768: the photo 88 square beside the name, the times M 40 under both. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(OPEN_UNTIL_20)).toBeVisible()
    await expect(canvas.getByRole('link', { name: '30 more times' })).toBeVisible()
  },
}
