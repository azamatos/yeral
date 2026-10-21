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
  photo: null,
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
  /** Numbers on other accounts: a change to one is refused. */
  taken?: string[]
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
    return (input: RequestInfo | URL, init?: RequestInit) => answer(new Request(input, init))
    async function answer(request: Request): Promise<Response> {
      const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
      const body = (request.method === 'GET' ? {} : await request.json().catch(() => ({}))) as Record<string, unknown>
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
      if (route === 'PATCH /me') {
        const firstName = String(body.firstName)
        const surname = (body.surname as string | null) ?? null
        account.me = { ...account.me, firstName, surname, name: [firstName, surname].filter(Boolean).join(' ') }
        return json(account.me)
      }
      // the number change (B-13): the code on the screen, as at the first launch where it's allowed
      if (route === 'POST /me/phone/code') {
        if (!account.me.canChangePhone) return json({ error: { code: 'phone_change_unavailable' } }, 409)
        if (account.taken?.includes(String(body.phone))) return json({ error: { code: 'phone_taken' } }, 409)
        return json({ resendAfterSec: 59, expiresInSec: 300, code: '4821' })
      }
      if (route === 'POST /me/phone/verify') {
        if (body.code !== '4821') return json({ error: { code: 'code_invalid', details: { attemptsLeft: 2 } } }, 400)
        account.me = { ...account.me, phone: String(body.phone) }
        return json(account.me)
      }
      const left = /^POST \/w\/([^/]+)\/leave$/.exec(route)
      if (left?.[1]) {
        const here = account.workspaces.find((w) => w.slug === left[1])
        if (!here) return json({ error: { code: 'not_found' } }, 404)
        if (here.level === 'owner') return json({ error: { code: 'owner_cannot_leave' } }, 409)
        account.workspaces = account.workspaces.filter((w) => w !== here)
        account.current = account.workspaces[0]?.slug ?? ''
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
type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']

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

/** Opens My profile from the visible account menu. */
async function openProfile(canvas: Canvas) {
  const button = (await canvas.findAllByRole('button', { name: 'Account menu' })).find((b) => b.checkVisibility())
  await userEvent.click(button!)
  await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'My profile' }))
  const drawer = await within(document.body).findByRole('dialog', { name: 'My profile' })
  await waitFor(() => expect(drawer).toBeVisible())
  return within(drawer)
}

/** My profile, the owner (B-12): the name, the number with Change number, My workspaces; she can't leave. */
export const MyProfile: Story = {
  play: async ({ canvas }) => {
    const drawer = await openProfile(canvas)
    await expect(drawer.getByText('Your Ýeral account — the same in every workspace')).toBeVisible()
    await expect(drawer.getByLabelText('First name')).toHaveValue('Maýsa')
    await expect(drawer.getByText('+993 65 10 20 30')).toBeVisible()
    await expect(drawer.getByText('Glow Nails')).toBeVisible()
    await expect(drawer.getByText(/You’re the owner of Glow Studio, so you can’t leave it/)).toBeVisible()
    await expect(drawer.queryByRole('button', { name: 'Leave this business' })).not.toBeInTheDocument()
    // the name: saved, and the drawer closes
    const last = drawer.getByLabelText(/Last name/)
    await userEvent.clear(last)
    await userEvent.type(last, 'Myradowa')
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }))
    const toastShown = await within(document.body).findByText('Saved')
    await waitFor(() => expect(toastShown).toBeVisible())
    await waitFor(() => expect(within(document.body).queryByRole('dialog', { name: 'My profile' })).not.toBeInTheDocument())
  },
}

/** By keyboard: Esc closes it, and the focus is back on the account menu's button. */
export const MyProfileKeyboard: Story = {
  play: async ({ canvas }) => {
    await openProfile(canvas)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(within(document.body).queryByRole('dialog', { name: 'My profile' })).not.toBeInTheDocument())
    const button = canvas.getAllByRole('button', { name: 'Account menu' }).find((b) => b.checkVisibility())
    await waitFor(() => expect(button).toHaveFocus())
  },
}

/** A first name is required (Q-156); the surname may go. */
export const MyProfileNoFirstName: Story = {
  play: async ({ canvas }) => {
    const drawer = await openProfile(canvas)
    await userEvent.clear(drawer.getByLabelText('First name'))
    await userEvent.click(drawer.getByRole('button', { name: 'Save' }))
    await expect(drawer.getByRole('alert')).toHaveTextContent('Enter your first name.')
  },
}

/** Change number (B-13): the new number, the code on the screen, done → "Phone number changed". */
export const ChangeNumber: Story = {
  play: async ({ canvas }) => {
    const drawer = await openProfile(canvas)
    await userEvent.click(drawer.getByRole('button', { name: 'Change number' }))
    // the focus moves into the box
    await waitFor(() => expect(drawer.getByLabelText('New phone number')).toHaveFocus())
    // her own number isn't a change
    await userEvent.keyboard('65102030{Enter}')
    await expect(await drawer.findByRole('alert')).toHaveTextContent('This is already your number')
    await userEvent.clear(drawer.getByLabelText('New phone number'))
    await userEvent.type(drawer.getByLabelText('New phone number'), '61057732')
    await userEvent.click(drawer.getByRole('button', { name: 'Send code' }))
    await expect(await drawer.findByText('+993 61 05 77 32')).toBeVisible()
    await expect(drawer.getByText('4821')).toBeVisible()
    await expect(drawer.getByText('Until the new number is verified you can log in with the old one.')).toBeVisible()
    await userEvent.keyboard('4821')
    const toastShown = await within(document.body).findByText('Phone number changed')
    await waitFor(() => expect(toastShown).toBeVisible())
    await waitFor(() => expect(drawer.queryByLabelText('Code')).not.toBeInTheDocument())
  },
}

/** Cancel closes the box and gives the focus back to "Change number". */
export const ChangeNumberCancel: Story = {
  play: async ({ canvas }) => {
    const drawer = await openProfile(canvas)
    await userEvent.click(drawer.getByRole('button', { name: 'Change number' }))
    await userEvent.click(drawer.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(drawer.getByRole('button', { name: 'Change number' })).toHaveFocus())
    await expect(drawer.queryByLabelText('New phone number')).not.toBeInTheDocument()
  },
}

/** A number on another account: the field says so. */
export const ChangeNumberTaken: Story = {
  args: { server: fakeApi({ ...MAYSA, taken: ['+99361057732'] }) },
  play: async ({ canvas }) => {
    const drawer = await openProfile(canvas)
    await userEvent.click(drawer.getByRole('button', { name: 'Change number' }))
    await userEvent.type(drawer.getByLabelText('New phone number'), '61057732{Enter}')
    await expect(await drawer.findByRole('alert')).toHaveTextContent('This number is used by another account')
  },
}

/** While the sign-in code shows on the screen the number can't change (`canChangePhone`): not offered at all. */
export const ChangeNumberUnavailable: Story = {
  args: { server: fakeApi({ ...MAYSA, me: { ...MAYSA.me, canChangePhone: false } }) },
  play: async ({ canvas }) => {
    const drawer = await openProfile(canvas)
    await expect(drawer.queryByRole('button', { name: 'Change number' })).not.toBeInTheDocument()
    await expect(drawer.getByText(/with this number\.$/)).toBeVisible()
  },
}

/** A Specialist leaves (B-15): asked once (the focus on Cancel), then her own studio opens. */
export const LeaveWorkspace: Story = {
  args: { server: fakeApi(AYNA) },
  play: async ({ canvas }) => {
    const drawer = await openProfile(canvas)
    await userEvent.click(drawer.getByRole('button', { name: 'Leave this business' }))
    let confirm = await within(document.body).findByRole('dialog', { name: 'Leave Glow Studio?' })
    await waitFor(() => expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus())
    // not now: back on the button that asked
    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(drawer.getByRole('button', { name: 'Leave this business' })).toHaveFocus())
    await userEvent.click(drawer.getByRole('button', { name: 'Leave this business' }))
    confirm = await within(document.body).findByRole('dialog', { name: 'Leave Glow Studio?' })
    await userEvent.click(within(confirm).getByRole('button', { name: 'Leave Glow Studio' }))
    await waitFor(() => expect(document.title).toBe('Calendar · Aýnanyň saç studiýasy · Ýeral Business'))
  },
}

/** My profile on a phone: from More, as a bottom sheet. */
export const MyProfilePhone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await canvas.findByRole('heading', { level: 1, name: 'Calendar' })
    await userEvent.click(canvas.getByRole('button', { name: 'More' }))
    const sheet = await within(document.body).findByRole('dialog', { name: 'More' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'My profile' }))
    await expect(await within(document.body).findByRole('dialog', { name: 'My profile' })).toBeVisible()
    // closed: back on More, where it came from
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(canvas.getByRole('button', { name: 'More' })).toHaveFocus())
  },
}
