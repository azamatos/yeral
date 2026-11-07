/**
 * Search — book C-03, C-05, board Search and the C7-Home results toolbar, over a `fetch` that answers like the api: the
 * rows with their time chips, a category's page, the day from the header's bar, the toolbar's filters and sort, nothing
 * found, Show more, a phone.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { BusinessCard, Category } from '@yeral/contract/catalog'
import { addDays, today } from '@yeral/domain/time'
import { MapTiles } from '@yeral/ui/map-frame'
import { expect, screen, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { authApi, fakeFetch, json, PageStory } from '@/shared/storybook'
import { HeaderSearch, HeaderSearchPhone } from '@/widgets/search-bar'
import { SearchPage } from './search-page'

/** The page under the header's search (the site's `_site` layout puts it there): the compact bar, the phone's summary field. */
function Page({ category }: { category?: Category }) {
  return (
    <>
      <div className="flex h-20 items-center px-8 max-sm:hidden">
        <HeaderSearch mode="results" />
      </div>
      <div className="sm:hidden">
        <HeaderSearchPhone />
      </div>
      <SearchPage category={category} />
    </>
  )
}

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']

/** Opens the header bar's When, picks a quick day, and searches. */
async function pickDay(canvas: Canvas, day: string) {
  await userEvent.click(canvas.getByRole('button', { name: /^When / }))
  const panel = await canvas.findByRole('dialog', { name: 'When' })
  await userEvent.click(within(panel).getByRole('radio', { name: day }))
  await userEvent.click(within(panel).getByRole('button', { name: 'Done' }))
  await userEvent.click(canvas.getByRole('button', { name: 'Search' }))
}

/** Opens a Select's list (a portal: found on `screen`) and picks a row; waits for the list to close. */
async function pick(trigger: HTMLElement, option: string | RegExp) {
  await userEvent.click(trigger)
  const list = await screen.findByRole('listbox')
  await userEvent.click(await within(list).findByRole('option', { name: option }))
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
}

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
      if (route === 'GET /search/suggest') return json({ categories: [], services: [], businesses: [] })
      if (route === 'GET /search') {
        last = query
        const at = Number(query.get('cursor') ?? 0)
        const wide = query.has('minRating')
        // words no place has
        const miss = query.get('q') === 'hairx'
        const items = none || wide || miss ? [] : (pages[at] ?? [])
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
      return /\/(categories|cities|search|places\/suggest|search\/suggest)$/.test(path) ? mine(input, init) : signIn(input, init)
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
      '/$lang/search': () => <Page />,
      '/$lang/area': () => (
        <MapTiles style={ONE_COLOUR}>
          <Page />
        </MapTiles>
      ),
      '/$lang/c/$category': () => <Page category={barber} />,
      '/$lang/b/$slug': () => <p>A business</p>,
      '/$lang/b/$slug/book': () => <p>The booking</p>,
    },
    path: '/en/search',
    server: fakeApi(),
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The rows: name, rating, the category (no street, no position), open until, from, three times and «+N»; only categories that take appointments; the toolbar at rest. */
export const Results: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Popular places' })).toBeVisible()
    await expect(await canvas.findByText('2 places · free time today')).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Rating' })).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Open now' })).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Women only' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Sort: Recommended' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Clear all' })).toBeNull()
    await expect(canvas.getByRole('link', { name: 'Barber Loft' })).toHaveAttribute('href', '/en/b/barber-loft')
    const row = within(canvas.getByRole('link', { name: 'Barber Loft' }).closest('article')!)
    await expect(row.getByText('Barbershop')).toBeVisible()
    await expect(canvas.queryByText(/Magtymguly/)).toBeNull()
    await expect(row.getByText('Open until 19:00')).toBeVisible()
    // an example business is no longer marked (owner's review, #40)
    await expect(canvas.queryByText('Example')).toBeNull()
    await expect(canvas.getAllByText('from 40 TMT')).toHaveLength(2)
    await expect(row.getAllByRole('link', { name: /^Book Barber Loft at/ })).toHaveLength(3)
    await expect(row.getByRole('link', { name: '4 more times' })).toHaveAttribute('href', `/en/b/barber-loft/book?date=${DAY}&step=time`)
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

/** Tomorrow, from the header bar's When, asks for that date and says so; the filters stay. */
export const Tomorrow: Story = {
  args: { path: '/en/search?rating=4' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Rating: 4.0+')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'When Any time' })).toBeVisible()
    await pickDay(canvas, 'Tomorrow')
    await expect(await canvas.findByText('2 places · free time tomorrow')).toBeVisible()
    await expect(last.get('date')).toBe(addDays(DAY, 1))
    await expect(last.get('minRating')).toBe('4')
    await expect(canvas.getByRole('button', { name: 'When Tomorrow' })).toBeVisible()
  },
}

/** A calendar day from Home's When: the count names it, the bar's When shows it, and Today clears it. */
export const CalendarDay: Story = {
  args: { path: `/en/search?date=${addDays(DAY, 5)}` },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^2 places · free time on \w+, \d+ \w+$/)).toBeVisible()
    await expect(last.get('date')).toBe(addDays(DAY, 5))
    await expect(canvas.getByRole('button', { name: /^When \w+, \d+ \w+$/ })).toBeVisible()
    await pickDay(canvas, 'Today')
    await expect(await canvas.findByText('2 places · free time today')).toBeVisible()
    await waitFor(() => expect(last.has('date')).toBe(false))
  },
}

/**
 * A price band applies at once: the trigger tints, a chip appears with Clear all. Open now and Women only (book C-03) are
 * toggles: «Open now · Yes» and a plain chip while on. Clear all takes everything off in one go.
 */
export const Filters: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await pick(canvas.getByRole('combobox', { name: 'Price' }), 'Up to 100 TMT')
    await expect(await canvas.findByRole('combobox', { name: 'Price · Up to 100 TMT' })).toBeVisible()
    await expect(canvas.getByText('Price: Up to 100 TMT')).toBeVisible()
    await waitFor(() => expect(last.get('maxPrice')).toBe('100'))
    await expect(last.has('minPrice')).toBe(false)
    await pick(canvas.getByRole('combobox', { name: 'Price · Up to 100 TMT' }), '100–200 TMT')
    await waitFor(() => expect(last.get('minPrice')).toBe('100'))
    await pick(canvas.getByRole('combobox', { name: 'Open now' }), 'Open now')
    await expect(await canvas.findByRole('combobox', { name: 'Open now · Yes' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Remove Open now' })).toBeVisible()
    await waitFor(() => expect(last.get('openNow')).toBe('1'))
    await pick(canvas.getByRole('combobox', { name: 'Women only' }), 'Women only')
    await expect(await canvas.findByRole('combobox', { name: 'Women only · Yes' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Remove Women only' })).toBeVisible()
    await waitFor(() => expect(last.get('womenOnly')).toBe('1'))
    await userEvent.click(canvas.getByRole('button', { name: 'Clear all' }))
    await waitFor(() => expect(last.has('maxPrice')).toBe(false))
    await expect(last.has('openNow')).toBe(false)
    await expect(last.has('womenOnly')).toBe(false)
    await expect(canvas.queryByText(/^Price: /)).toBeNull()
    await expect(canvas.getByRole('combobox', { name: 'Open now' })).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Women only' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Clear all' })).toBeNull()
  },
}

/** An older link with the toggles on (the keys from before the toolbar) still reads them. */
export const OlderToggles: Story = {
  args: { path: '/en/search?open=true&women=true' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('combobox', { name: 'Open now · Yes' })).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Women only · Yes' })).toBeVisible()
    await waitFor(() => expect(last.get('openNow')).toBe('1'))
    await expect(last.get('womenOnly')).toBe('1')
  },
}

/** A range from an older link that the menu doesn't offer stays, read as it is. */
export const OlderRange: Story = {
  args: { path: '/en/search?from=50' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('combobox', { name: 'Price · 50 TMT and up' })).toBeVisible()
    await expect(canvas.getByText('Price: 50 TMT and up')).toBeVisible()
  },
}

/** Sort says what it does; without a position Nearest isn't offered. */
export const Sort: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await userEvent.click(canvas.getByRole('button', { name: 'Sort: Recommended' }))
    const list = await screen.findByRole('listbox')
    await expect(within(list).queryByRole('option', { name: 'Nearest' })).toBeNull()
    await userEvent.click(within(list).getByRole('option', { name: 'Price, lowest first' }))
    await expect(await canvas.findByRole('button', { name: 'Sort: Price, lowest first' })).toBeVisible()
    await waitFor(() => expect(last.get('sort')).toBe('price'))
  },
}

/** Location off: Distance is off with a reason, and opens nothing. */
export const LocationOff: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    const distance = canvas.getByRole('combobox', { name: 'Distance' })
    await expect(distance).toHaveAttribute('aria-disabled', 'true')
    await userEvent.hover(distance)
    await expect(await screen.findByRole('tooltip')).toHaveTextContent('Turn on location to filter by distance')
    await userEvent.click(distance)
    await expect(screen.queryByRole('listbox')).toBeNull()
  },
}

/** Nothing found: it says so, and offers tomorrow and clearing the filter that emptied it. */
export const NothingFound: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await pick(canvas.getByRole('combobox', { name: 'Rating' }), '4.5+')
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

/** Words no place has (C7-Home `SearchNoResults`): the toolbar goes, the spelling is questioned, Clear search brings the places back. */
export const NoMatch: Story = {
  args: { path: '/en/search?what=hairx' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No places for “hairx”')).toBeVisible()
    await expect(canvas.getByText('Check the spelling, or try one of these.')).toBeVisible()
    await expect(canvas.queryByRole('combobox', { name: 'Rating' })).toBeNull()
    // not around a position: nothing further to search
    await expect(canvas.queryByRole('button', { name: 'Search further away' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Clear search' }))
    await expect(await canvas.findByRole('link', { name: 'Barber Loft' })).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Rating' })).toBeVisible()
    // the words are gone everywhere, the header's bar included
    await expect(canvas.queryByText(/hairx/)).toBeNull()
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

/** Around a position: near you, Distance (5 km plain, another radius tints and chips), Nearest in Sort, no offer to share a location. */
export const NearAPosition: Story = {
  args: { path: '/en/search?near=37.95,58.39' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Places near you' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Show my location' })).toBeNull()
    await expect(canvas.queryByText(/^Distance: /)).toBeNull()
    await pick(await canvas.findByRole('combobox', { name: 'Distance' }), 'Within 10 km')
    await waitFor(() => expect(last.get('r')).toBe('10'))
    await expect(last.get('lat')).toBe('37.95')
    await expect(canvas.getByRole('combobox', { name: 'Distance · 10 km' })).toBeVisible()
    await expect(canvas.getByText('Distance: 10 km')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Sort: Recommended' }))
    await expect(within(await screen.findByRole('listbox')).getByRole('option', { name: 'Nearest' })).toBeInTheDocument()
  },
}

/** Nothing near: «Search further away» goes straight to the widest radius, then there is nothing further. */
export const WiderArea: Story = {
  args: { path: '/en/search?near=37.95,58.39', server: fakeApi({ none: true }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Search further away' }))
    await waitFor(() => expect(last.get('r')).toBe('25'))
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Search further away' })).toBeNull())
    await expect(canvas.getByRole('button', { name: 'Try tomorrow' })).toBeVisible()
  },
}

/** A city from the header bar's Where keeps the list to it, and the offer to share a location goes. */
export const PickACity: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('button', { name: 'Show my location' })
    await userEvent.click(canvas.getByRole('combobox', { name: 'Where' }))
    await userEvent.click(await canvas.findByRole('option', { name: 'Ashgabat' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(last.get('city')).toBe('ashgabat'))
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Show my location' })).toBeNull())
  },
}

/** «I'll type an address» on the banner opens the header bar's Where. */
export const TypeAnAddress: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: "I'll type an address" }))
    await expect(canvas.getByRole('combobox', { name: 'Where' })).toHaveFocus()
    await expect(await canvas.findByRole('option', { name: /Near me/ })).toBeVisible()
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
    await waitFor(() => expect(canvas.getByRole('link', { name: 'Barber Loft' }).closest('[id^=row-]')!.className).toContain('bg-n-50'))
  },
}

/** The person moves the map: «Search this area» asks for what it shows, and goes until the next move. */
export const SearchThisArea: Story = {
  args: { path: '/en/area' },
  play: async ({ canvas, canvasElement }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    // the lazy MapLibre import lands later when the whole file runs
    await waitFor(() => expect(canvasElement.querySelector('canvas')).not.toBeNull(), { timeout: 3000 })
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

/** A phone (Mobile 2): the rows narrow, nothing runs off sideways; the toolbar is Filters · the count · Sort as an icon. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await expect(canvas.getByRole('button', { name: 'Filters' })).toBeVisible()
    await expect(canvas.getByText('2 places · free time today')).toBeVisible()
    await expect(canvas.queryByRole('combobox', { name: /Rating/ })).toBeNull()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}

/**
 * The phone's Filters sheet: a section per filter with radio rows, Distance's reason while location is off, Open now and
 * Women only as two rows each («Open or closed» / «Open now»), Show N places closes.
 */
export const PhoneFilters: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await userEvent.click(canvas.getByRole('button', { name: 'Filters' }))
    const sheet = within(await page.findByRole('dialog', { name: 'Filters' }))
    await expect(sheet.getByText('Turn on location to filter by distance')).toBeVisible()
    await expect(sheet.getByRole('option', { name: /Any rating/ })).toHaveAttribute('aria-selected', 'true')
    await expect(sheet.getByRole('option', { name: 'Open or closed' })).toHaveAttribute('aria-selected', 'true')
    await expect(sheet.getByRole('option', { name: 'Everyone' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(sheet.getByRole('option', { name: /Up to 100 TMT/ }))
    await waitFor(() => expect(last.get('maxPrice')).toBe('100'))
    await userEvent.click(sheet.getByRole('option', { name: 'Open now' }))
    await waitFor(() => expect(last.get('openNow')).toBe('1'))
    await expect(sheet.getByRole('option', { name: 'Open now' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(sheet.getByRole('button', { name: 'Show 2 places' }))
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull())
    await expect(canvas.getByRole('button', { name: 'Filters 2' })).toBeVisible()
    await expect(canvas.getByText('Price: Up to 100 TMT')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Remove Open now' })).toBeVisible()
  },
}
