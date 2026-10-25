/**
 * The business page (Venue, book C-06–C-11, C-15): the header and photos, the services with their chips and Select,
 * the booking card and its picked services, the phone bar; the section nav, specialists, reviews (a page at a time),
 * About (hours, map, rules) and the places nearby; an example business, the owner's preview, a paused page and a
 * client booked by phone only.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { today } from '@yeral/domain/time'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { AYJEMAL, businessApi, GLOW, PageStory, REVIEWS } from '@/shared/storybook'
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
    await expect(within(canvas.getByRole('complementary', { name: 'Booking' })).getByText('Bookings are confirmed at once')).toBeVisible()
    // About says so too, without a wait
    const about = within(canvas.getByRole('region', { name: 'About' }))
    await expect(about.getByText('Bookings are confirmed at once')).toBeVisible()
    await expect(about.getByText(/Your time is set as soon as you book/)).toBeVisible()
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
    // the specialists' times as clients will see them, their Book off too
    const team = within(canvas.getByRole('region', { name: 'Specialists' }))
    await expect(team.getAllByText('Next free:')).toHaveLength(4)
    for (const book of team.getAllByRole('button', { name: 'Book' })) await expect(book).toBeDisabled()
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
    // the specialists without a time or Book
    const team = within(canvas.getByRole('region', { name: 'Specialists' }))
    await expect(team.getByText('Aýna')).toBeVisible()
    await expect(team.queryByText('Next free:')).toBeNull()
    await expect(team.queryByRole('link', { name: /^Book/ })).toBeNull()
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

/** Closed today for a special day (States 06): its name on the card, when it opens next in grey. */
export const Closed: Story = {
  args: {
    server: businessApi({
      business: { ...GLOW, open: { open: false, inDays: 1, at: 540 }, specialDays: [{ date: today(), name: 'Holiday', hours: null }] },
    }),
  },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Booking' }))
    await expect(card.getByText(/Closed today · Holiday/)).toBeVisible()
    await expect(card.getByText('Closed · opens tomorrow at 09:00')).toBeVisible()
    // the hours table's today says so too
    const hours = within(canvas.getByRole('region', { name: 'About' }))
    await expect(hours.getByText('Today').closest('div')).toHaveTextContent(/Today\s*Closed · Holiday$/)
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
    await expect(canvas.getByText('Photo 1 of 5')).toBeInTheDocument()
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

/** Laptop 1024 (Venue: the aside from 1024): the booking card beside the services, no bar. */
export const Laptop: Story = {
  globals: { viewport: { value: 'md' } },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Booking' }))
    await expect(card.getByRole('link', { name: 'Book' })).toBeVisible()
    await expect(canvas.queryByRole('region', { name: 'Booking' })).toBeNull()
  },
}

/** The section nav (Venue `.tabs`): a press scrolls to the part, moves the focus into it and underlines it. */
export const SectionNav: Story = {
  play: async ({ canvas }) => {
    const nav = within(await canvas.findByRole('navigation', { name: 'Sections' }))
    const links = nav.getAllByRole('link')
    await expect(links.map((l) => l.textContent)).toEqual(['Services', 'Specialists', 'Reviews', 'About'])
    await expect(nav.getByRole('link', { name: 'Services' })).toHaveAttribute('aria-current', 'true')
    await expect(nav.getByRole('link', { name: 'Reviews' })).toHaveAttribute('href', '#reviews')
    await userEvent.click(nav.getByRole('link', { name: 'Reviews' }))
    await waitFor(() => expect(canvas.getByRole('region', { name: 'Reviews' })).toHaveFocus())
    await waitFor(() => expect(nav.getByRole('link', { name: 'Reviews' })).toHaveAttribute('aria-current', 'true'))
    // About, last and too short to reach the nav, is current once the page can't scroll further
    await userEvent.click(nav.getByRole('link', { name: 'About' }))
    await waitFor(() => expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('aria-current', 'true'))
    // the header's «96 reviews» leads there too
    await userEvent.click(canvas.getByRole('link', { name: '96 reviews' }))
    await waitFor(() => expect(canvas.getByRole('region', { name: 'Reviews' })).toHaveFocus())
  },
}

/** Venue «Hünärmenler»: a card each with the next free time (none soon for one) and Book with them chosen. */
export const Specialists: Story = {
  play: async ({ canvas }) => {
    const team = within(await canvas.findByRole('region', { name: 'Specialists' }))
    const cards = team.getAllByRole('listitem')
    await expect(cards).toHaveLength(4)
    await expect(cards[0]).toHaveTextContent(/Aýna\s*Stylist\s*4\.9\s*Next free:\s*Today 15:30\s*Book/)
    await expect(cards[2]).toHaveTextContent(/Tomorrow 10:00/)
    await expect(cards[3]).toHaveTextContent(/No free times soon/)
    await expect(team.getByRole('link', { name: 'Book with Aýna' })).toHaveAttribute('href', '/en/b/glow-studio/book?staff=st-ayna')
  },
}

/** Services picked on the page go with a specialist's Book, to the specialist step (as the card's Continue). */
export const SpecialistsPicked: Story = {
  args: { path: '/en/b/glow-studio?services=s1' },
  play: async ({ canvas }) => {
    const team = within(await canvas.findByRole('region', { name: 'Specialists' }))
    await expect(team.getByRole('link', { name: 'Book with Aýna' })).toHaveAttribute(
      'href',
      '/en/b/glow-studio/book?services=s1&step=staff&staff=st-ayna',
    )
  },
}

/**
 * Venue «Teswirler» (C-07): the average, count and bars beside the newest reviews; the reported one with Ýeral's line
 * (and in none of the numbers), the business's reply, who may rate. One page: no «All reviews».
 */
export const Reviews: Story = {
  play: async ({ canvas }) => {
    const reviews = within(await canvas.findByRole('region', { name: 'Reviews' }))
    await expect(reviews.getByRole('img', { name: 'Average rating: 4.9 out of 5' })).toBeVisible()
    await expect(reviews.getByText('96 reviews')).toBeVisible()
    await expect(reviews.getByRole('img', { name: '5 stars: 88 reviews' })).toBeVisible()
    await expect(reviews.getByRole('img', { name: '1 star: 0 reviews' })).toBeVisible()
    const items = await reviews.findAllByRole('article')
    await expect(items).toHaveLength(4)
    await expect(items[0]).toHaveTextContent(/Merdan K\.\s*Yesterday/)
    await expect(items[0]).toHaveTextContent('Ýeral is checking this review · not counted in the rating')
    await expect(items[1]).toHaveTextContent(/2 days ago.*Women’s haircut · Aýna/)
    await expect(within(items[1]!).getByText('Reply from Glow Studio')).toBeVisible()
    await expect(items[2]).toHaveTextContent('1 week ago')
    await expect(items[3]).toHaveTextContent('3 weeks ago')
    await expect(within(items[3]!).getByRole('img', { name: 'Rating: 4 out of 5' })).toBeVisible()
    await expect(reviews.getByText('Only clients who booked and came can leave a rating.')).toBeVisible()
    await expect(reviews.queryByRole('button', { name: 'All reviews' })).toBeNull()
  },
}

const MANY = Array.from({ length: 14 }, (_, i) => ({ ...REVIEWS[i % REVIEWS.length]!, id: `r${i + 1}` }))

/** More than a page (12): «All reviews» brings the rest, then goes. */
export const ReviewsPaging: Story = {
  args: { server: businessApi({ reviews: MANY }) },
  play: async ({ canvas }) => {
    const reviews = within(await canvas.findByRole('region', { name: 'Reviews' }))
    await waitFor(() => expect(reviews.getAllByRole('article')).toHaveLength(12))
    await userEvent.click(reviews.getByRole('button', { name: 'All reviews' }))
    await waitFor(() => expect(reviews.getAllByRole('article')).toHaveLength(14))
    await expect(reviews.getByText('14 reviews shown')).toBeInTheDocument()
    await expect(reviews.queryByRole('button', { name: 'All reviews' })).toBeNull()
  },
}

/** No reviews yet (not drawn): the words alone, and who may rate. */
export const NoReviews: Story = {
  args: {
    server: businessApi({
      business: { ...GLOW, rating: null, reviewsCount: 0, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
      reviews: [],
    }),
  },
  play: async ({ canvas }) => {
    const reviews = within(await canvas.findByRole('region', { name: 'Reviews' }))
    await expect(await reviews.findByText('No reviews yet')).toBeVisible()
    await expect(reviews.queryByRole('img', { name: /Average rating/ })).toBeNull()
  },
}

/**
 * Venue «Barada»: the description, the week with today marked, the map and address with Directions and Call, the
 * amenities, the rules and how the business confirms.
 */
export const About: Story = {
  play: async ({ canvas }) => {
    const about = within(await canvas.findByRole('region', { name: 'About' }))
    await expect(about.getByText(/Hair, nails and facial care in one place/)).toBeVisible()
    const days = about.getAllByText(/^\d{2}:\d{2}–\d{2}:\d{2}$|^Closed$/)
    await expect(days).toHaveLength(7)
    await expect(about.getByText('Today')).toBeVisible()
    // the map's pin names the place (placed once the frame knows its size)
    await expect(await about.findByText('Glow Studio', { selector: 'span' })).toBeVisible()
    await expect(about.getByText('Bitarap Türkmenistan avenue 247, Ashgabat, 2nd floor')).toBeVisible()
    await expect(about.getByText('The door beside the shopping centre, lift to the 2nd floor')).toBeVisible()
    await expect(about.getByRole('link', { name: 'Directions' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/dir/?api=1&destination=37.9601,58.3261',
    )
    await expect(about.getByRole('link', { name: 'Call +993 12 45 67 89' })).toHaveAttribute('href', 'tel:+99312456789')
    for (const amenity of ['Wi-Fi', 'Air conditioning', 'Parking', 'Card payment at the place'])
      await expect(about.getByText(amenity)).toBeVisible()
    await expect(about.getByText('You can cancel or change the booking for free up to 2 h before.')).toBeVisible()
    await expect(about.getByText("If you're more than 15 min late, the booking may be cancelled.")).toBeVisible()
    await expect(about.getByText('Pay at the place: cash or card.')).toBeVisible()
    await expect(about.getByText('Usually confirms within 15 min')).toBeVisible()
    await expect(about.getByText(/Glow Studio confirms each booking itself/)).toBeVisible()
  },
}

/** A day to midnight (Venue `hoursCase=midnight`, E1): «09:00–24:00» and «Open now · until 24:00». */
export const Midnight: Story = {
  args: {
    server: businessApi({
      business: { ...GLOW, hours: GLOW.hours.map(() => ({ open: 540, close: 1440, break: null })), open: { open: true, until: 1440 } },
    }),
  },
  play: async ({ canvas }) => {
    // the header's line and the card's
    await expect(await canvas.findAllByText('Open now · until 24:00')).toHaveLength(2)
    const about = within(canvas.getByRole('region', { name: 'About' }))
    await expect(about.getAllByText('09:00–24:00')).toHaveLength(7)
  },
}

/** A home-based business: the approximate circle, no Directions, the address's note. */
export const HomeBased: Story = {
  args: {
    server: businessApi({
      business: {
        ...GLOW,
        hideExactAddress: true,
        floor: null,
        entranceNote: null,
        address: 'Bitarap Türkmenistan avenue',
        geo: { ...GLOW.geo, approximate: true },
      },
    }),
  },
  play: async ({ canvas }) => {
    const about = within(await canvas.findByRole('region', { name: 'About' }))
    await expect(about.getByText(/^Approximate area/)).toBeVisible()
    await expect(about.queryByRole('link', { name: 'Directions' })).toBeNull()
    await expect(about.queryByText('Glow Studio', { selector: 'span' })).toBeNull()
  },
}

const place = (
  slug: string,
  name: string,
  category: string,
  distanceM: number,
  rating: number,
  count: number,
  starts: number[],
  from: number,
) =>
  ({
    slug,
    name,
    example: false,
    category: { id: slug, name: category },
    photo: { url: GLOW.photos[2]!.url, alt: name },
    rating,
    reviewsCount: count,
    street: '',
    city: GLOW.city,
    geo: GLOW.geo,
    distanceM,
    bookingType: 'appointment',
    onlineEnabled: true,
    priceFrom: { type: 'from', amount: from },
    open: { open: true, until: 1200 },
    availability: { type: 'appointment', date: today(), starts, more: 0 },
  }) satisfies (typeof GLOW.similar)[number]

/** Venue «Golaýdaky ýerler»: the nearest places of the kind, each a link card with today's first times and its price. */
export const Nearby: Story = {
  args: {
    server: businessApi({
      business: {
        ...GLOW,
        similar: [
          place('nail-bar-ayna', 'Nail Bar Aýna', 'Nails', 1600, 4.9, 73, [720, 870, 960], 70),
          place('rahat-spa', 'Rahat Spa', 'Spa and massage', 1900, 4.9, 140, [750, 960, 1110], 150),
          place('barber-loft', 'Barber Loft', 'Barbershop', 1200, 4.9, 212, [], 40),
        ],
      },
    }),
  },
  play: async ({ canvas }) => {
    const nearby = within(await canvas.findByRole('region', { name: 'Places nearby' }))
    const cards = nearby.getAllByRole('link')
    await expect(cards).toHaveLength(3)
    await expect(cards[0]).toHaveAttribute('href', '/en/b/nail-bar-ayna')
    await expect(cards[0]).toHaveTextContent(/Nail Bar Aýna\s*Nails · 1\.6 km\s*4\.9\s*\(73\)\s*12:00\s*14:30\s*16:00\s*from 70 TMT/)
    await expect(cards[2]).toHaveTextContent(/Barber Loft.*from 40 TMT/)
  },
}

/** Phone (Mobile 4): the section nav sticks above the parts, 24 apart. */
export const PhoneSections: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const nav = await canvas.findByRole('navigation', { name: 'Sections' })
    await expect(nav).toBeVisible()
    await expect(within(canvas.getByRole('region', { name: 'Specialists' })).getAllByRole('listitem')).toHaveLength(4)
  },
}
