/**
 * The business page (Venue v0.7 · C2, C3, book C-06–C-11, C-15): the cover hero and the phone's bar with Back, the
 * services at scale (the group index, the phone's rail and Groups sheet, the search, one Book per row), the booking
 * card, the phone bar; the tabs as panels: specialists, reviews (a page at a time), About (hours, map, rules) and the
 * places nearby; the owner's preview, a paused page and a client booked by phone only.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { hm, nowMin, today } from '@yeral/domain/time'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { AYJEMAL, businessApi, GLOW, PageStory, REVIEWS } from '@/shared/storybook'
import { BusinessPage } from './business-page'

const routes = {
  '/$lang': () => <p>Home</p>,
  '/$lang/b/$slug': BusinessPage,
  '/$lang/b/$slug/book': () => <p>Booking</p>,
}

// GLOW closes at 20:00: «Open until 20:00», or the amber «Closes at 20:00» when the stories run in its last hour
const OPEN_UNTIL_20 = /^(Open until|Closes at) 20:00$/

type Service = BusinessDetail['serviceGroups'][number]['services'][number]
const service = (id: string, name: string, durationMin: number, price: Service['price'], description: string | null = null): Service => ({
  id,
  name,
  description,
  durationMin,
  price,
  staffIds: ['st-ayna'],
})

/**
 * The board's scale (Venue v0.7 · C3): 100 services in 15 groups (Hair 14, Colouring 9, Nails 12, Brows & lashes 8,
 * Facials 7, Massage 9, Spa 6, Makeup 6, Hair removal 7, Barber 6, Kids 4, Bridal 4, Treatments 5, Packages 2, Other
 * 1); «colour» finds 9 in 3 groups, in names and descriptions alike.
 */
const BIG: BusinessDetail = {
  ...GLOW,
  serviceGroups: (
    [
      ['hair', 'Hair', 14],
      ['colouring', 'Colouring', 9],
      ['nails', 'Nails', 12],
      ['brows', 'Brows & lashes', 8],
      ['facials', 'Facials', 7],
      ['massage', 'Massage', 9],
      ['spa', 'Spa', 6],
      ['makeup', 'Makeup', 6],
      ['removal', 'Hair removal', 7],
      ['barber', 'Barber', 6],
      ['kids', 'Kids', 4],
      ['bridal', 'Bridal', 4],
      ['treatments', 'Treatments', 5],
      ['packages', 'Packages', 2],
      ['other', 'Other', 1],
    ] as const
  ).map(([id, name, count]) => {
    const named: Partial<Record<string, Service[]>> = {
      hair: [service('hair-1', 'Women’s haircut', 60, { type: 'fixed', amount: 80 }, 'Wash, cut and style')],
      // five with «colour» in the name or the description, four without
      colouring: [
        service('col-1', 'Hair colouring', 120, { type: 'from', amount: 250 }, 'Price depends on hair length'),
        service('col-2', 'Roots colouring', 90, { type: 'fixed', amount: 180 }, 'Up to 3 cm of regrowth'),
        service('col-3', 'Toning', 45, { type: 'fixed', amount: 90 }, 'Refreshes the colour between visits'),
        service('col-4', 'Colour correction', 180, { type: 'from', amount: 400 }, 'After colouring at home'),
        service('col-5', 'Balayage', 180, { type: 'from', amount: 450 }, 'Hand-painted colour'),
        service('col-6', 'Highlights', 150, { type: 'from', amount: 300 }),
        service('col-7', 'Gloss', 30, { type: 'fixed', amount: 70 }),
        service('col-8', 'Bleaching', 120, { type: 'from', amount: 200 }),
        service('col-9', 'Ombre', 180, { type: 'from', amount: 400 }),
      ],
      brows: [
        service('brows-1', 'Brow colouring', 20, { type: 'fixed', amount: 40 }),
        service('brows-2', 'Lash colouring', 20, { type: 'fixed', amount: 40 }),
        service('brows-3', 'Brow lamination', 45, { type: 'fixed', amount: 120 }, 'With colouring'),
      ],
      barber: [service('barber-1', 'Beard colouring', 30, { type: 'fixed', amount: 50 })],
      other: [service('other-1', 'Consultation', 15, { type: 'hidden', amount: 0 })],
    }
    const own = named[id] ?? []
    const rest = Array.from({ length: count - own.length }, (_, i) =>
      service(`${id}-${own.length + i + 1}`, `${name} service ${own.length + i + 1}`, 30 + 15 * (i % 4), {
        type: 'fixed',
        amount: 40 + 10 * i,
      }),
    )
    return { id, name, services: [...own, ...rest] }
  }),
}

/** A small business (Venue v0.7 · C3 «6 services in 2 groups — no index, no search»). */
const SMALL: BusinessDetail = {
  ...GLOW,
  serviceGroups: [
    {
      ...GLOW.serviceGroups[1]!,
      services: [...GLOW.serviceGroups[1]!.services, service('s13', 'Nail art', 10, { type: 'fixed', amount: 5 }, 'Per nail')],
    },
    { ...GLOW.serviceGroups[2]! },
  ],
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

/** The card books from the services step; each row's Book opens the booking on the specialist step with its service. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio' })).toBeVisible()
    // the category crumb and the meta line's category open the category page (#18)
    const crumbs = within(canvas.getByRole('navigation', { name: 'You are here' }))
    await expect(crumbs.getByRole('link', { name: 'Beauty salon' })).toHaveAttribute('href', '/en/c/beauty')
    await expect(canvas.getAllByRole('link', { name: 'Beauty salon' })).toHaveLength(1)
    // the state as the cover's StatusPill (amber in the last hour); the hours live once, in About (A7, #19)
    await expect(canvas.getAllByText(OPEN_UNTIL_20)[0]).toBeVisible()
    const card = within(canvas.getByRole('complementary', { name: 'Booking' }))
    await expect(card.queryByText(/09:00–20:00/)).toBeNull()
    await expect(card.getByText(/^Today 15:30$/)).toBeVisible()
    await expect(card.getByRole('link', { name: 'Book' })).toHaveAttribute('href', '/en/b/glow-studio/book')
    // nothing is picked on the page (C3): one Book per row, the group's count in its header
    await expect(canvas.getByRole('link', { name: 'Book Women’s haircut' })).toHaveAttribute(
      'href',
      '/en/b/glow-studio/book?services=s1&step=staff',
    )
    await expect(canvas.queryByRole('button', { name: /^Select/ })).toBeNull()
    await expect(canvas.getByRole('heading', { level: 3, name: 'Nails 3' })).toBeVisible()
    await expect(canvas.getByText('Price at the place')).toBeVisible()
  },
}

/**
 * Services at scale (Venue v0.7 · C3, the owner's #42): 100 services in 15 groups, whole and grouped, the sticky index
 * with «15 groups» and each count; a row of the index jumps to its group and marks it; scrolling marks the group under
 * way.
 */
export const Services: Story = {
  args: { server: businessApi({ business: BIG }) },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('tab', { name: 'Services 100' })).toBeVisible()
    const index = within(canvas.getByRole('navigation', { name: 'Service groups' }))
    await expect(index.getByText('15 groups')).toBeVisible()
    await expect(index.getAllByRole('link')).toHaveLength(15)
    await expect(index.getByRole('link', { name: 'Hair 14' })).toHaveAttribute('aria-current', 'true')
    await expect(canvas.getByRole('heading', { level: 3, name: 'Packages 2' })).toBeInTheDocument()
    await expect(canvas.getAllByRole('link', { name: /^Book / })).toHaveLength(100)
    // a click jumps: the group's header lands under the stuck tab bar (60), the index marks it
    await userEvent.click(index.getByRole('link', { name: 'Nails 12' }))
    const nails = canvas.getByRole('heading', { level: 3, name: 'Nails 12' })
    await waitFor(() => expect(nails.getBoundingClientRect().top).toBeGreaterThanOrEqual(56))
    await expect(nails.getBoundingClientRect().top).toBeLessThan(120)
    await expect(index.getByRole('link', { name: 'Nails 12' })).toHaveAttribute('aria-current', 'true')
    await expect(index.getByRole('link', { name: 'Hair 14' })).not.toHaveAttribute('aria-current')
    // scrolling on marks the group under way (Massage's header just under the bar, Facials gone above it)
    const win = canvasElement.ownerDocument.defaultView!
    const massage = canvas.getByRole('heading', { level: 3, name: 'Massage 9' })
    win.scrollTo({ top: win.scrollY + massage.getBoundingClientRect().top - 56, behavior: 'instant' })
    await waitFor(() => expect(index.getByRole('link', { name: 'Massage 9' })).toHaveAttribute('aria-current', 'true'))
  },
}

/**
 * Searched «colour» (Venue v0.7 · C3 `ServiceSearch`): the matches stay in their groups («5 of 9»), the words in 700,
 * the count line, the index with the matches per group and the groups without any greyed at 0; × clears.
 */
export const ServicesSearch: Story = {
  args: { server: businessApi({ business: BIG }) },
  play: async ({ canvas }) => {
    const search = await canvas.findByRole('searchbox', { name: 'Search 100 services' })
    await userEvent.type(search, 'colour')
    await expect(canvas.getByRole('status')).toHaveTextContent('9 services match “colour” · in 3 groups')
    const index = within(canvas.getByRole('navigation', { name: 'Service groups' }))
    await expect(index.getByText('Matches by group')).toBeVisible()
    await expect(index.getByRole('link', { name: 'Colouring 5' })).toHaveAttribute('aria-current', 'true')
    await expect(index.getByRole('link', { name: 'Hair 0' })).toHaveAttribute('aria-disabled', 'true')
    await expect(canvas.getByRole('heading', { level: 3, name: 'Colouring 5 of 9' })).toBeVisible()
    await expect(canvas.queryByRole('heading', { level: 3, name: /^Hair \d/ })).toBeNull()
    await expect(canvas.getAllByRole('link', { name: /^Book / })).toHaveLength(9)
    // the words in the name and in a description alike
    const marked = canvas.getAllByText(/^colour$/i, { selector: 'b' }).map((b) => b.parentElement?.textContent)
    await expect(marked).toContain('Hair colouring')
    await expect(marked).toContain('Refreshes the colour between visits')
    await userEvent.click(canvas.getByRole('button', { name: 'Clear' }))
    await expect(search).toHaveValue('')
    await expect(canvas.getAllByRole('link', { name: /^Book / })).toHaveLength(100)
    // Esc clears too, from the field
    await userEvent.type(search, 'nails{Escape}')
    await expect(search).toHaveValue('')
  },
}

/** Nothing matches «xyz»: the empty state in place of the list only, the index greyed, Clear search brings the list back. */
export const ServicesNoMatch: Story = {
  args: { server: businessApi({ business: BIG }) },
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole('searchbox', { name: 'Search 100 services' }), 'xyz')
    await expect(canvas.getByRole('status')).toHaveTextContent('No services match')
    await expect(canvas.getByText('Nothing matches “xyz”')).toBeVisible()
    await expect(canvas.getByText('Check the spelling, or clear the search to see all 100 services.')).toBeVisible()
    const index = within(canvas.getByRole('navigation', { name: 'Service groups' }))
    await expect(index.getByRole('link', { name: 'Hair 0' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }))
    await expect(canvas.getAllByRole('link', { name: /^Book / })).toHaveLength(100)
    await expect(canvas.getByRole('searchbox', { name: 'Search 100 services' })).toHaveValue('')
  },
}

/** A small business: 6 services in 2 groups, just the headers and rows, no index, no search. */
export const ServicesSmall: Story = {
  args: { server: businessApi({ business: SMALL }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 3, name: 'Nails 4' })).toBeVisible()
    await expect(canvas.getByRole('heading', { level: 3, name: 'Facial care 2' })).toBeVisible()
    await expect(canvas.queryByRole('navigation', { name: 'Service groups' })).toBeNull()
    await expect(canvas.queryByRole('searchbox')).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Groups' })).toBeNull()
  },
}

/**
 * Phone (Venue v0.7 · 390 `GroupRail`): the search L, the rail of chips with counts under the tabs and «Groups»
 * opening every group in a sheet, the current one ticked; a pick closes it and jumps; a chip jumps too. Book is M.
 */
export const PhoneServices: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { server: businessApi({ business: BIG }) },
  play: async ({ canvas, canvasElement }) => {
    const rail = within(await canvas.findByRole('group', { name: 'Service groups' }))
    await expect(rail.getAllByRole('button')).toHaveLength(15)
    await expect(rail.getByRole('button', { name: 'Hair 14' })).toHaveAttribute('aria-current', 'true')
    await expect(canvas.queryByRole('navigation', { name: 'Service groups' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Groups' }))
    const body = within(canvasElement.ownerDocument.body)
    const sheet = within(await body.findByRole('dialog', { name: 'Groups' }))
    const rows = await sheet.findAllByRole('option')
    await expect(rows).toHaveLength(15)
    await expect(rows[0]).toHaveTextContent('Hair14')
    await expect(rows[0]).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(sheet.getByRole('option', { name: /^Nails/ }))
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(rail.getByRole('button', { name: 'Nails 12' })).toHaveAttribute('aria-current', 'true'))
    // the group's header lands under the bar (56), the tabs (52) and the rail (56)
    const nails = canvas.getByRole('heading', { level: 3, name: 'Nails 12' })
    await waitFor(() => expect(nails.getBoundingClientRect().top).toBeGreaterThanOrEqual(160))
    await expect(nails.getBoundingClientRect().top).toBeLessThan(230)
    await userEvent.click(rail.getByRole('button', { name: 'Spa 6' }))
    await waitFor(() => expect(rail.getByRole('button', { name: 'Spa 6' })).toHaveAttribute('aria-current', 'true'))
    await expect(canvas.getByRole('link', { name: 'Book Spa service 1' })).toHaveAttribute(
      'href',
      '/en/b/glow-studio/book?services=spa-1&step=staff',
    )
  },
}

/** Phone, searched «colour»: the count under the field, the rail with only the groups that match. */
export const PhoneServicesSearch: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { server: businessApi({ business: BIG }) },
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole('searchbox', { name: 'Search 100 services' }), 'colour')
    await expect(canvas.getByRole('status')).toHaveTextContent('9 services match “colour” · in 3 groups')
    const rail = within(canvas.getByRole('group', { name: 'Service groups' }))
    await expect(rail.getAllByRole('button').map((b) => b.textContent)).toEqual(['Colouring5', 'Brows & lashes3', 'Barber1'])
    await userEvent.type(canvas.getByRole('searchbox'), 'xyz')
    await expect(canvas.queryByRole('group', { name: 'Service groups' })).toBeNull()
    await expect(canvas.getByText('Nothing matches “colourxyz”')).toBeVisible()
  },
}

/**
 * The cover (Venue v0.7 · C2, option B): the name, rating, StatusPill and address on the photo, Favourite and Share on
 * it, photos 2–5 as thumbnails; the last opens all the photos.
 */
export const Cover: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio' })).toBeVisible()
    await expect(canvas.getAllByText(OPEN_UNTIL_20)[0]).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Share' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Photo 2 of 5' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'All photos · 5' }))
    const photos = within(await within(canvasElement.ownerDocument.body).findByRole('dialog', { name: 'Photos of Glow Studio' }))
    await waitFor(() => expect(photos.getAllByRole('img')).toHaveLength(5))
    await userEvent.click(photos.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('dialog')).toBeNull())
  },
}

/** No photos yet: no cover, the initial tile and the name on white, Favourite and Share as outline buttons. */
export const NoPhotos: Story = {
  args: { server: businessApi({ business: { ...GLOW, photos: [] } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /^All photos/ })).toBeNull()
    await expect(canvas.getByRole('button', { name: 'Share' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull()
  },
}

/** Phone, no photos: the 56 px bar from the start (Back, the initial, the name, Share, Favourite), the tabs stuck under it. */
export const PhoneNoPhotos: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { server: businessApi({ business: { ...GLOW, photos: [] } }) },
  play: async ({ canvas, canvasElement }) => {
    const title = await canvas.findByRole('heading', { level: 1, name: 'Glow Studio' })
    await expect(title).toBeVisible()
    await expect(title.getBoundingClientRect().height).toBe(24)
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Share' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Beauty salon' })).toBeVisible()
    canvasElement.ownerDocument.defaultView?.scrollTo({ top: 400, behavior: 'instant' })
    await waitFor(() => expect(title.getBoundingClientRect().top).toBeGreaterThanOrEqual(0))
    await expect(canvas.getByRole('tab', { name: /^Services/ }).getBoundingClientRect().top).toBeGreaterThanOrEqual(56)
  },
}

/** One photo: the cover alone, no thumbnails. */
export const OnePhoto: Story = {
  args: { server: businessApi({ business: { ...GLOW, photos: GLOW.photos.slice(0, 1) } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: /^Photo \d of/ })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /^All photos/ })).toBeNull()
  },
}

/** Three photos: two thumbnails, each opening the photos; no «All photos» veil under five. */
export const FewPhotos: Story = {
  args: { server: businessApi({ business: { ...GLOW, photos: GLOW.photos.slice(0, 3) } }) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Photo 3 of 3' }))
    const photos = within(await within(canvasElement.ownerDocument.body).findByRole('dialog', { name: 'Photos of Glow Studio' }))
    await waitFor(() => expect(photos.getAllByRole('img')).toHaveLength(3))
  },
}

/**
 * Phone (Venue v0.7 · 390 «Cover collapse»): no site header, the cover with Back among its round buttons and the
 * identity on it; scrolled 244 px down it has folded into the white 56 px bar with Back, the round photo and the name,
 * the tab bar stuck under it.
 */
export const PhoneCover: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas, canvasElement }) => {
    const title = await canvas.findByRole('heading', { level: 1, name: 'Glow Studio' })
    await expect(canvas.getByRole('link', { name: 'Beauty salon' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Back' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'All photos · 5' })).toBeVisible()
    const fill = canvasElement.ownerDocument.querySelector<HTMLElement>('[data-part="fill"]')
    await waitFor(() => expect(fill?.style.opacity).toBe('0'))
    canvasElement.ownerDocument.defaultView?.scrollTo({ top: 400, behavior: 'instant' })
    await waitFor(() => expect(fill?.style.opacity).toBe('1'))
    // the name on the cover hands over to the one in the bar, after Back and the round photo
    await expect(title.style.opacity).toBe('0')
    const name = canvasElement.ownerDocument.querySelector<HTMLElement>('[data-part="name"]')
    await expect(name?.getBoundingClientRect().left).toBeGreaterThanOrEqual(80)
    await expect(canvas.getByRole('button', { name: 'Back' }).getBoundingClientRect().top).toBe(8)
    await expect(canvas.getByRole('tab', { name: /^Services/ }).getBoundingClientRect().top).toBeGreaterThanOrEqual(56)
  },
}

/** Phone: Back on a page opened first (a shared link) goes Home. */
export const PhoneBack: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Back' }))
    await expect(await canvas.findByText('Home')).toBeVisible()
  },
}

/** A first-launch sample (book Q-004): «Example» after the name and the line saying what it is. */
export const Example: Story = {
  args: {
    path: '/en/b/glow-studio?tab=about',
    server: businessApi({ business: { ...GLOW, example: true, confirmMode: 'instant', typicalConfirmMinutes: null } }),
  },
  play: async ({ canvas }) => {
    // nothing marks it any more (owner's review, #40): no badge in the name, no notice
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio' })).toBeVisible()
    await expect(canvas.queryByText('Example')).toBeNull()
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
    path: '/en/b/glow-studio?tab=specialists',
    server: businessApi({ signedIn: AYJEMAL, business: { ...GLOW, preview: { status: 'pending', reason: null }, bookOnline: false } }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Your page is in review/)).toBeVisible()
    const card = within(canvas.getByRole('complementary', { name: 'Booking' }))
    await expect(card.getByRole('button', { name: 'Book' })).toBeDisabled()
    // the specialists' times as clients will see them, their Book off too, and the services' rows' Book
    const team = within(canvas.getByRole('region', { name: 'Specialists' }))
    await expect(team.getAllByText('Next free:')).toHaveLength(4)
    for (const book of team.getAllByRole('button', { name: 'Book' })) await expect(book).toBeDisabled()
    await userEvent.click(canvas.getByRole('tab', { name: /^Services/ }))
    const services = within(await canvas.findByRole('region', { name: 'Services' }))
    await expect(services.getAllByRole('button', { name: 'Book' })).toHaveLength(12)
    await expect(services.queryByRole('link', { name: /^Book / })).toBeNull()
  },
}

/** Online booking paused (States 05, C-09): the services without Select, the card to call. */
export const Paused: Story = {
  args: {
    path: '/en/b/glow-studio?tab=specialists',
    server: businessApi({ business: { ...GLOW, onlineEnabled: false, bookOnline: false } }),
  },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Booking' }))
    await expect(card.getByRole('heading', { name: "This place isn't taking online bookings right now" })).toBeVisible()
    await expect(card.getByRole('link', { name: 'Call +993 12 45 67 89' })).toHaveAttribute('href', 'tel:+99312456789')
    // the specialists without a time or Book
    const team = within(canvas.getByRole('region', { name: 'Specialists' }))
    await expect(team.getByText('Aýna')).toBeVisible()
    await expect(team.queryByText('Next free:')).toBeNull()
    await expect(team.queryByRole('link', { name: /^Book/ })).toBeNull()
    // the services listed without Book
    await userEvent.click(canvas.getByRole('tab', { name: /^Services/ }))
    await expect(await canvas.findByRole('heading', { level: 3, name: 'Hair 5' })).toBeVisible()
    await expect(canvas.queryByRole('link', { name: /^Book / })).toBeNull()
    await expect(canvas.queryByRole('button', { name: 'Book' })).toBeNull()
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
    path: '/en/b/glow-studio?tab=about',
    server: businessApi({
      business: { ...GLOW, open: { open: false, inDays: 1, at: 540 }, specialDays: [{ date: today(), name: 'Holiday', hours: null }] },
    }),
  },
  play: async ({ canvas }) => {
    const card = within(await canvas.findByRole('complementary', { name: 'Booking' }))
    await expect(card.queryByText(/Closed/)).toBeNull()
    // the StatusPill on the cover and beside About's hours
    await expect(canvas.getAllByText('Closed · opens tomorrow at 09:00')).toHaveLength(2)
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

/**
 * Phone (Venue v0.7 under 768): the photo first with its count, the compact callout at the top of Services, the bar at
 * the bottom with Book, and each row's Book (M) under the name's meta.
 */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('region', { name: 'Booking' }))
    await expect(bar.getByRole('link', { name: 'Book' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'All photos · 5' })).toBeVisible()
    await expect(canvas.getByText('Glow Studio confirms bookings by hand.')).toBeVisible()
    const book = canvas.getByRole('link', { name: 'Book Women’s haircut' })
    await expect(book).toHaveAttribute('href', '/en/b/glow-studio/book?services=s1&step=staff')
    await expect(book.getBoundingClientRect().height).toBe(40)
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

/**
 * The tabs as panels (Venue v0.7 · C2, the owner's #38): Services · Specialists · Reviews · About with their counts; a
 * press opens that panel in place of the last (no scrolling to a section), ← → move along the bar and open the tab.
 */
export const Tabs: Story = {
  play: async ({ canvas }) => {
    const bar = within(await canvas.findByRole('tablist', { name: 'Glow Studio' }))
    await expect(bar.getAllByRole('tab').map((t) => t.textContent?.replace(/\s*\d+/g, ''))).toEqual([
      'Services',
      'Specialists',
      'Reviews',
      'About',
    ])
    await expect(bar.getByRole('tab', { name: /^Services \d+$/ })).toHaveAttribute('aria-selected', 'true')
    await expect(canvas.getByRole('tabpanel', { name: 'Services' })).toBeVisible()
    await userEvent.click(bar.getByRole('tab', { name: 'Reviews 96' }))
    await waitFor(() => expect(canvas.getByRole('tabpanel', { name: 'Reviews' })).toBeVisible())
    await expect(canvas.queryByRole('tabpanel', { name: 'Services' })).toBeNull()
    await expect(bar.getByRole('tab', { name: 'Reviews 96' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowRight}')
    await waitFor(() => expect(bar.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true'))
    await expect(canvas.getByRole('tabpanel', { name: 'About' })).toBeVisible()
    await userEvent.keyboard('{Home}')
    await waitFor(() => expect(canvas.getByRole('tabpanel', { name: 'Services' })).toBeVisible())
    // the cover's «96 reviews» opens the Reviews tab
    await userEvent.click(canvas.getByRole('link', { name: '96 reviews' }))
    await waitFor(() => expect(canvas.getByRole('tabpanel', { name: 'Reviews' })).toBeVisible())
  },
}

/** A link to `?tab=reviews` opens the page on that panel, as the server renders it. */
export const DeepLink: Story = {
  args: { path: '/en/b/glow-studio?tab=reviews' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('tab', { name: 'Reviews 96' })).toHaveAttribute('aria-selected', 'true')
    await expect(canvas.getByRole('tabpanel', { name: 'Reviews' })).toBeVisible()
    await expect(canvas.queryByRole('tabpanel', { name: 'Services' })).toBeNull()
  },
}

/** Venue «Hünärmenler»: a card each with the next free time (none soon for one) and Book with them chosen. */
export const Specialists: Story = {
  args: { path: '/en/b/glow-studio?tab=specialists' },
  play: async ({ canvas }) => {
    const team = within(await canvas.findByRole('region', { name: 'Specialists' }))
    const cards = team.getAllByRole('listitem')
    await expect(cards).toHaveLength(4)
    await expect(cards[0]).toHaveTextContent(/Aýna\s*Stylist\s*4\.9\s*Next free:\s*Today 15:30\s*Book/)
    await expect(cards[2]).toHaveTextContent(/Tomorrow 10:00/)
    await expect(cards[3]).toHaveTextContent(/No free times soon/)
    await expect(team.getByRole('link', { name: 'Book with Aýna' })).toHaveAttribute(
      'href',
      '/en/b/glow-studio/book?staff=st-ayna&first=staff',
    )
  },
}

/**
 * Venue «Teswirler» (C-07): the average, count and bars beside the newest reviews; the reported one with Ýeral's line
 * (and in none of the numbers), the business's reply, who may rate. One page: no «All reviews».
 */
export const Reviews: Story = {
  args: { path: '/en/b/glow-studio?tab=reviews' },
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
  args: {
    path: '/en/b/glow-studio?tab=reviews',
    server: businessApi({ reviews: MANY }),
  },
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
    path: '/en/b/glow-studio?tab=reviews',
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
  args: { path: '/en/b/glow-studio?tab=about' },
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

/** A day to midnight (Venue `hoursCase=midnight`, E1): «09:00–24:00» and «Open until 24:00». */
export const Midnight: Story = {
  args: {
    path: '/en/b/glow-studio?tab=about',
    server: businessApi({
      business: { ...GLOW, hours: GLOW.hours.map(() => ({ open: 540, close: 1440, break: null })), open: { open: true, until: 1440 } },
    }),
  },
  play: async ({ canvas }) => {
    // the StatusPill on the cover and beside About's hours
    await expect(await canvas.findAllByText(/^(Open until|Closes at) 24:00$/)).toHaveLength(2)
    const about = within(canvas.getByRole('region', { name: 'About' }))
    await expect(about.getAllByText('09:00–24:00')).toHaveLength(7)
  },
}

/** The last hour before closing (DS · Lists A7 `ClosesSoon`): the amber «Closes at …» on the cover and in About. */
const SOON = nowMin() + 30
export const ClosesSoon: Story = {
  args: {
    path: '/en/b/glow-studio?tab=about',
    server: businessApi({ business: { ...GLOW, open: { open: true, until: SOON } } }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByText(`Closes at ${hm(SOON % 1440)}`)).toHaveLength(2)
  },
}

/** A home-based business: the approximate circle, no Directions, the address's note. */
export const HomeBased: Story = {
  args: {
    path: '/en/b/glow-studio?tab=about',
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

/** Phone (Venue v0.7 · 390): the tab bar without counts; a press opens the panel. */
export const PhoneTabs: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const tab = await canvas.findByRole('tab', { name: /^Specialists/ })
    await expect(tab).toBeVisible()
    await userEvent.click(tab)
    await waitFor(() => expect(within(canvas.getByRole('region', { name: 'Specialists' })).getAllByRole('listitem')).toHaveLength(4))
  },
}
