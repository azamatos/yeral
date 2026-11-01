/**
 * Search — book C-03, C-05, board Search, over a `fetch` that answers like the api: the rows with their time chips, a
 * category's page, the day, the filters, nothing found, Show more, a phone.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { BusinessCard, Category } from '@yeral/contract/catalog'
import { addDays, today } from '@yeral/domain/time'
import { MapTiles } from '@yeral/ui/map-frame'
import { expect, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { authApi, fakeFetch, json, PageStory } from '@/shared/storybook'
import { SearchPage } from './search-page'

const DAY = today()
const card = (slug: string, name: string, patch: Partial<BusinessCard> = {}): BusinessCard => ({
  slug,
  name,
  example: false,
  category: { id: 'barber', name: 'Barbershop' },
  photo: null,
  rating: 4.8,
  reviewsCount: 12,
  street: 'Magtymguly şaýoly 12',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  geo: { lat: 37.95, lng: 58.39, approximate: false },
  distanceM: null,
  bookingType: 'appointment',
  onlineEnabled: true,
  priceFrom: { type: 'from', amount: 40 },
  open: { open: true, until: 1140 },
  availability: { type: 'appointment', date: DAY, starts: [660, 690, 720, 750], more: 3 },
  ...patch,
})
const CARDS = [
  card('barber-loft', 'Barber Loft', { example: true }),
  card('glow-studio', 'Glow Studio', { rating: null, reviewsCount: 0, geo: { lat: 37.953, lng: 58.385, approximate: false } }),
]
const CITIES = { items: [{ id: 'ashgabat', name: 'Ashgabat', lat: 37.95, lng: 58.39 }], main: 'ashgabat', nearest: null }
const ONE_COLOUR = `data:application/json,${encodeURIComponent(JSON.stringify({ version: 8, sources: {}, layers: [] }))}`
const barber = {
  id: 'barber',
  icon: 'scissors',
  name: 'Barbershop',
  hint: 'Hair, beard',
  bookingTypes: ['appointment'],
  specialistWord: 'barber',
  intro: 'Haircuts and beards near you, with the free times shown.',
  starter: [],
} as unknown as Category
const CATEGORIES = [
  barber,
  { ...barber, id: 'dentist', name: 'Dentist' },
  { ...barber, id: 'restaurant', name: 'Restaurant', bookingTypes: ['table'] },
]

/** What the stories asked for last, to read what a control sent. */
let last = new URLSearchParams()

const fakeApi =
  ({ pages = [CARDS], none = false }: { pages?: BusinessCard[][]; none?: boolean } = {}) =>
  () => {
    const signIn = authApi()()
    const mine = fakeFetch(({ route, query }) => {
      if (route === 'GET /categories') return json({ items: CATEGORIES })
      if (route === 'GET /cities') return json(CITIES)
      if (route === 'GET /search') {
        last = query
        const at = Number(query.get('cursor') ?? 0)
        const wide = query.has('minRating')
        const items = none || wide ? [] : (pages[at] ?? [])
        return json({
          items,
          total: pages.flat().length,
          cursor: at + 1 < pages.length ? String(at + 1) : null,
          located: query.has('lat'),
          city: 'ashgabat',
        })
      }
      return undefined
    })
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(new Request(input, init).url).pathname
      return /\/(categories|cities|search|places\/suggest)$/.test(path) ? mine(input, init) : signIn(input, init)
    }
  }

const meta = {
  title: 'Client/Pages/Search',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  beforeEach: () => localStorage.removeItem('yeral.place'),
  globals: { viewport: { value: 'xl' } },
  args: {
    routes: {
      '/$lang/search': () => <SearchPage />,
      '/$lang/area': () => (
        <MapTiles style={ONE_COLOUR}>
          <SearchPage />
        </MapTiles>
      ),
      '/$lang/c/$category': () => <SearchPage category={barber} />,
      '/$lang/b/$slug': () => <p>A business</p>,
      '/$lang/b/$slug/book': () => <p>The booking</p>,
    },
    path: '/en/search',
    server: fakeApi(),
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The rows: name, rating, the line, from, Example, four times and how many more; only categories that take appointments. */
export const Results: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Popular places' })).toBeVisible()
    await expect(await canvas.findByText('2 places · free time today')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Barber Loft' })).toHaveAttribute('href', '/en/b/barber-loft')
    await expect(canvas.getAllByText('Barbershop · Magtymguly şaýoly 12')).toHaveLength(2)
    await expect(canvas.getByText('Example')).toBeVisible()
    await expect(canvas.getAllByText('from 40 TMT')).toHaveLength(2)
    await expect(canvas.getAllByText('+3')).toHaveLength(2)
    await expect(canvas.getByRole('link', { name: 'Book Barber Loft at 11:00' })).toHaveAttribute(
      'href',
      `/en/b/barber-loft/book?date=${DAY}&time=660`,
    )
    await expect(await canvas.findByRole('radio', { name: 'Dentist' })).toBeVisible()
    await expect(canvas.queryByRole('radio', { name: 'Restaurant' })).toBeNull()
  },
}

/** A category's page: its name, its intro, its chip on. */
export const CategoryPage: Story = {
  args: { path: '/en/c/barber' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Barbershop' })).toBeVisible()
    await expect(canvas.getByText('Haircuts and beards near you, with the free times shown.')).toBeVisible()
    await expect(await canvas.findByRole('radio', { name: 'Barbershop' })).toBeChecked()
    await waitFor(() => expect(last.get('cat')).toBe('barber'))
  },
}

/** Tomorrow asks for that date, and says so. */
export const Tomorrow: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await userEvent.click(canvas.getByRole('radio', { name: 'Tomorrow' }))
    await expect(await canvas.findByText('2 places · free time tomorrow')).toBeVisible()
    await expect(last.get('date')).toBe(addDays(DAY, 1))
  },
}

/** The drawer changes nothing until Show results; its chip then counts what's on. */
export const Filters: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    const d = within(await page.findByRole('dialog', { name: 'Filters' }))
    await userEvent.type(d.getByRole('textbox', { name: 'Price from' }), '50')
    await userEvent.click(d.getByRole('switch', { name: 'Open now' }))
    await expect(last.has('openNow')).toBe(false)
    await userEvent.click(d.getByRole('button', { name: 'Show results' }))
    await expect(await canvas.findByRole('button', { name: 'Filters: 2' })).toBeVisible()
    await waitFor(() => expect(last.get('minPrice')).toBe('50'))
    await expect(last.get('openNow')).toBe('1')
  },
}

/** Nothing found: it says so, and offers tomorrow and clearing the filter that emptied it. */
export const NothingFound: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await userEvent.click(canvas.getByRole('button', { name: 'Rating 4.5+' }))
    await expect(await canvas.findByText('No free time here')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Try tomorrow' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear filters' }))
    await expect(await canvas.findByRole('link', { name: 'Barber Loft' })).toBeVisible()
  },
}

export const NoPlaces: Story = {
  args: { server: fakeApi({ none: true }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No free time here')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  },
}

/** Show more loads the next page under the first. */
export const ShowMore: Story = {
  args: { server: fakeApi({ pages: [[CARDS[0]!], [CARDS[1]!]] }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Show more' }))
    await expect(await canvas.findByRole('link', { name: 'Glow Studio' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Barber Loft' })).toBeVisible()
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Show more' })).toBeNull())
  },
}

/** Around a position: near you, how far, and no offer to share a location already given. */
export const NearAPosition: Story = {
  args: { path: '/en/search?near=37.95,58.39' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Places near you' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Show my location' })).toBeNull()
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'How far' }), '10')
    await waitFor(() => expect(last.get('r')).toBe('10'))
    await expect(last.get('lat')).toBe('37.95')
  },
}

/** Nothing near: one step wider. */
export const WiderArea: Story = {
  args: { path: '/en/search?near=37.95,58.39', server: fakeApi({ none: true }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Make it 10 km' }))
    await waitFor(() => expect(last.get('r')).toBe('10'))
    await expect(await canvas.findByRole('button', { name: 'Make it 25 km' })).toBeVisible()
  },
}

/** Where? keeps to a city, and the offer to share a location goes. */
export const PickACity: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: 'Show my location' })
    await userEvent.click(canvas.getByRole('combobox', { name: 'Where?' }))
    await userEvent.click(await canvas.findByRole('option', { name: 'Ashgabat' }))
    await waitFor(() => expect(last.get('city')).toBe('ashgabat'))
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Show my location' })).toBeNull())
  },
}

/** The map beside the list: a row lights its pin, a pin lights its row. */
export const MapBesideTheList: Story = {
  play: async ({ canvas }) => {
    const pin = await canvas.findByRole('button', { name: 'Barber Loft, 11:00' })
    await expect(pin).toHaveTextContent('11:00')
    const row = canvas.getByRole('link', { name: 'Glow Studio' }).closest<HTMLElement>('[id^=row-]')!
    await userEvent.hover(row)
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Glow Studio, 11:00' }).className).toContain('bg-n-900'))
    await userEvent.unhover(row)
    await userEvent.click(pin)
    await waitFor(() => expect(canvas.getByRole('link', { name: 'Barber Loft' }).closest('[id^=row-]')!.className).toContain('bg-a-50'))
  },
}

/** The person moves the map: «Search this area» asks for what it shows, and goes until the next move. */
export const SearchThisArea: Story = {
  args: { path: '/en/area' },
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await waitFor(() => expect(canvasElement.querySelector('canvas')).not.toBeNull())
    await expect(canvas.queryByRole('button', { name: 'Search this area' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Zoom in' }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Search this area' }))
    await waitFor(() => expect(last.get('bbox')).toMatch(/^[\d.]+,[\d.]+,[\d.]+,[\d.]+$/))
    await expect(canvas.queryByRole('button', { name: 'Search this area' })).toBeNull()
  },
}

/** Under 1024 the list comes first: Map opens over it with the places as cards, and List goes back. */
export const PhoneMap: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await expect(canvas.queryByRole('button', { name: 'Barber Loft, 11:00' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Map' }))
    const map = within(await canvas.findByRole('dialog', { name: 'Map' }))
    await expect(await map.findByRole('button', { name: 'Glow Studio, 11:00' })).toBeVisible()
    await expect(map.getByRole('link', { name: 'Glow Studio' })).toBeInTheDocument()
    await userEvent.click(map.getByRole('button', { name: 'List' }))
    await waitFor(() => expect(canvas.queryByRole('dialog')).toBeNull())
  },
}

/** A phone (Mobile 2): the rows narrow, nothing runs off sideways. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}
