/** `/{lang}` — Home (book C-02, board Home) under the site's chrome, over a `fetch` that answers like the api. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { BusinessCard, Category } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { useSearch } from '@tanstack/react-router'
import { expect, screen as page, userEvent, waitFor } from 'storybook/test'
import { authApi, fakeFetch, json, PageStory } from '@/shared/storybook'
import { SiteLayout } from '@/widgets/site-layout'
import { HomePage } from './home-page'

function Home() {
  return (
    <SiteLayout>
      <HomePage />
    </SiteLayout>
  )
}

function Results() {
  return <p>Search: {JSON.stringify(useSearch({ strict: false }))}</p>
}

const photo = { url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', alt: '' }
const card = (n: number, patch: Partial<BusinessCard> = {}): BusinessCard => ({
  slug: `place-${n}`,
  name: `Place ${n}`,
  example: n === 1,
  category: { id: 'barber', name: 'Barbershop' },
  photo,
  rating: 4.8,
  reviewsCount: 12,
  street: 'Magtymguly şaýoly 12',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  geo: { lat: 37.95, lng: 58.39, approximate: false },
  distanceM: null,
  bookingType: 'appointment',
  onlineEnabled: true,
  priceFrom: null,
  open: { open: true, until: 1140 },
  availability: { type: 'appointment', date: today(), starts: [660, 690, 720, 750], more: 0 },
  ...patch,
})
const barber = {
  id: 'barber',
  icon: 'scissors',
  name: 'Barbershop',
  hint: 'Hair, beard',
  bookingTypes: ['appointment'],
} as unknown as Category
const cities = {
  items: [
    { id: 'ashgabat', name: 'Ashgabat', lat: 37.9, lng: 58.3 },
    { id: 'mary', name: 'Mary', lat: 37.6, lng: 61.8 },
  ],
  main: 'ashgabat',
  nearest: null,
}

const fakeApi =
  ({ none = false }: { none?: boolean } = {}) =>
  () => {
    const signIn = authApi()()
    const mine = fakeFetch(({ route, query }) => {
      if (route === 'GET /categories')
        return json({ items: [barber, { ...barber, id: 'tables', name: 'Restaurant', bookingTypes: ['table'] }] })
      if (route === 'GET /cities') return json(cities)
      if (route === 'GET /places/suggest') return json({ items: [{ label: 'Bitarap park', lat: 37.94, lng: 58.38 }] })
      if (route === 'GET /search')
        return json({ items: none ? [] : [1, 2, 3, 4, 5].map((n) => card(n)), cursor: null, located: query.has('lat'), city: 'ashgabat' })
      return undefined
    })
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(new Request(input, init).url).pathname
      return /\/(categories|cities|search|places\/suggest)$/.test(path) ? mine(input, init) : signIn(input, init)
    }
  }

/** The browser's answer to «Show my location». */
const browserLocation = (allowed: boolean) =>
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: {
      getCurrentPosition: (done: PositionCallback, fail: PositionErrorCallback) =>
        allowed
          ? done({ coords: { latitude: 37.95, longitude: 58.39 } } as GeolocationPosition)
          : fail({ code: 1 } as GeolocationPositionError),
    },
  })

const meta = {
  title: 'Client/Pages/Home',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  beforeEach: () => localStorage.removeItem('yeral.place'),
  args: {
    routes: {
      '/$lang': Home,
      '/$lang/search': Results,
      '/$lang/c/$category': () => <p>A category</p>,
      '/$lang/b/$slug': () => <p>A business</p>,
    },
    path: '/en',
    server: fakeApi(),
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The hero, four places of the five, the categories that take appointments, how it works, the block for businesses. */
export const Page: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Take your place.' })).toBeVisible()
    await expect(await canvas.findByRole('heading', { name: 'Popular places' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Place 4' })).toBeVisible()
    await expect(canvas.queryByRole('link', { name: 'Place 5' })).toBeNull()
    await expect(canvas.getByRole('link', { name: /^Barbershop Hair, beard/ })).toHaveAttribute('href', '/en/c/barber')
    await expect(canvas.queryByRole('link', { name: /Restaurant/ })).toBeNull()
    await expect(canvas.getByRole('heading', { name: 'How it works' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Add your business' })).toBeVisible()
  },
}

/** The bar opens the search with what, where and when. */
export const SearchFromHome: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole('combobox', { name: 'What' }), 'haircut')
    await userEvent.click(canvas.getByRole('combobox', { name: 'Where' }))
    await userEvent.click(await canvas.findByRole('option', { name: 'Mary' }))
    await userEvent.click(canvas.getByRole('button', { name: 'When Any time' }))
    await userEvent.click(await canvas.findByRole('radio', { name: 'Tomorrow' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Done' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Search' }))
    await expect(await canvas.findByText('Search: {"what":"haircut","city":"mary","day":"tomorrow"}')).toBeVisible()
  },
}

/** Nothing asks until the button: allowed, the places are the near ones and the offer goes. */
export const ShareLocation: Story = {
  play: async ({ canvas }) => {
    browserLocation(true)
    await userEvent.click(await canvas.findByRole('button', { name: 'Show my location' }))
    await expect(await canvas.findByRole('heading', { name: 'Free today near you' })).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Show my location' })).toBeNull()
    await expect(canvas.getByRole('combobox', { name: 'Where' })).toHaveValue('Near me')
  },
}

/** Refused: the list stays by city, it says so, and the help sheet says how to allow it. */
export const LocationRefused: Story = {
  play: async ({ canvas }) => {
    browserLocation(false)
    await userEvent.click(await canvas.findByRole('button', { name: 'Show my location' }))
    await expect(await canvas.findByText('Location off — showing by city')).toBeVisible()
    await expect(canvas.getByRole('heading', { name: 'Popular places' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Open settings' }))
    await expect(await page.findByRole('dialog', { name: 'Allow your location' })).toBeInTheDocument()
  },
}

/** «I'll type an address» goes to the field; a suggestion picked is the place, and it's kept for the next visit. */
export const TypeAnAddress: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: "I'll type an address" }))
    const where = canvas.getByRole('combobox', { name: 'Where' })
    await expect(where).toHaveFocus()
    await userEvent.keyboard('Bit')
    await userEvent.click(await canvas.findByRole('option', { name: 'Bitarap park' }))
    await waitFor(() => expect(where).toHaveValue('Bitarap park'))
    await expect(canvas.queryByRole('button', { name: 'Show my location' })).toBeNull()
    await expect(JSON.parse(localStorage.getItem('yeral.place')!)).toMatchObject({ kind: 'point', label: 'Bitarap park' })
  },
}

/** No places yet: the page still stands, without the list or the photos. */
export const NoPlaces: Story = {
  args: { server: fakeApi({ none: true }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Take your place.' })).toBeVisible()
    await expect(await canvas.findByRole('heading', { name: 'How it works' })).toBeVisible()
    await expect(canvas.queryByRole('heading', { name: 'Popular places' })).toBeNull()
  },
}

export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('link', { name: 'Place 1' })
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}
