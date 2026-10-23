/**
 * `/setup/{step}` — B-Onboarding (v0.6, English), design §27.2, book B-02–B-06 and Q-200: the wizard's frame and its
 * business step. The page runs as in the app: the real sdk and query cache over a `fetch` that answers like the api
 * (contract-shaped bodies and errors), so each story walks the wizard as a person would.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { WeekdayHours } from '@yeral/contract/settings'
import type { Workspace } from '@yeral/contract/team'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { LAUNCH_CATEGORIES, PageStory } from '@/shared/storybook'
import { SetupPage } from './setup-page'

const city = { id: 'ashgabat', name: 'Ashgabat' }
const cities = [
  { ...city, lat: 37.9601, lng: 58.3261 },
  { id: 'mary', name: 'Mary', lat: 37.6005, lng: 61.8302 },
]

/** What the address search finds for «247 Bitarap» in Ashgabat (Photon's answer, as the api shapes it). */
const found = [
  {
    label: '247 Bitarap Türkmenistan Avenue, Ashgabat',
    line: '247 Bitarap Türkmenistan Avenue',
    street: 'Bitarap Türkmenistan Avenue',
    lat: 37.9375,
    lng: 58.38,
  },
  {
    label: 'Ak Öý, 247/1 Bitarap Türkmenistan Avenue, Ashgabat',
    line: '247/1 Bitarap Türkmenistan Avenue',
    street: 'Bitarap Türkmenistan Avenue',
    lat: 37.9371,
    lng: 58.3806,
  },
]

const maysa: Me = {
  id: 'u-maysa',
  name: 'Maýsa Annaýewa',
  firstName: 'Maýsa',
  surname: 'Annaýewa',
  phone: '+99365102030',
  lang: 'en',
  notifications: { confirmation: true, reminderDay: true, reminder2h: true, reviewAsk: false },
  hasBusiness: false,
  canChangePhone: true,
  demo: false,
  photo: null,
}

const glow: Workspace = {
  slug: 'glow-studio',
  name: 'Glow Studio',
  address: '247 Bitarap Türkmenistan Avenue',
  city,
  logo: null,
  level: 'owner',
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer: 0,
  requestsToAnswer: 0,
  lastOpenedAt: 1,
}

type Draft = {
  slug: string
  name: string
  step: string
  category: string
  categoryId: string
  logo: null
  address: { line: string; city: typeof city } | null
}

type Day = WeekdayHours | null

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/**
 * The api as the wizard uses it. `signedIn`: false for nobody. `workspaces`: the person's businesses (one makes it
 * «Create a business»). `draft`: an unfinished setup. `search`: `false` when the address search isn't there
 * (`address_search_unavailable`). `hours`: the draft's week (every day closed, as a new draft's).
 */
const fakeApi =
  ({
    signedIn = true,
    workspaces = [],
    draft = null,
    search = true,
    hours = [null, null, null, null, null, null, null],
  }: { signedIn?: boolean; workspaces?: Workspace[]; draft?: Draft | null; search?: boolean; hours?: Day[] } = {}) =>
  (): typeof fetch => {
    let setup = draft && { ...draft }
    let week = hours
    // the draft's profile as the address step reads and saves it
    let location = {
      cityId: 'ashgabat',
      address: setup?.address?.line ?? '',
      street: setup?.address?.line ?? '',
      lat: 37.9601,
      lng: 58.3261,
    }
    let notes = { floor: null as string | null, entranceNote: null as string | null, hideExactAddress: false }
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init)
      const path = new URL(request.url).pathname.replace(/^\/v1/, '')
      const body = (request.method === 'GET' ? {} : await request.json().catch(() => ({}))) as Record<string, unknown>
      const route = `${request.method} ${path}`
      if (route === 'GET /auth/mode') return json({ codeOnScreen: true })
      if (route === 'GET /me') return json(signedIn ? maysa : null)
      if (route === 'GET /me/workspaces') return json({ items: workspaces, current: workspaces[0]?.slug ?? null })
      if (route === 'GET /me/setup') return json({ setup })
      if (route === 'GET /cities') return json({ items: cities, main: 'ashgabat', nearest: null })
      if (/^GET \/w\/[^/]+\/settings\/profile$/.test(route) && setup)
        return json({
          slug: setup.slug,
          name: setup.name,
          logo: null,
          categoryId: setup.categoryId,
          about: {},
          phone: maysa.phone,
          amenities: [],
          womenOnly: false,
          location,
          ...notes,
          verification: 'pending',
          verificationReason: null,
          hidden: null,
        })
      if (/^GET \/w\/[^/]+\/settings\/address-search$/.test(route)) {
        if (!search) return json({ error: { code: 'address_search_unavailable' } }, 503)
        const q = new URL(request.url).searchParams.get('q') ?? ''
        const words = q.toLowerCase().split(/\s+/).filter(Boolean)
        return json({ items: found.filter((a) => words.every((w) => a.label.toLowerCase().includes(w))) })
      }
      if (route === 'GET /categories')
        return json({
          items: LAUNCH_CATEGORIES.map((c) => ({ ...c, icon: 'store', bookingTypes: ['appointment'], specialistWord: '', intro: '' })),
        })
      if (route === 'POST /setup') {
        if (setup) return json({ error: { code: 'setup_in_progress', details: { slug: setup.slug } } }, 409)
        const category = LAUNCH_CATEGORIES.find((c) => c.id === body.categoryId)!
        setup = {
          slug: 'glow-studio-2',
          name: String(body.name),
          step: 'address',
          category: category.name,
          categoryId: category.id,
          logo: null,
          address: null,
        }
        return json({ slug: setup.slug }, 201)
      }
      const step = /^PUT \/w\/([^/]+)\/setup$/.exec(route)
      if (step && setup) {
        setup.step = String(body.step)
        return new Response(null, { status: 204 })
      }
      const profile = /^PATCH \/w\/([^/]+)\/settings\/profile$/.exec(route)
      if (profile && setup) {
        if (typeof body.name === 'string') setup.name = body.name
        const category = LAUNCH_CATEGORIES.find((c) => c.id === body.categoryId)
        if (category) Object.assign(setup, { category: category.name, categoryId: category.id })
        if (body.location) {
          location = body.location as typeof location
          const c = cities.find((x) => x.id === location.cityId)!
          setup.address = { line: location.address, city: { id: c.id, name: c.name } }
        }
        if ('floor' in body)
          notes = {
            floor: body.floor as string | null,
            entranceNote: body.entranceNote as string | null,
            hideExactAddress: !!body.hideExactAddress,
          }
        return json({})
      }
      if (/^GET \/w\/[^/]+\/settings\/hours$/.test(route) && setup) return json({ hours: week, specialDays: [] })
      if (/^PUT \/w\/[^/]+\/settings\/hours$/.test(route) && setup) {
        week = body.hours as Day[]
        return json({ hours: week, specialDays: [], cancelled: 0 })
      }
      return json({ error: { code: 'not_found' } }, 404)
    }
  }

const meta = {
  title: 'Business/Onboarding/SetupFlow',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/setup/$step': SetupPage }, path: '/setup/phone', server: fakeApi() },
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/**
 * A new business: signed in, step 1 is done, the business step opens. Continue waits for a name and a category (the
 * hint says which), then the draft is made and the address step opens with the business step done.
 */
export const NewBusiness: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'About your business' })).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Set up your business · Ýeral Business'))
    const steps = canvas.getByRole('navigation', { name: 'Steps' })
    await expect(within(steps).getByRole('button', { name: /Business/ })).toHaveAttribute('aria-current', 'step')
    await expect(within(steps).getByText('+993 65 10 20 30')).toBeVisible()
    const cont = canvas.getByRole('button', { name: 'Continue' })
    await expect(cont).toBeDisabled()
    await expect(cont).toHaveAccessibleDescription('Enter the business name.')
    await userEvent.type(canvas.getByLabelText('Business name'), 'Glow Studio')
    await expect(canvas.getByText(/\/b\/glow-studio$/)).toBeVisible()
    await expect(cont).toHaveAccessibleDescription('Pick a category.')
    await userEvent.click(canvas.getByRole('radio', { name: 'Beauty' }))
    await expect(cont).toBeEnabled()
    await userEvent.click(cont)
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Where will clients find you?' })).toBeVisible()
    // the draft made, the wizard draws itself again: the step list is a new one
    const list = canvas.getByRole('navigation', { name: 'Steps' })
    await expect(within(list).getByText('Glow Studio · Beauty')).toBeVisible()
  },
}

/** A name over 80 characters: the counter and the error say so, and Continue waits. */
export const NameTooLong: Story = {
  play: async ({ canvas }) => {
    const input = await canvas.findByLabelText('Business name')
    await userEvent.type(input, 'Glow Studio: hair, nails, brows and lashes in the heart of the city since 2015, ok')
    await expect(canvas.getByRole('alert')).toHaveTextContent('Too long: up to 80 characters.')
    await expect(canvas.getByRole('button', { name: 'Continue' })).toHaveAccessibleDescription(
      'Shorten the business name to 80 characters.',
    )
  },
}

/** «Create a business» from the switcher: step 1 is the account, Cancel goes back, the account shows above the form. */
export const CreateAnother: Story = {
  args: { server: fakeApi({ workspaces: [glow] }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Create a business' })).toBeVisible()
    await expect(canvas.getByText('7 steps · about 5 minutes · free')).toBeVisible()
    await expect(canvas.getByText('Your Ýeral account')).toBeVisible()
    await expect(canvas.getByRole('button', { name: /Account/ })).toBeDisabled()
    await expect(canvas.getByRole('link', { name: 'Cancel' })).toBeVisible()
  },
}

/**
 * An unfinished setup reopens at its saved step; Back and the done steps lead to the earlier ones. The draft names its
 * category in the account's language, which isn't the list's: the business step picks it by its id.
 */
export const Reopens: Story = {
  args: {
    server: fakeApi({
      draft: {
        slug: 'glow-studio',
        name: 'Glow Studio',
        step: 'hours',
        category: 'Gözellik',
        categoryId: 'beauty',
        logo: null,
        address: { line: '247 Bitarap Türkmenistan Avenue', city },
      },
    }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Your hours' })).toBeVisible()
    await expect(canvas.getByText('247 Bitarap Türkmenistan Avenue, Ashgabat')).toBeVisible()
    await expect(canvas.getByRole('button', { name: /Services/ })).toBeDisabled()
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Where will clients find you?' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /Business/ }))
    await expect(await canvas.findByLabelText('Business name')).toHaveValue('Glow Studio')
    await expect(canvas.getByRole('radio', { name: 'Beauty' })).toBeChecked()
  },
}

/** «Continue later» saves the step and says where setup reopens. */
export const ContinueLater: Story = {
  args: {
    server: fakeApi({
      draft: {
        slug: 'glow-studio',
        name: 'Glow Studio',
        step: 'address',
        category: 'Beauty',
        categoryId: 'beauty',
        logo: null,
        address: null,
      },
    }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Where will clients find you?' })).toBeVisible()
    await userEvent.click(canvas.getAllByRole('button', { name: 'Continue later' })[0]!)
    const toast = await within(document.body).findByText('Saved. Log in again with +993 65 10 20 30 and setup reopens at “Address”.')
    // the toast slides in
    await waitFor(() => expect(toast).toBeVisible())
  },
}

/** Signed out: the sign-in comes first. */
export const SignedOut: Story = {
  args: { server: fakeApi({ signedIn: false }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  },
}

/** Phones and tablets: the header with «2 / 8 · Business», Continue later and the progress bar instead of the aside. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('progressbar', { name: 'Setup steps' })).toHaveAttribute('aria-valuetext', 'Step 2 of 8')
  },
}

const addressDraft: Draft = {
  slug: 'glow-studio',
  name: 'Glow Studio',
  step: 'address',
  category: 'Beauty',
  categoryId: 'beauty',
  logo: null,
  address: null,
}

/**
 * The address step: the map waits behind «Pick the address first»; the search lists what it finds, a pick puts the pin
 * there; the entrance note counts its letters; Continue saves the address and opens the hours with it in the list.
 */
export const Address: Story = {
  args: { server: fakeApi({ draft: addressDraft }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Where will clients find you?' })).toBeVisible()
    await expect(canvas.getByText('Pick the address first')).toBeVisible()
    const cont = canvas.getByRole('button', { name: 'Continue' })
    await expect(cont).toHaveAccessibleDescription('Pick the address from the list.')
    await userEvent.type(canvas.getByRole('combobox', { name: 'Address' }), '247 Bitarap')
    const list = await canvas.findByRole('listbox', { name: 'Address suggestions' })
    await expect(within(list).getAllByRole('option')).toHaveLength(2)
    await userEvent.click(within(list).getByRole('option', { name: /247\/1 Bitarap/ }))
    await expect(canvas.getByRole('combobox', { name: 'Address' })).toHaveValue('247/1 Bitarap Türkmenistan Avenue')
    await expect(await canvas.findByRole('button', { name: 'Pin on the map. Move it with the arrow keys' })).toBeVisible()
    await expect(canvas.getByText('Drag the pin to fine-tune it')).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Where is the entrance?'), 'Through the courtyard')
    await expect(canvas.getByText('21 / 200')).toBeVisible()
    await expect(cont).toBeEnabled()
    await userEvent.click(cont)
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Your hours' })).toBeVisible()
    await expect(canvas.getByText('247/1 Bitarap Türkmenistan Avenue, Ashgabat')).toBeVisible()
  },
}

/** No address search here: the typed street is the one choice, and the pin is placed by hand. */
export const AddressByHand: Story = {
  args: { server: fakeApi({ draft: addressDraft, search: false }) },
  play: async ({ canvas }) => {
    const input = await canvas.findByRole('combobox', { name: 'Address' })
    await userEvent.type(input, '12 Oguzhan Street')
    const option = await canvas.findByRole('option', { name: /12 Oguzhan Street/ })
    await expect(option).toHaveTextContent('Street · you place the pin yourself · Ashgabat')
    await userEvent.click(option)
    await expect(await canvas.findByRole('button', { name: 'Pin on the map. Move it with the arrow keys' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Continue' })).toBeEnabled()
  },
}

/** Working from home: the approximate circle instead of the pin, and the note on who sees the exact address. */
export const AddressFromHome: Story = {
  args: {
    server: fakeApi({ draft: { ...addressDraft, address: { line: '12 Oguzhan Street', city } } }),
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'I work from home' }))
    await expect(await canvas.findByRole('button', { name: /The approximate area/ })).toBeVisible()
    await expect(canvas.getByText(/The exact address shows only after a booking is confirmed/)).toBeVisible()
    await expect(canvas.getByText('Clients see only the approximate area — you can drag the circle')).toBeVisible()
  },
}

const atHours: Draft = {
  slug: 'glow-studio',
  name: 'Glow Studio',
  step: 'hours',
  category: 'Beauty',
  categoryId: 'beauty',
  logo: null,
  address: { line: '247 Bitarap Türkmenistan Avenue', city },
}

/**
 * The hours step of a new business: the drawn week, «Same hours Monday to Friday» on (Tuesday to Friday follow Monday
 * and can't be changed on their own), a closed day, a break; Continue saves the week and the step list sums it up.
 */
export const Hours: Story = {
  args: { server: fakeApi({ draft: atHours }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Your hours' })).toBeVisible()
    await expect(canvas.getByRole('switch', { name: 'Same hours Monday to Friday' })).toBeChecked()
    await expect(canvas.getAllByText('Same as Monday')).toHaveLength(4)
    await expect(canvas.getByRole('combobox', { name: 'Tuesday: closes' })).toBeDisabled()
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Monday: closes' }), '18:00')
    await expect(canvas.getByRole('combobox', { name: 'Friday: closes' })).toHaveDisplayValue('18:00')
    await userEvent.click(canvas.getByRole('button', { name: 'Monday: add a break' }))
    await expect(canvas.getByRole('combobox', { name: 'Monday: break starts' })).toHaveDisplayValue('13:00')
    await expect(canvas.getByRole('combobox', { name: 'Thursday: break ends' })).toHaveDisplayValue('14:00')
    await userEvent.click(canvas.getByRole('switch', { name: 'Sunday: open' }))
    await expect(within(canvas.getByRole('group', { name: 'Sunday' })).getByText('Closed')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Your services' })).toBeVisible()
    await expect(canvas.getByText('Mo–Fr 09:00–18:00, Sa 09:00–20:00')).toBeVisible()
  },
}

/**
 * A day past midnight: the same time on both is refused, a close that runs into the next day's opening says which
 * day, and one that ends before it is the next day's with its pill. Continue waits while a day has a problem.
 */
export const HoursPastMidnight: Story = {
  args: { server: fakeApi({ draft: atHours }) },
  play: async ({ canvas }) => {
    const opens = await canvas.findByRole('combobox', { name: 'Sunday: opens' })
    const closes = canvas.getByRole('combobox', { name: 'Sunday: closes' })
    const cont = canvas.getByRole('button', { name: 'Continue' })
    await userEvent.selectOptions(opens, '18:00')
    await expect(canvas.getByRole('alert')).toHaveTextContent('Opening and closing can’t be at the same time.')
    await expect(cont).toBeDisabled()
    await expect(cont).toHaveAccessibleDescription('Check the times.')
    await userEvent.selectOptions(closes, '10:00')
    await expect(canvas.getByRole('alert')).toHaveTextContent('Closes after Monday opens. Pick an earlier time.')
    await userEvent.selectOptions(closes, '02:00')
    await expect(canvas.getByText('until 02:00, next day')).toBeVisible()
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
    await expect(cont).toBeEnabled()
  },
}

/** Every day closed: Continue waits for an open day. */
export const HoursAllClosed: Story = {
  args: { server: fakeApi({ draft: atHours }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'Same hours Monday to Friday' }))
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      await userEvent.click(canvas.getByRole('switch', { name: `${day}: open` }))
    await expect(canvas.getByRole('button', { name: 'Continue' })).toHaveAccessibleDescription('At least one day must be open.')
  },
}
