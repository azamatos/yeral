/**
 * `/setup/{step}` — B-Onboarding (v0.6, English), design §27.2, book B-02–B-06 and Q-200: the wizard's frame and its
 * business step. The page runs as in the app: the real sdk and query cache over a `fetch` that answers like the api
 * (contract-shaped bodies and errors), so each story walks the wizard as a person would.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { Workspace } from '@yeral/contract/team'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { LAUNCH_CATEGORIES, PageStory } from '@/shared/storybook'
import { SetupPage } from './setup-page'

const city = { id: 'ashgabat', name: 'Ashgabat' }

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

type Draft = { slug: string; name: string; step: string; category: string; logo: null; address: { line: string; city: typeof city } | null }

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/**
 * The api as the wizard uses it. `signedIn`: false for nobody. `workspaces`: the person's businesses (one makes it
 * «Create a business»). `draft`: an unfinished setup.
 */
const fakeApi =
  ({ signedIn = true, workspaces = [], draft = null }: { signedIn?: boolean; workspaces?: Workspace[]; draft?: Draft | null } = {}) =>
  (): typeof fetch => {
    let setup = draft && { ...draft }
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init)
      const path = new URL(request.url).pathname.replace(/^\/v1/, '')
      const body = (request.method === 'GET' ? {} : await request.json().catch(() => ({}))) as Record<string, unknown>
      const route = `${request.method} ${path}`
      if (route === 'GET /auth/mode') return json({ codeOnScreen: true })
      if (route === 'GET /me') return json(signedIn ? maysa : null)
      if (route === 'GET /me/workspaces') return json({ items: workspaces, current: workspaces[0]?.slug ?? null })
      if (route === 'GET /me/setup') return json({ setup })
      if (route === 'GET /categories')
        return json({
          items: LAUNCH_CATEGORIES.map((c) => ({ ...c, icon: 'store', bookingTypes: ['appointment'], specialistWord: '', intro: '' })),
        })
      if (route === 'POST /setup') {
        if (setup) return json({ error: { code: 'setup_in_progress', details: { slug: setup.slug } } }, 409)
        const category = LAUNCH_CATEGORIES.find((c) => c.id === body.categoryId)!
        setup = { slug: 'glow-studio-2', name: String(body.name), step: 'address', category: category.name, logo: null, address: null }
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
        if (category) setup.category = category.name
        return json({})
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
    await expect(within(steps).getByText('Glow Studio · Beauty')).toBeVisible()
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

/** An unfinished setup reopens at its saved step; Back and the done steps lead to the earlier ones. */
export const Reopens: Story = {
  args: {
    server: fakeApi({
      draft: {
        slug: 'glow-studio',
        name: 'Glow Studio',
        step: 'hours',
        category: 'Beauty',
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
      draft: { slug: 'glow-studio', name: 'Glow Studio', step: 'address', category: 'Beauty', logo: null, address: null },
    }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Where will clients find you?' })).toBeVisible()
    await userEvent.click(canvas.getAllByRole('button', { name: 'Continue later' })[0]!)
    await expect(
      await within(document.body).findByText('Saved. Log in again with +993 65 10 20 30 and setup reopens at “Address”.'),
    ).toBeVisible()
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
