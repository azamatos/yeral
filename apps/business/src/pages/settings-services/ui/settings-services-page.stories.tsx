/**
 * Settings → Services — B-Services (v0.6 round 3, English), in the app's shell and Settings' frame over a `fetch` that
 * answers like the api: the menu group by group, each service's length (with its own buffer), price (a price at the
 * place with its hidden amount), who does it (invited people apart, «No one» in red) and the online switch, which
 * saves at once. Each `PATCH …/services/{id}` lands in `patched`.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { Menu } from '@yeral/contract/services'
import type { TeamMember, Workspace } from '@yeral/contract/team'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SettingsLayoutPage, SettingsPlaceholder } from '@/pages/settings'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { SettingsServicesPage } from './settings-services-page'

const me: Me = {
  id: 'u-maysa',
  name: 'Maýsa Annaýewa',
  firstName: 'Maýsa',
  surname: 'Annaýewa',
  phone: '+99365102030',
  lang: 'en',
  notifications: { confirmation: true, reminderDay: true, reminder2h: true, reviewAsk: false },
  hasBusiness: true,
  canChangePhone: true,
  demo: false,
  photo: null,
}

const glow: Workspace = {
  slug: 'glow-studio',
  name: 'Glow Studio',
  address: '247 Bitarap Türkmenistan Avenue',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  logo: null,
  level: 'owner',
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer: 0,
  requestsToAnswer: 0,
  lastOpenedAt: 1,
}

const member = (id: string, name: string, status: TeamMember['status'] = 'active'): TeamMember => ({
  id,
  name,
  fullName: null,
  specialization: null,
  phone: '+99365000000',
  level: 'specialist',
  status,
  hasApp: true,
  bookable: true,
  canAnswerOwn: false,
  joined: status === 'active',
  photo: null,
  invite: null,
})

const team = [member('aya', 'Aýna'), member('maral', 'Maral'), member('jeren', 'Jeren'), member('gulnar', 'Gülnar', 'invited')]

type Service = Menu['groups'][number]['services'][number]
const service = (id: string, groupId: string, name: string, more: Partial<Service> = {}): Service => ({
  id,
  groupId,
  name: { en: name },
  description: null,
  durationMin: 60,
  priceType: 'fixed',
  priceAmount: 80,
  bufferMin: null,
  online: true,
  staffIds: ['aya'],
  futureBookings: 0,
  ...more,
})

const menu: Menu = {
  groups: [
    {
      id: 'hair',
      name: { en: 'Hair' },
      services: [
        service('womens-haircut', 'hair', 'Women’s haircut', { description: { en: 'Wash, cut and styling' }, staffIds: ['aya', 'maral'] }),
        service('hair-colouring', 'hair', 'Hair colouring', { durationMin: 120, priceType: 'from', priceAmount: 250, bufferMin: 15 }),
        service('bridal', 'hair', 'Bridal hair styling', {
          durationMin: 90,
          priceType: 'hidden',
          priceAmount: 400,
          staffIds: ['aya', 'gulnar'],
          online: false,
        }),
      ],
    },
    {
      id: 'nails',
      name: { en: 'Nails' },
      services: [
        service('manicure', 'nails', 'Manicure', { priceAmount: 60, staffIds: ['jeren'], bufferMin: 0 }),
        service('consult', 'nails', 'Nail consultation', { durationMin: 15, priceType: 'free', priceAmount: 0, staffIds: [] }),
      ],
    },
    { id: 'spa', name: { en: 'Spa' }, services: [] },
  ],
}

const patched: Record<string, unknown>[] = []

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and this section ask it. */
const fakeApi = (): (() => typeof fetch) => () => {
  let current = structuredClone(menu)
  patched.length = 0
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
    if (route === 'GET /me') return json(me)
    if (route === 'GET /me/workspaces') return json({ items: [glow], current: glow.slug })
    if (route === 'GET /me/invites') return json({ items: [] })
    if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
    if (route === 'GET /w/glow-studio/services') return json(current)
    if (route === 'GET /w/glow-studio/team') return json({ items: [member('owner', 'Maýsa'), ...team] })
    const one = /^PATCH \/w\/glow-studio\/services\/([^/]+)$/.exec(route)
    if (one) {
      const body = (await request.json()) as Partial<Service>
      patched.push({ id: one[1], ...body })
      current = {
        groups: current.groups.map((g) => ({ ...g, services: g.services.map((s) => (s.id === one[1] ? { ...s, ...body } : s)) })),
      }
      return json(current.groups.flatMap((g) => g.services).find((s) => s.id === one[1]))
    }
    return json({ error: { code: 'not_found' } }, 404)
  }
}

const layouts = {
  '/w/$slug': {
    component: WorkspaceShell,
    children: {
      settings: {
        component: SettingsLayoutPage,
        children: {
          profile: () => <SettingsPlaceholder section="profile" />,
          rules: () => <SettingsPlaceholder section="rules" />,
          hours: () => <SettingsPlaceholder section="hours" />,
          services: SettingsServicesPage,
          team: () => <SettingsPlaceholder section="team" />,
          permissions: () => <SettingsPlaceholder section="permissions" />,
          link: () => <SettingsPlaceholder section="link" />,
        },
      },
    },
  },
}

const meta = {
  title: 'Business/Settings/Services',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: { routes: {}, layouts, path: '/w/glow-studio/settings/services', server: fakeApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/**
 * The menu group by group: the summary, the columns, a description, an own buffer («+15 min buffer», «no buffer»), the
 * prices (from, at the place with its hidden amount, free), who does it (two people, one invited apart, «No one») and
 * a service clients can't book online. An empty group says so.
 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Services' })).toBeVisible()
    await expect(await canvas.findByText('5 services · 3 groups. Clients see them in this order.')).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Services' })).toHaveAttribute('aria-current', 'page')
    const hair = canvas.getByRole('group', { name: 'Hair' })
    await expect(within(hair).getByText('3 services')).toBeVisible()
    await expect(within(hair).getByText('Wash, cut and styling')).toBeVisible()
    await expect(within(hair).getByText('2 specialists')).toBeVisible()
    await expect(within(hair).getByText('+15 min buffer')).toBeVisible()
    await expect(within(hair).getByText('from 250 TMT')).toBeVisible()
    await expect(within(hair).getByText('Price at the place')).toBeVisible()
    await expect(within(hair).getByText('400 TMT · not shown to clients')).toBeVisible()
    await expect(within(hair).getByText('+ 1 invited')).toBeVisible()
    await expect(within(hair).getByText('Not bookable online')).toBeVisible()
    await expect(within(hair).getByRole('switch', { name: 'Online booking: Bridal hair styling' })).not.toBeChecked()
    const nails = canvas.getByRole('group', { name: 'Nails' })
    await expect(within(nails).getByText('no buffer')).toBeVisible()
    await expect(within(nails).getByText('Free')).toBeVisible()
    await expect(within(nails).getByText('No one')).toBeVisible()
    await expect(within(nails).getByText('Jeren')).toBeVisible()
    await expect(within(canvas.getByRole('group', { name: 'Spa' })).getByText('No services in this group yet.')).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Services · Settings · Glow Studio · Ýeral Business'))
  },
}

/** The online switch saves at once and says what clients now see. */
export const OnlineSwitch: Story = {
  play: async ({ canvas }) => {
    const manicure = await canvas.findByRole('switch', { name: 'Online booking: Manicure' })
    await userEvent.click(manicure)
    await waitFor(() => expect(patched).toEqual([{ id: 'manicure', online: false }]))
    await expect(await within(document.body).findByText('Manicure: not bookable online — it’s hidden from your page')).toBeInTheDocument()
    await waitFor(() => expect(manicure).not.toBeChecked())
    await userEvent.click(canvas.getByRole('switch', { name: 'Online booking: Bridal hair styling' }))
    await expect(await within(document.body).findByText('Bridal hair styling is open for online booking')).toBeInTheDocument()
  },
}

/**
 * At 1024 the sidebar and the settings menu leave the pane narrow: the columns follow the pane, so each service has
 * its line under the name, and nothing spills sideways.
 */
export const Laptop: Story = {
  globals: { viewport: { value: 'md' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('60 min · 60 TMT · Jeren')).toBeVisible()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}

/** The phone: each service's name with «60 min · 80 TMT · Aýna» under it, and the switch. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('60 min · 60 TMT · Jeren')).toBeVisible()
  },
}
