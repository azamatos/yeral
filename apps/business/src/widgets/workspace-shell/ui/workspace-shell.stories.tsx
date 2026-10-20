/**
 * The workspace shell — B-Shell and B-Mobile (v0.6, English), book B-10 and B-12 step 1. The app's own shell over a
 * `fetch` that answers like the api: the sidebar from 1024, the rail from 768, the tab bar and More under 768; the
 * switcher, the account menu, the counts the api gives, and a waiting invite's note. Demo people: Maýsa owns Glow Studio
 * and Glow Nails; Aýna is a Specialist at Glow Studio and owns her own studio.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useParams } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import type { InviteCard, Workspace } from '@yeral/contract/team'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SectionPage } from '@/pages/section'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from './workspace-shell'

const DAY = 86_400_000
const city = { id: 'ashgabat', name: 'Ashgabat' }
const notifications = { confirmation: true, reminderDay: true, reminder2h: true, reviewAsk: false }

const person = (phone: string, firstName: string, surname: string): Me => ({
  id: `u-${phone}`,
  name: `${firstName} ${surname}`,
  firstName,
  surname,
  phone,
  lang: 'en',
  notifications,
  hasBusiness: true,
  canChangePhone: true,
})

const workspace = (slug: string, name: string, level: Workspace['level'], requestsToAnswer: number): Workspace => ({
  slug,
  name,
  address: '247 Bitarap Türkmenistan Avenue',
  city,
  photo: null,
  level,
  requestsToAnswer,
  lastOpenedAt: 1,
})

const invite: InviteCard = {
  id: 'inv-1',
  business: { slug: 'bag-kafe', name: 'Bag kafe', category: 'Beauty', address: '12 Magtymguly Avenue', city, photo: null },
  invitedBy: 'Merdan Ataýew',
  level: 'specialist',
  answersRequests: true,
  state: 'pending',
  sentAt: Date.now() - DAY,
  expiresAt: Date.now() + 6 * DAY,
}

interface Account {
  me: Me
  workspaces: Workspace[]
  current: string
  invites: InviteCard[]
}

const MAYSA: Account = {
  me: person('+99365102030', 'Maýsa', 'Annaýewa'),
  workspaces: [workspace('glow-studio', 'Glow Studio', 'owner', 6), workspace('glow-nails', 'Glow Nails', 'owner', 2)],
  current: 'glow-studio',
  invites: [],
}
const AYNA: Account = {
  me: person('+99365312210', 'Aýna', 'Myradowa'),
  workspaces: [workspace('glow-studio', 'Glow Studio', 'specialist', 2), workspace('ayna-studio', 'Aýnanyň saç studiýasy', 'owner', 1)],
  current: 'glow-studio',
  invites: [],
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell asks it, with its own copy of the account. */
const fakeApi =
  (who: Account): (() => typeof fetch) =>
  () => {
    const account = structuredClone(who)
    let signedIn = true
    return (input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(answer(new Request(input, init)))
    function answer(request: Request): Response {
      const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
      if (route === 'POST /auth/logout') {
        signedIn = false
        return new Response(null, { status: 204 })
      }
      if (!signedIn) return json({ error: { code: 'unauthorized' } }, 401)
      if (route === 'GET /me') return json(account.me)
      if (route === 'GET /me/workspaces') return json({ items: account.workspaces, current: account.current })
      if (route === 'GET /me/invites') return json({ items: account.invites })
      const opened = /^POST \/me\/workspaces\/([^/]+)\/open$/.exec(route)
      if (opened?.[1]) {
        account.current = opened[1]
        return new Response(null, { status: 204 })
      }
      return json({ error: { code: 'not_found' } }, 404)
    }
  }

function Login() {
  return <p>Log in</p>
}
function Setup() {
  const { step } = useParams({ strict: false })
  return <p>Setup: {step}</p>
}

const layouts = {
  '/w/$slug': {
    component: WorkspaceShell,
    children: {
      calendar: () => <SectionPage section="calendar" />,
      bookings: () => <SectionPage section="bookings" />,
      clients: () => <SectionPage section="clients" />,
      reviews: () => <SectionPage section="reviews" />,
      settings: () => <SectionPage section="settings" />,
    },
  },
}

const meta = {
  title: 'Business/Shell/Workspace',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: {
    routes: { '/login': Login, '/setup/$step': Setup },
    layouts,
    path: '/w/glow-studio/calendar',
    server: fakeApi(MAYSA),
  },
  argTypes: { routes: { control: false }, layouts: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** Owner, 1440: the 248 sidebar, Bookings with the 6 requests she may answer; the tab title names the workspace. */
export const Owner: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Calendar' })).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Calendar · Glow Studio · Ýeral Business'))
    const nav = canvas.getAllByRole('navigation', { name: 'Main menu' }).find((n) => n.checkVisibility())
    await expect(nav).toBeDefined()
    const menu = within(nav!)
    await expect(menu.getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page')
    await expect(menu.getByRole('link', { name: 'Bookings 6 requests' })).toBeVisible()
    await expect(menu.getByRole('link', { name: 'Settings' })).toBeVisible()
    await userEvent.click(menu.getByRole('link', { name: 'Clients' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Clients' })).toBeVisible()
  },
}

/** Switching keeps the section: Clients of Glow Studio → Clients of Glow Nails, which becomes the last used. */
export const Switch: Story = {
  args: { path: '/w/glow-studio/clients' },
  play: async ({ canvas }) => {
    const switcher = (await canvas.findAllByRole('button', { name: 'Workspace: Glow Studio, Owner. Switch' })).find((b) =>
      b.checkVisibility(),
    )
    await userEvent.click(switcher!)
    const menu = await within(document.body).findByRole('menu', { name: 'Your workspaces' })
    await userEvent.click(within(menu).getByRole('menuitemradio', { name: /Glow Nails.*2 requests/ }))
    await waitFor(() => expect(document.title).toBe('Clients · Glow Nails · Ýeral Business'))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Clients' })).toBeVisible()
  },
}

/** "Create a business" (B-10): the setup wizard at its business step, already signed in. */
export const CreateBusiness: Story = {
  play: async ({ canvas }) => {
    const switcher = (await canvas.findAllByRole('button', { name: /Switch$/ })).find((b) => b.checkVisibility())
    await userEvent.click(switcher!)
    await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'Create a business' }))
    await expect(await canvas.findByText('Setup: business')).toBeVisible()
  },
}

/** The account menu: Open as a client (the client site, same account) and Log out, back to the sign-in. */
export const AccountMenu: Story = {
  play: async ({ canvas }) => {
    const button = (await canvas.findAllByRole('button', { name: 'Account menu' })).find((b) => b.checkVisibility())
    await userEvent.click(button!)
    const menu = await within(document.body).findByRole('menu', { name: 'Account' })
    await expect(within(menu).getByRole('menuitem', { name: /Open as a client/ })).toHaveAttribute('target', '_blank')
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Log out' }))
    await expect(await canvas.findByText('Log in')).toBeVisible()
  },
}

/** Specialist (Aýna): no Settings at all; Bookings counts her own requests. */
export const Specialist: Story = {
  args: { server: fakeApi(AYNA) },
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { level: 1, name: 'Calendar' })
    const nav = within(canvas.getAllByRole('navigation', { name: 'Main menu' }).find((n) => n.checkVisibility())!)
    await expect(nav.getByRole('link', { name: 'Bookings 2 requests' })).toBeVisible()
    await expect(nav.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  },
}

/** 1024: still the full sidebar. */
export const Laptop: Story = { globals: { viewport: { value: 'md' } } }

/** Tablet, 768: the 72 rail; names in tooltips, the count as a dot. */
export const Rail: Story = {
  globals: { viewport: { value: 'sm' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { level: 1, name: 'Calendar' })
    const nav = within(canvas.getAllByRole('navigation', { name: 'Main menu' }).find((n) => n.checkVisibility())!)
    const bookings = nav.getByRole('link', { name: 'Bookings 6 requests' })
    await userEvent.hover(bookings)
    await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent('Bookings · 6 requests')
  },
}

/** Phone, 390: the switcher strip on the calendar, the tab bar with More. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { level: 1, name: 'Calendar' })
    const tabs = within(canvas.getAllByRole('navigation', { name: 'Main menu' }).find((n) => n.checkVisibility())!)
    await expect(tabs.getByRole('link', { name: 'Bookings 6 requests' })).toBeVisible()
    await expect(canvas.getAllByRole('button', { name: 'Workspace: Glow Studio, Owner. Switch' }).some((b) => b.checkVisibility())).toBe(
      true,
    )
  },
}

/** More: the workspace, Reviews and Settings, the person, the client site, Log out. */
export const PhoneMore: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { level: 1, name: 'Calendar' })
    await userEvent.click(canvas.getByRole('button', { name: 'More' }))
    const sheet = await within(document.body).findByRole('dialog', { name: 'More' })
    await expect(within(sheet).getByText('Maýsa Annaýewa')).toBeVisible()
    await userEvent.click(within(sheet).getByRole('link', { name: 'Reviews' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Reviews' })).toBeVisible()
    await waitFor(() => expect(within(document.body).queryByRole('dialog', { name: 'More' })).not.toBeInTheDocument())
  },
}

/** Someone already signed in has an invite waiting (B-08): a note on the page; Open leads to the invite card. */
export const InviteWaiting: Story = {
  args: { server: fakeApi({ ...MAYSA, invites: [invite] }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Bag kafe')).toBeVisible()
    await userEvent.click(canvas.getByRole('link', { name: 'Open' }))
    await expect(await canvas.findByText('Log in')).toBeVisible()
  },
}

/** Long names: cut, never pushing the menus or counts out (the Russian-length check for words the person types). */
export const LongNames: Story = {
  args: {
    server: fakeApi({
      ...MAYSA,
      me: person('+99365102030', 'Gülälek', 'Nurmuhammedowa-Annaberdiýewa'),
      workspaces: [
        workspace('glow-studio', 'Glow Studio — gözellik salony we spa merkezi', 'owner', 126),
        workspace('glow-nails', 'Glow Nails dyrnak studiýasy', 'admin', 2),
      ],
    }),
  },
}
