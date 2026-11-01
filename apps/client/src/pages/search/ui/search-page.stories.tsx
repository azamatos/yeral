/**
 * Search — book C-03, C-05, board Search, over a `fetch` that answers like the api: the rows with their time chips, a
 * category's page, the day, the filters, nothing found, Show more, a phone.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { BusinessCard, Category } from '@yeral/contract/catalog'
import { addDays, today } from '@yeral/domain/time'
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
const CARDS = [card('barber-loft', 'Barber Loft', { example: true }), card('glow-studio', 'Glow Studio', { rating: null, reviewsCount: 0 })]
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
      if (route === 'GET /search') {
        last = query
        const at = Number(query.get('cursor') ?? 0)
        const wide = query.has('minRating')
        const items = none || wide ? [] : (pages[at] ?? [])
        return json({
          items,
          total: pages.flat().length,
          cursor: at + 1 < pages.length ? String(at + 1) : null,
          located: false,
          city: 'ashgabat',
        })
      }
      return undefined
    })
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(new Request(input, init).url).pathname
      return /\/(categories|search)$/.test(path) ? mine(input, init) : signIn(input, init)
    }
  }

const meta = {
  title: 'Client/Pages/Search',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: {
    routes: {
      '/$lang/search': () => <SearchPage />,
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

/** A phone (Mobile 2): the rows narrow, nothing runs off sideways. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Barber Loft' })
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}
