/**
 * `/setup/{step}` — B-Onboarding (v0.6, English), design §27.2, book B-02–B-06 and Q-200: the wizard's frame and its
 * business step. The page runs as in the app: the real sdk and query cache over a `fetch` that answers like the api
 * (contract-shaped bodies and errors), so each story walks the wizard as a person would.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { WeekdayHours } from '@yeral/contract/settings'
import type { Menu } from '@yeral/contract/services'
import type { SetupServices } from '@yeral/contract/setup'
import type { TeamMember, Workspace } from '@yeral/contract/team'
import { DEFAULT_RULES } from '@yeral/domain/rules'
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
/** What the rules step sent, one body per save (the fake api fills it). */
const rulesSaved: Record<string, unknown>[] = []
/** What the team step sent, one body per save. */
const teamSaved: Record<string, unknown>[] = []
/** The drafts finished (`POST …/setup/finish`), by page address. */
const finished: string[] = []
/** What the services step sent, one body per save (the fake api fills it). */
const servicesSaved: SetupServices[] = []

/** Beauty's starter list as `GET /v1/categories` gives it (a part of the seed's); the other categories have none here. */
const beautyStarters = [
  {
    id: 'hair',
    name: 'Hair',
    services: [
      { id: 'womens-haircut', name: 'Women’s haircut', durationMin: 60, price: { type: 'fixed', amount: 80 } },
      { id: 'hair-colouring', name: 'Hair colouring', durationMin: 120, price: { type: 'from', amount: 250 } },
    ],
  },
  { id: 'nails', name: 'Nails', services: [{ id: 'manicure', name: 'Manicure', durationMin: 60, price: { type: 'fixed', amount: 60 } }] },
]

const member = (id: string, name: string, level: TeamMember['level'], hasApp = true): TeamMember => ({
  id,
  name,
  fullName: null,
  specialization: null,
  phone: '+99365000000',
  level,
  status: 'active',
  hasApp,
  bookable: level !== 'admin',
  canAnswerOwn: false,
  joined: true,
  photo: null,
  invite: null,
})
const owner = member('owner', 'Maýsa', 'owner')

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/**
 * The api as the wizard uses it. `signedIn`: false for nobody (the sign-in answers code «4821» for any number and makes
 * a new account without a name), `'noName'` for a new account that hasn't given its name. `workspaces`: the person's businesses (one makes it
 * «Create a business»). `draft`: an unfinished setup. `search`: `false` when the address search isn't there
 * (`address_search_unavailable`). `hours`: the draft's week (every day closed, as a new draft's). `team`: the draft's
 * people besides the owner. Each `PATCH …/settings/rules` body lands in `rulesSaved`. `photos`: the gallery's count.
 * `missing`: what `POST …/setup/finish` finds missing; a finish lands in `finished`.
 */
const fakeApi =
  ({
    signedIn = true,
    workspaces = [],
    draft = null,
    search = true,
    hours = [null, null, null, null, null, null, null],
    team = [],
    photos = 0,
    missing = [],
  }: {
    signedIn?: boolean | 'noName'
    workspaces?: Workspace[]
    draft?: Draft | null
    search?: boolean
    hours?: Day[]
    team?: TeamMember[]
    /** The draft's gallery: this many photos. */
    photos?: number
    /** What finishing finds missing (`setup_incomplete`); empty: it finishes. */
    missing?: string[]
  } = {}) =>
  (): typeof fetch => {
    const nameless = (phone: string): Me => ({ ...maysa, phone, name: null, firstName: null, surname: null })
    let me: Me | null = signedIn === true ? maysa : signedIn === 'noName' ? nameless(maysa.phone) : null
    let setup = draft && { ...draft }
    let week = hours
    // the draft's booking rules as the rules step reads and saves them
    let rules = { ...DEFAULT_RULES, lateMinutes: 15 }
    rulesSaved.length = 0
    let people = team
    teamSaved.length = 0
    finished.length = 0
    // the draft's menu as the services step reads and saves it
    let menu: Menu = { groups: [] }
    servicesSaved.length = 0
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
      if (route === 'GET /me') return json(me)
      if (route === 'POST /auth/code') return json({ resendAfterSec: 59, expiresInSec: 300, code: '4821' })
      if (route === 'POST /auth/verify') {
        if (body.code !== '4821') return json({ error: { code: 'code_invalid', details: { attemptsLeft: 2 } } }, 400)
        me = nameless(String(body.phone))
        return json({ me, isNew: true })
      }
      if (route === 'POST /auth/logout') {
        me = null
        return new Response(null, { status: 204 })
      }
      if (route === 'PATCH /me' && me) {
        me = { ...me, firstName: String(body.firstName), surname: (body.surname as string | null) ?? null }
        me.name = [me.firstName, me.surname].filter(Boolean).join(' ')
        return json(me)
      }
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
      if (/^GET \/w\/[^/]+\/settings\/rules$/.test(route)) return json(rules)
      if (/^PATCH \/w\/[^/]+\/settings\/rules$/.test(route)) {
        rulesSaved.push(body)
        rules = { ...rules, ...body }
        return json(rules)
      }
      // the draft's team: the owner and `team`; the team step saves it whole
      if (/^GET \/w\/[^/]+\/team$/.test(route)) return json({ items: [owner, ...people] })
      if (/^PUT \/w\/[^/]+\/setup\/team$/.test(route)) {
        teamSaved.push(body)
        const members = (body.members ?? []) as { name: string; phone: string; level: 'specialist' | 'admin'; hasApp: boolean }[]
        people = members.map((m, i) => ({
          ...member(`t${i}`, m.name, m.level, m.hasApp),
          phone: m.phone,
          status: m.hasApp ? 'invited' : 'active',
          joined: false,
        }))
        return json({ items: [owner, ...people] })
      }
      if (/^GET \/w\/[^/]+\/services$/.test(route)) return json(menu)
      if (/^PUT \/w\/[^/]+\/setup\/services$/.test(route)) {
        const sent = body as unknown as SetupServices
        servicesSaved.push(sent)
        // the starters' names from the list, a row saved before by its id, the others as written
        const starters = beautyStarters.flatMap((g) => g.services)
        const before = menu.groups.flatMap((g) => g.services)
        menu = {
          groups: sent.groups.map((g, gi) => {
            const id = g.id ?? `g${gi}-${servicesSaved.length}`
            const old = menu.groups.find((x) => x.id === g.id)
            return {
              id,
              name: g.name ?? old?.name ?? { en: beautyStarters.find((x) => x.id === g.starter)?.name ?? '' },
              services: g.services.map((x, si) => ({
                id: x.id ?? `s${gi}-${si}-${servicesSaved.length}`,
                groupId: id,
                // the api keeps a starter's every language, the catalogue's others too
                name: x.name ??
                  before.find((y) => y.id === x.id)?.name ?? { tk: 'Saç', en: starters.find((y) => y.id === x.starter)?.name ?? '' },
                description: null,
                durationMin: x.durationMin,
                priceType: x.priceType,
                priceAmount: x.priceAmount,
                bufferMin: null,
                online: true,
                staffIds: ['owner'],
                futureBookings: 0,
              })),
            }
          }),
        }
        return json(menu)
      }
      if (route === 'GET /categories')
        return json({
          items: LAUNCH_CATEGORIES.map((c) => ({
            ...c,
            icon: 'store',
            bookingTypes: ['appointment'],
            specialistWord: '',
            intro: '',
            starterGroups: c.id === 'beauty' ? beautyStarters : [],
          })),
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
      if (/^GET \/w\/[^/]+\/settings\/photos$/.test(route) && setup)
        return json({ items: Array.from({ length: photos }, (_, i) => ({ id: `p${i}`, url: `/photos/${i}.jpg`, alt: '' })) })
      const finish = /^POST \/w\/([^/]+)\/setup\/finish$/.exec(route)
      if (finish && setup) {
        if (missing.length) return json({ error: { code: 'setup_incomplete', details: { missing } } }, 409)
        finished.push(finish[1]!)
        setup = null
        return new Response(null, { status: 204 })
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

/**
 * Signed out: step 1 is the sign-in inside the wizard. Continue waits («Enter your number and get a code.»); the number,
 * then the code on the screen; the new account gives its name (Continue waits for the first name), and the business
 * step opens with step 1 done.
 */
export const SignedOut: Story = {
  args: { server: fakeApi({ signedIn: false }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Welcome to Ýeral Business' })).toBeVisible()
    await expect(canvas.getByText('Step 1 of 8')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    // the sign-in's own buttons lead: no Continue (or Continue later) before the number is verified
    await expect(canvas.queryByRole('button', { name: 'Continue' })).toBeNull()
    await expect(canvas.queryByRole('button', { name: /Continue later/ })).toBeNull()

    // the first launch shows the code on the screen: the number step says it's a demo (book Q-036)
    await expect(await canvas.findByText(/This is a demo of Ýeral/)).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Phone number'), '65102030')
    await userEvent.click(canvas.getByRole('button', { name: 'Send code' }))
    const code = await canvas.findByLabelText('Code', {}, { timeout: 3000 })
    await expect(canvas.getByRole('heading', { level: 1, name: 'Enter the code' })).toBeVisible()
    await waitFor(() => expect(code).toHaveFocus())
    await userEvent.keyboard('4821')

    await expect(await canvas.findByRole('heading', { level: 1, name: 'What’s your name?' })).toBeVisible()
    const first = canvas.getByRole('textbox', { name: 'First name' })
    await waitFor(() => expect(first).toHaveFocus())
    await expect(canvas.getByRole('button', { name: 'Continue' })).toHaveAccessibleDescription('Enter your first name.')
    // Enter in the name saves, as Continue does
    await userEvent.type(first, 'Maýsa{Enter}')
    await expect(await canvas.findByRole('heading', { level: 1, name: 'About your business' })).toBeVisible()
  },
}

/** Any other step signed out, or an unknown one, opens step 1. */
export const SignedOutLater: Story = {
  args: { server: fakeApi({ signedIn: false }), path: '/setup/somewhere' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Welcome to Ýeral Business' })).toBeVisible()
  },
}

/**
 * A new account without its name (signed in elsewhere): its name first; «Change number» signs out to the number, and
 * an unknown address signed out goes to step 1.
 */
export const NoName: Story = {
  args: { server: fakeApi({ signedIn: 'noName' }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'What’s your name?' })).toBeVisible()
    await expect(canvas.getByText('+993 65 10 20 30')).toBeVisible()
    await userEvent.type(canvas.getByRole('textbox', { name: 'First name' }), 'Maýsa')
    await userEvent.click(canvas.getByRole('button', { name: 'Change number' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Welcome to Ýeral Business' })).toBeVisible()
    // the number takes the focus (B-Login focusStep)
    await waitFor(() => expect(canvas.getByLabelText('Phone number')).toHaveFocus())
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

const atServices: Draft = { ...atHours, step: 'services' }

/**
 * The services step of a Beauty draft: the starter list in its groups, each group its own card, every row picked;
 * «Clear» a group, rename a starter, add an own service (its name, then its price, hold Continue) and name its group;
 * Continue sends the whole menu in one call (a renamed starter's name, an unchanged one's id only, the own group's
 * name) and the step list says how many.
 */
export const Services: Story = {
  args: { server: fakeApi({ draft: atServices }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Your services' })).toBeVisible()
    await expect(canvas.getByRole('heading', { level: 2, name: 'Suggested services for Beauty' })).toBeVisible()
    await expect(canvas.getByText('3 services selected')).toBeVisible()
    await expect(canvas.getByRole('checkbox', { name: 'Select: Women’s haircut' })).toBeChecked()
    await expect(canvas.getByRole('textbox', { name: 'Hair colouring: price (from)' })).toHaveValue('250')
    // Nails' «Clear», the second group's
    await userEvent.click(canvas.getAllByRole('button', { name: 'Clear' })[1]!)
    await expect(canvas.getByRole('checkbox', { name: 'Select: Manicure' })).not.toBeChecked()
    await expect(canvas.getByRole('button', { name: 'Select all' })).toBeVisible()
    await expect(canvas.getByRole('textbox', { name: 'Service name: Manicure' })).toBeDisabled()
    const haircut = canvas.getByRole('textbox', { name: 'Service name: Women’s haircut' })
    await userEvent.clear(haircut)
    await userEvent.type(haircut, 'Haircut')
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Haircut: duration' }), '45')
    await userEvent.click(canvas.getByRole('button', { name: 'Add service' }))
    const ownGroup = canvas.getByRole('textbox', { name: 'Group name: New services' })
    await expect(ownGroup).toHaveValue('New services')
    await expect(canvas.getByRole('region', { name: 'Hair' })).toBeVisible()
    const cont = canvas.getByRole('button', { name: 'Continue' })
    await expect(cont).toHaveAccessibleDescription('Name the new service.')
    await userEvent.type(canvas.getByRole('textbox', { name: 'Service name: New service' }), 'Henna')
    await expect(cont).toHaveAccessibleDescription('Add a price to each service.')
    await userEvent.type(canvas.getByRole('textbox', { name: 'Henna: price' }), '120')
    await expect(cont).toBeEnabled()
    await userEvent.clear(ownGroup)
    await expect(cont).toHaveAccessibleDescription('Name each group.')
    await userEvent.type(ownGroup, 'Brows')
    await userEvent.click(cont)
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Who do you work with?' })).toBeVisible()
    await expect(servicesSaved).toEqual([
      {
        groups: [
          {
            starter: 'hair',
            services: [
              { starter: 'womens-haircut', name: { en: 'Haircut' }, durationMin: 45, priceType: 'fixed', priceAmount: 80 },
              { starter: 'hair-colouring', durationMin: 120, priceType: 'from', priceAmount: 250 },
            ],
          },
          { name: { en: 'Brows' }, services: [{ name: { en: 'Henna' }, durationMin: 60, priceType: 'fixed', priceAmount: 120 }] },
        ],
      },
    ])
    await expect(canvas.getByText('3 services')).toBeVisible()
    // back at the step: the menu as saved, its rows by id; nothing changed sends nothing
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
    await expect(await canvas.findByRole('textbox', { name: 'Service name: Haircut' })).toHaveValue('Haircut')
    await expect(canvas.queryByRole('checkbox', { name: 'Select: Manicure' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Who do you work with?' })).toBeVisible()
    await expect(servicesSaved).toHaveLength(1)
    // a saved row renamed: by its id, in the market's languages only
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
    await userEvent.type(await canvas.findByRole('textbox', { name: 'Service name: Hair colouring' }), ' and toning')
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Who do you work with?' })).toBeVisible()
    await expect(servicesSaved[1]!.groups[0]!.services[1]).toEqual({
      id: 's0-1-1',
      name: { en: 'Hair colouring and toning' },
      durationMin: 120,
      priceType: 'from',
      priceAmount: 250,
    })
  },
}

/** A category without a starter list: the note, and «Add service» to start; Continue waits for one. */
export const ServicesOwn: Story = {
  args: { server: fakeApi({ draft: { ...atServices, category: 'Auto', categoryId: 'auto' } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Add your services' })).toBeVisible()
    await expect(canvas.getByText(/There’s no ready list for this category yet/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Continue' })).toHaveAccessibleDescription('Pick at least one service.')
    await userEvent.click(canvas.getByRole('button', { name: 'Add service' }))
    await expect(canvas.getByRole('combobox', { name: 'New service: duration' })).toHaveValue('60')
  },
}

const teamDraft: Draft = { ...addressDraft, step: 'team', address: { line: '247 Bitarap Türkmenistan Avenue', city } }

/**
 * The team step of a draft with nobody but its owner: «I work alone» with its note; «I have a team» gives an empty row
 * and Continue waits for someone. A specialist with the app hears where the invite shows; Continue saves the team in
 * one go and the rules step asks who answers requests.
 */
export const Team: Story = {
  args: { server: fakeApi({ draft: teamDraft }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Who do you work with?' })).toBeVisible()
    await expect(canvas.getByRole('radio', { name: /I work alone/ })).toHaveAttribute('aria-checked', 'true')
    await expect(canvas.getByText(/every booking comes to you/)).toBeVisible()
    await userEvent.click(canvas.getByRole('radio', { name: /I have a team/ }))
    const cont = canvas.getByRole('button', { name: 'Continue' })
    await expect(cont).toHaveAccessibleDescription('Add a team member or pick “I work alone”.')
    await userEvent.type(canvas.getByRole('textbox', { name: 'Name of team member 1' }), 'Aýna')
    await userEvent.type(canvas.getByRole('textbox', { name: 'Aýna: phone number' }), '65123456')
    await expect(canvas.getByText('They’ll see the invite when they sign in with +993 65 •• •• 56 · valid 7 days')).toBeVisible()
    await userEvent.click(cont)
    await expect(await canvas.findByRole('heading', { level: 1, name: 'How should bookings arrive?' })).toBeVisible()
    await expect(teamSaved).toEqual([{ members: [{ name: 'Aýna', phone: '+99365123456', level: 'specialist', hasApp: true }] }])
    await expect(await canvas.findByRole('radiogroup', { name: 'Who answers requests?' })).toBeVisible()
  },
}

/**
 * A row to fix: a mobile number for everyone; a specialist without the app is bookable at once; an administrator
 * always has the app; a number twice is taken. Continue waits while a filled row has a problem.
 */
export const TeamProblems: Story = {
  args: { server: fakeApi({ draft: teamDraft, team: [member('m1', 'Leýli', 'specialist', false)] }) },
  play: async ({ canvas }) => {
    const row = await canvas.findByRole('group', { name: 'Team member 1: Leýli' })
    await expect(within(row).getByRole('switch', { name: 'Uses the app' })).not.toBeChecked()
    await userEvent.click(canvas.getByRole('button', { name: 'Add a team member' }))
    await userEvent.type(canvas.getByRole('textbox', { name: 'Name of team member 2' }), 'Arslan')
    const phone = canvas.getByRole('textbox', { name: 'Arslan: phone number' })
    await userEvent.type(phone, '12345678')
    await expect(canvas.getByText('Mobile numbers only — enter a number starting with 6 or 7.')).toBeVisible()
    const cont = canvas.getByRole('button', { name: 'Continue' })
    await expect(cont).toHaveAccessibleDescription('Enter each person’s name and mobile number (8 digits).')
    const arslan = canvas.getByRole('group', { name: 'Team member 2: Arslan' })
    await userEvent.clear(phone)
    await userEvent.type(phone, '65123456')
    await expect(cont).toBeEnabled()
    await userEvent.click(within(arslan).getByRole('switch', { name: 'Uses the app' }))
    await expect(within(arslan).getByText(/Bookable at once, never signs in/)).toBeVisible()
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Arslan: access level' }), 'Admin')
    await expect(within(arslan).queryByRole('switch')).toBeNull()
    await expect(within(arslan).getByText(/They’ll see the invite/)).toBeVisible()
    await userEvent.clear(phone)
    await userEvent.type(phone, '65000000')
    await expect(within(arslan).getByText('This number is already on the team.')).toBeVisible()
    await expect(cont).toBeDisabled()
  },
}

/**
 * The focus follows the list: «Add a team member» puts it in the new row's name; removing a row moves it to the next
 * row's name (else the one before), and removing the last one to «Add a team member».
 */
export const TeamFocus: Story = {
  args: { server: fakeApi({ draft: teamDraft, team: [member('m1', 'Leýli', 'specialist', false)] }) },
  play: async ({ canvas }) => {
    await canvas.findByRole('group', { name: 'Team member 1: Leýli' })
    await userEvent.click(canvas.getByRole('button', { name: 'Add a team member' }))
    await expect(canvas.getByRole('textbox', { name: 'Name of team member 2' })).toHaveFocus()
    await userEvent.click(canvas.getByRole('button', { name: 'Remove: Leýli' }))
    // the new row is the first now
    await expect(canvas.getByRole('textbox', { name: 'Name of team member 1' })).toHaveFocus()
    await userEvent.click(canvas.getByRole('button', { name: 'Remove: New team member' }))
    await expect(canvas.getByRole('button', { name: 'Add a team member' })).toHaveFocus()
  },
}

const rulesDraft: Draft = { ...addressDraft, step: 'rules', address: { line: '247 Bitarap Türkmenistan Avenue', city } }

/**
 * The booking rules step of a draft with nobody but its owner: «I confirm» with a 30-minute hold, no «Who
 * answers requests?»;
 * instant confirmation hides the hold and says to block busy times; Continue saves only what changed and opens Done.
 */
export const Rules: Story = {
  args: { server: fakeApi({ draft: rulesDraft }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'How should bookings arrive?' })).toBeVisible()
    const manual = canvas.getByRole('radio', { name: /I confirm/ })
    await expect(manual).toHaveAttribute('aria-checked', 'true')
    await expect(manual).toHaveAccessibleName(/Recommended/)
    await expect(canvas.getByRole('combobox', { name: 'Hold requests for' })).toHaveValue('30')
    await expect(canvas.queryByRole('radiogroup', { name: 'Who answers requests?' })).toBeNull()
    await userEvent.click(canvas.getByRole('radio', { name: /Instant confirmation/ }))
    await expect(canvas.queryByRole('combobox', { name: 'Hold requests for' })).toBeNull()
    await expect(canvas.getByText(/Block the times you’re busy in the calendar/)).toBeVisible()
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Clients can cancel for free' }), 'Any time')
    await expect(canvas.getByRole('combobox', { name: 'Buffer' })).toHaveValue('10')
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio is ready!' })).toBeVisible()
    await expect(rulesSaved).toEqual([{ confirmMode: 'instant', cancelWindowMinutes: null }])
  },
}

/** With a team: who answers requests, «Both» by default; saved with the step. */
export const RulesWithTeam: Story = {
  args: { server: fakeApi({ draft: rulesDraft, team: [member('m1', 'Aýna', 'specialist'), member('m2', 'Leýli', 'specialist', false)] }) },
  play: async ({ canvas }) => {
    const who = await canvas.findByRole('radiogroup', { name: 'Who answers requests?' })
    await expect(within(who).getByRole('radio', { name: /Both/ })).toHaveAttribute('aria-checked', 'true')
    await userEvent.click(within(who).getByRole('radio', { name: /Each specialist/ }))
    await expect(canvas.getByText('Requests for specialists who don’t use the app always go to you and the admins.')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio is ready!' })).toBeVisible()
    await waitFor(() => expect(rulesSaved).toEqual([{ requestAnswerers: 'each' }]))
  },
}

const doneDraft: Draft = { ...rulesDraft, step: 'done' }
/** The workspace's calendar the done step finishes into: here only its heading. */
const Calendar = () => <h1>Calendar</h1>

/**
 * The done step: the page in review, the card clients will see, the page link with Copy and Share, the QR code with
 * its downloads, «Make your page stronger» with nothing done yet (the logo ringed as next). «Go to the calendar»
 * finishes the setup and opens the workspace's calendar.
 */
export const Done: Story = {
  args: {
    routes: { '/setup/$step': SetupPage, '/w/$slug/calendar': Calendar },
    path: '/setup/done',
    server: fakeApi({ draft: doneDraft }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio is ready!' })).toBeVisible()
    await expect(canvas.getByText(/Your page is in review/)).toBeVisible()
    await expect(canvas.getByText('Beauty · 247 Bitarap Türkmenistan Avenue, Ashgabat')).toBeVisible()
    const link = canvas.getByRole<HTMLInputElement>('textbox', { name: 'Your page link' })
    await expect(link.value).toMatch(/\/b\/glow-studio$/)
    await expect(canvas.getByRole('img', { name: 'QR code for Glow Studio’s page' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Download PNG' })).toBeVisible()
    const checklist = canvas.getByRole('heading', { level: 2, name: 'Make your page stronger' })
    await expect(checklist).toBeVisible()
    await expect(canvas.getByText('0 / 3 done')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Continue later' })).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Go to the calendar' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Calendar' })).toBeVisible()
    await expect(finished).toEqual(['glow-studio'])
  },
}

/** Three photos already: «Add 3+ photos» reads «Added», the first photo is the card's picture. */
export const DoneWithPhotos: Story = {
  args: { path: '/setup/done', server: fakeApi({ draft: doneDraft, photos: 3 }) },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText('1 / 3 done')).toBeVisible()
    // the card's picture is decorative: its name is printed under it
    await expect(canvasElement.querySelector('img[src="/photos/0.jpg"]')).toHaveAttribute('alt', '')
    await expect(canvas.getByText('Added')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Add photos' })).toBeNull()
  },
}

/** Finishing finds the services missing (`setup_incomplete`): the person hears why and the services step opens. */
export const DoneIncomplete: Story = {
  args: { path: '/setup/done', server: fakeApi({ draft: doneDraft, missing: ['services'] }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Go to the calendar' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Your services' })).toBeVisible()
    await expect(finished).toEqual([])
  },
}

/** Someone who came from another workspace hears where it went: the switcher, with the way back to it. */
export const DoneFromSwitcher: Story = {
  args: {
    path: '/setup/done',
    server: fakeApi({ draft: { ...doneDraft, slug: 'glow-studio-2', name: 'Glow Nails' }, workspaces: [glow] }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Nails is ready!' })).toBeVisible()
    await expect(canvas.getByText(/switch back to Glow Studio there/)).toBeVisible()
  },
}
