/**
 * The home SearchBar (C7-Home C1, design v0.7) over a `fetch` that answers like the api: rest, What open with the
 * categories, typing with the three groups and the keyboard, nothing found, Where with Near me and the cities, location
 * off, When as chips + month + time of day, and the search they send.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Category } from '@yeral/contract/catalog'
import { addDays, today } from '@yeral/domain/time'
import { useSearch } from '@tanstack/react-router'
import { expect, screen as page, userEvent, waitFor, within } from 'storybook/test'
import { usePlace } from '@/features/pick-place'
import { authApi, fakeFetch, json, PageStory } from '@/shared/storybook'
import { wrap } from '@/shared/ui'
import { SearchBar } from './search-bar'
import { SearchCard } from './search-card'

function Home() {
  const located = usePlace()
  return (
    <div className={`${wrap} flex flex-col items-center pt-10 pb-130`}>
      <SearchBar located={located} className="max-sm:hidden" />
      <SearchCard located={located} className="w-full sm:hidden" />
    </div>
  )
}
function Results() {
  return <p>Search: {JSON.stringify(useSearch({ strict: false }))}</p>
}

const category = (id: string, name: string, icon: string, hint: string) =>
  ({ id, name, icon, hint, bookingTypes: ['appointment'] }) as unknown as Category
const CATEGORIES = [
  category('beauty', 'Beauty', 'sparkles', 'Hair, nails, skin'),
  category('barber', 'Barbershop', 'scissors', 'Hair, beard'),
  category('dentist', 'Dentist', 'smile', 'Teeth'),
  category('fitness', 'Fitness', 'dumbbell', 'Gyms, trainers'),
]
const CITIES = {
  items: [
    { id: 'ashgabat', name: 'Ashgabat', lat: 37.9, lng: 58.3 },
    { id: 'mary', name: 'Mary', lat: 37.6, lng: 61.8 },
    { id: 'dashoguz', name: 'Daşoguz', lat: 41.8, lng: 59.9 },
  ],
  main: 'ashgabat',
  nearest: null,
}

const fakeApi = () => () => {
  const signIn = authApi()()
  const mine = fakeFetch(({ route, query }) => {
    if (route === 'GET /categories') return json({ items: CATEGORIES })
    if (route === 'GET /cities') return json(CITIES)
    if (route === 'GET /places/suggest') {
      const found = /bit/i.test(query.get('q') ?? '')
      return json({ items: found ? [{ label: 'Bitarap park', lat: 37.94, lng: 58.38 }] : [] })
    }
    if (route === 'GET /search') return json({ items: [], total: 24, cursor: null, located: false, city: 'ashgabat' })
    if (route === 'GET /search/suggest') {
      const q = query.get('q') ?? ''
      if (q === 'hairx') return json({ categories: [], services: [], businesses: [] })
      return json({
        categories: [{ id: 'beauty', name: 'Beauty' }],
        services: ['Women’s haircut', 'Kids’ haircut', 'Hair colouring'],
        businesses: [
          { slug: 'hair-lab', name: 'Hair Lab', example: false, category: 'Beauty' },
          { slug: 'hairline', name: 'Hairline Barbers', example: false, category: 'Barbershop' },
        ],
      })
    }
    return undefined
  })
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(new Request(input, init).url).pathname
    return /\/(categories|cities|places\/suggest|search\/suggest|search)$/.test(path) ? mine(input, init) : signIn(input, init)
  }
}

/** The browser's answer to «Near me». */
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
  title: 'Client/Search/SearchBar',
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

/** Rest: Where shows the default «Near me», What and When their placeholders; nothing is open. */
export const Rest: Story = {
  play: async ({ canvas }) => {
    const bar = await canvas.findByRole('search', { name: 'Search' })
    await expect(within(bar).getByRole('combobox', { name: 'What' })).toHaveAttribute('placeholder', 'Service, place or specialist')
    await expect(within(bar).getByRole('combobox', { name: 'Where' })).toHaveValue('Near me')
    await expect(within(bar).getByRole('button', { name: 'When Any time' })).toBeVisible()
    await expect(canvas.queryByRole('listbox')).toBeNull()
  },
}

/** What focused with nothing typed: the categories as chips; a chip is the category's page. Esc closes. */
export const WhatOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('combobox', { name: 'What' }))
    await expect(await canvas.findByRole('link', { name: 'Barbershop' })).toHaveAttribute('href', '/en/c/barber')
    await userEvent.keyboard('{Escape}')
    await expect(canvas.queryByRole('link', { name: 'Barbershop' })).toBeNull()
    await expect(canvas.getByRole('combobox', { name: 'What' })).toHaveFocus()
  },
}

/** Typing «hair»: Categories · Services · Businesses; ↓ ↓ Enter picks the first service and searches it. */
export const WhatTyping: Story = {
  play: async ({ canvas }) => {
    const what = await canvas.findByRole('combobox', { name: 'What' })
    await userEvent.type(what, 'hair')
    await expect(await canvas.findByRole('option', { name: /Women’s haircut/ })).toBeVisible()
    await expect(canvas.getByRole('option', { name: /Hair Lab/ })).toBeVisible()
    await expect(canvas.getByRole('option', { name: /Show all results for “hair”/ })).toBeVisible()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    await expect(what).toHaveAttribute('aria-activedescendant', 'what-svc-0')
    await userEvent.keyboard('{Enter}')
    await expect(await canvas.findByText('Search: {"what":"Women’s haircut"}')).toBeVisible()
  },
}

/** Nothing matches: the line says so, Enter still searches the words as typed. */
export const NothingFound: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByRole('combobox', { name: 'What' }), 'hairx')
    await expect(await canvas.findByText('Nothing matches “hairx”')).toBeVisible()
    await userEvent.keyboard('{Enter}')
    await expect(await canvas.findByText('Search: {"what":"hairx"}')).toBeVisible()
  },
}

/** Where: Near me first, then the cities; a city picked shows in the field and goes with the search. */
export const WhereOpen: Story = {
  play: async ({ canvas }) => {
    const where = await canvas.findByRole('combobox', { name: 'Where' })
    await userEvent.click(where)
    await expect(await canvas.findByRole('option', { name: /Near me/ })).toBeVisible()
    await userEvent.click(canvas.getByRole('option', { name: 'Mary' }))
    await waitFor(() => expect(where).toHaveValue('Mary'))
    await expect(canvas.queryByRole('listbox')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Search' }))
    await expect(await canvas.findByText('Search: {"city":"mary"}')).toBeVisible()
  },
}

/** Typing a place: the matching cities; Enter with nothing highlighted takes the first match, not the old place. */
export const WhereTyping: Story = {
  play: async ({ canvas }) => {
    const where = await canvas.findByRole('combobox', { name: 'Where' })
    await userEvent.type(where, 'Mar')
    await expect(await canvas.findByRole('option', { name: 'Mary' })).toBeVisible()
    await expect(canvas.queryByRole('option', { name: 'Ashgabat' })).toBeNull()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(where).toHaveValue('Mary'))
    await expect(canvas.queryByRole('listbox')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Search' }))
    await expect(await canvas.findByText('Search: {"city":"mary"}')).toBeVisible()
  },
}

/** Near me allowed: the browser's position closes the panel, the field keeps «Near me», the search carries `near`. */
export const NearMe: Story = {
  play: async ({ canvas }) => {
    browserLocation(true)
    const where = await canvas.findByRole('combobox', { name: 'Where' })
    await userEvent.click(where)
    await userEvent.click(await canvas.findByRole('option', { name: /Near me/ }))
    await waitFor(() => expect(canvas.queryByRole('listbox')).toBeNull())
    await expect(where).toHaveValue('Near me')
    await userEvent.click(canvas.getByRole('button', { name: 'Search' }))
    await expect(await canvas.findByText('Search: {"near":"37.95000,58.39000"}')).toBeVisible()
  },
}

/**
 * Near me refused: the Info callout on top of the list, «How to allow» opens the help sheet and it stays up, the field
 * shows the guessed city, the list still works.
 */
export const LocationOff: Story = {
  play: async ({ canvas }) => {
    browserLocation(false)
    const where = await canvas.findByRole('combobox', { name: 'Where' })
    await userEvent.click(where)
    await userEvent.click(await canvas.findByRole('option', { name: /Near me/ }))
    await expect(await canvas.findByText('Location is off')).toBeVisible()
    await expect(canvas.getByRole('option', { name: 'Ashgabat' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'How to allow' }))
    const help = await page.findByRole('dialog', { name: 'Allow your location' })
    await waitFor(() => expect(help).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(help).not.toBeInTheDocument())
    await waitFor(() => expect(where).toHaveFocus())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(where).toHaveValue('Ashgabat'))
  },
}

/** When is not a select: Tomorrow + Evening read «Tomorrow · Evening»; Done moves the focus to Search; the search carries both. */
export const WhenOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'When Any time' }))
    const panel = await canvas.findByRole('dialog', { name: 'When' })
    await userEvent.click(within(panel).getByRole('radio', { name: 'Tomorrow' }))
    await userEvent.click(within(panel).getByRole('radio', { name: /Evening/ }))
    await expect(canvas.getByRole('button', { name: 'When Tomorrow · Evening' })).toBeVisible()
    await userEvent.click(within(panel).getByRole('button', { name: 'Done' }))
    await expect(canvas.getByRole('button', { name: 'Search' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(await canvas.findByText('Search: {"day":"tomorrow","tod":"evening"}')).toBeVisible()
  },
}

/**
 * A day from the calendar (ten days on, the next month when it falls there) goes as `date`. The × shows once the focus
 * is in the segment (⇧Tab from Search, Tab) and clears it.
 */
export const WhenDate: Story = {
  play: async ({ canvas }) => {
    const day = addDays(today(), 10)
    const pick = async () => {
      await userEvent.click(canvas.getByRole('button', { name: /^When / }))
      const panel = await canvas.findByRole('dialog', { name: 'When' })
      if (day.slice(0, 7) !== today().slice(0, 7)) await userEvent.click(within(panel).getByRole('button', { name: 'Next month' }))
      await userEvent.click(panel.querySelector<HTMLElement>(`[data-date="${day}"]`)!)
      await expect(canvas.queryByRole('button', { name: 'When Any time' })).toBeNull()
      await userEvent.click(within(panel).getByRole('button', { name: 'Done' }))
      await expect(canvas.getByRole('button', { name: 'Search' })).toHaveFocus()
    }
    await canvas.findByRole('button', { name: 'When Any time' })
    await pick()
    await userEvent.tab({ shift: true })
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Clear' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByRole('button', { name: 'When Any time' })).toBeVisible()
    await pick()
    await userEvent.keyboard('{Enter}')
    await expect(await canvas.findByText(`Search: {"date":"${day}"}`)).toBeVisible()
  },
}

/** 390: the card's rows open the full-screen sheet at that field; a pick moves to the next field; «Show 24 places» searches. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'What Service, place or specialist' }))
    const sheet = within(await page.findByRole('dialog', { name: 'Search' }))
    await userEvent.type(sheet.getByRole('combobox', { name: 'What' }), 'hair')
    await userEvent.click(await sheet.findByRole('option', { name: /Women’s haircut/ }))
    await waitFor(() => expect(sheet.getByRole('combobox', { name: 'Where' })).toHaveFocus())
    await userEvent.click(await sheet.findByRole('option', { name: 'Mary' }))
    await userEvent.click(await sheet.findByRole('radio', { name: 'Tomorrow' }))
    await expect(sheet.getByRole('button', { name: 'When Tomorrow' })).toBeVisible()
    await userEvent.click(await sheet.findByRole('button', { name: 'Show 24 places' }))
    await expect(await canvas.findByText('Search: {"what":"Women’s haircut","city":"mary","day":"tomorrow"}')).toBeVisible()
  },
}
