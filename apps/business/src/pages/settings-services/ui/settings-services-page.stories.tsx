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
        service('hair-colouring', 'hair', 'Hair colouring', {
          durationMin: 120,
          priceType: 'from',
          priceAmount: 250,
          bufferMin: 15,
          futureBookings: 4,
        }),
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
/** Each `POST …/services` body. */
const added: Record<string, unknown>[] = []
/** The deletes, restores and group calls as `METHOD path`. */
const calls: string[] = []

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and this section ask it. */
const fakeApi = (): (() => typeof fetch) => () => {
  let current = structuredClone(menu)
  patched.length = 0
  added.length = 0
  calls.length = 0
  let deleted: Service[] = []
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
    if (route === 'GET /me') return json(me)
    if (route === 'GET /me/workspaces') return json({ items: [glow], current: glow.slug })
    if (route === 'GET /me/invites') return json({ items: [] })
    if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
    if (route === 'GET /w/glow-studio/services') return json(current)
    if (route === 'GET /w/glow-studio/team') return json({ items: [member('owner', 'Maýsa'), ...team] })
    if (route === 'GET /w/glow-studio/settings/rules') return json({ bufferMinutes: 10 })
    if (route === 'POST /w/glow-studio/services') {
      const body = (await request.json()) as Service
      added.push(body)
      const made: Service = { ...body, id: `new-${added.length}`, futureBookings: 0 }
      current = { groups: current.groups.map((g) => (g.id === body.groupId ? { ...g, services: [...g.services, made] } : g)) }
      return json(made, 201)
    }
    if (route === 'POST /w/glow-studio/services/groups') {
      const body = (await request.json()) as { name: { en: string } }
      calls.push(`${route} ${body.name.en}`)
      current = { groups: [...current.groups, { id: `group-${current.groups.length + 1}`, name: body.name, services: [] }] }
      return json(current.groups.at(-1), 201)
    }
    const group = /^DELETE \/w\/glow-studio\/services\/groups\/([^/]+)$/.exec(route)
    if (group) {
      calls.push(route)
      current = { groups: current.groups.filter((g) => g.id !== group[1]) }
      return new Response(null, { status: 204 })
    }
    const restore = /^POST \/w\/glow-studio\/services\/([^/]+)\/restore$/.exec(route)
    if (restore) {
      calls.push(route)
      const back = deleted.find((x) => x.id === restore[1])
      if (back)
        current = {
          groups: current.groups.map((g) => (g.id === back.groupId ? { ...g, services: [...g.services, back] } : g)),
        }
      return json(back)
    }
    const gone = /^DELETE \/w\/glow-studio\/services\/([^/]+)$/.exec(route)
    if (gone) {
      calls.push(route)
      deleted = [...deleted, ...current.groups.flatMap((g) => g.services).filter((x) => x.id === gone[1])]
      current = { groups: current.groups.map((g) => ({ ...g, services: g.services.filter((x) => x.id !== gone[1]) })) }
      return new Response(null, { status: 204 })
    }
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
 * A service's name opens it in the drawer: a price at the place keeps its amount («Amount», clients don't see it), the
 * rules' buffer, nobody ticked warns that clients can't book it. Save sends only what changed, says so, and the focus
 * goes back to the name.
 */
export const EditService: Story = {
  play: async ({ canvas }) => {
    const name = await canvas.findByRole('button', { name: 'Hair colouring' })
    await userEvent.click(name)
    const drawer = await within(document.body).findByRole('dialog', { name: 'Edit service' })
    await expect(within(drawer).getByText('Hair · Hair colouring')).toBeVisible()
    await expect(within(drawer).getByRole('textbox', { name: 'Name' })).toHaveValue('Hair colouring')
    await expect(within(drawer).getByRole('radio', { name: 'From' })).toBeChecked()
    await expect(within(drawer).getByRole('textbox', { name: /Lowest price/ })).toHaveValue('250')
    await userEvent.click(within(drawer).getByRole('radio', { name: 'Price at the place' }))
    await expect(within(drawer).getByRole('textbox', { name: /Amount/ })).toHaveValue('250')
    await expect(within(drawer).getByText('Clients see “Price at the place”. The amount counts in your totals.')).toBeVisible()
    await userEvent.selectOptions(
      within(drawer).getByRole('combobox', { name: 'Buffer after the service' }),
      'As in Booking rules · 10 min',
    )
    await userEvent.click(within(drawer).getByRole('checkbox', { name: /Aýna/ }))
    await expect(within(drawer).getByText('No specialist chosen — clients can’t book this service.')).toBeVisible()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(patched).toEqual([{ id: 'hair-colouring', bufferMin: null, priceType: 'hidden', staffIds: [] }]))
    await expect(await within(document.body).findByText('Hair colouring saved')).toBeInTheDocument()
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Hair colouring' })).toHaveFocus())
  },
}

/**
 * «Add service» opens a new one in the first group: Save asks for a name and a price first; the people list marks the
 * invited; it's added in the group picked and the list shows it.
 */
export const AddService: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Add service' }))
    const drawer = await within(document.body).findByRole('dialog', { name: 'New service' })
    await expect(within(drawer).getByText('Goes to Hair')).toBeVisible()
    await userEvent.click(within(drawer).getByRole('button', { name: 'Save' }))
    await expect(within(drawer).getByText('Enter the service name.')).toBeVisible()
    await expect(within(drawer).getByText('Enter the price.')).toBeVisible()
    await expect(added).toEqual([])
    await expect(within(drawer).getByText('Invited')).toBeVisible()
    await userEvent.type(within(drawer).getByRole('textbox', { name: 'Name' }), 'Beard trim')
    await userEvent.type(within(drawer).getByRole('textbox', { name: /Price/ }), '5x0')
    await expect(within(drawer).getByText('50 TMT')).toBeVisible()
    await userEvent.selectOptions(within(drawer).getByRole('combobox', { name: 'Group' }), 'Nails')
    await userEvent.selectOptions(within(drawer).getByRole('combobox', { name: 'Duration' }), '30 min')
    await userEvent.click(within(drawer).getByRole('checkbox', { name: /Maral/ }))
    await userEvent.click(within(drawer).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(added).toEqual([
        {
          groupId: 'nails',
          name: { en: 'Beard trim' },
          description: null,
          durationMin: 30,
          priceType: 'fixed',
          priceAmount: 50,
          bufferMin: null,
          online: true,
          staffIds: ['maral'],
        },
      ]),
    )
    await expect(await within(document.body).findByText('New service added: Beard trim')).toBeInTheDocument()
    await expect(await within(canvas.getByRole('group', { name: 'Nails' })).findByRole('button', { name: 'Beard trim' })).toBeVisible()
  },
}

/** An empty group offers «Add service» there. */
export const AddToEmptyGroup: Story = {
  play: async ({ canvas }) => {
    const spa = await canvas.findByRole('group', { name: 'Spa' })
    await userEvent.click(within(spa).getByRole('button', { name: 'Add service to Spa' }))
    const drawer = await within(document.body).findByRole('dialog', { name: 'New service' })
    await expect(within(drawer).getByText('Goes to Spa')).toBeVisible()
    await expect(within(drawer).getByRole('combobox', { name: 'Group' })).toHaveValue('spa')
  },
}

/**
 * A service with upcoming bookings asks first and says they stay; the drawer's «Delete service» leads there too.
 */
export const DeleteWithBookings: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Hair colouring' }))
    const drawer = await within(document.body).findByRole('dialog', { name: 'Edit service' })
    await userEvent.click(within(drawer).getByRole('button', { name: 'Delete service' }))
    const confirm = await within(document.body).findByRole('alertdialog', { name: 'Delete Hair colouring?' })
    const text = within(confirm).getByText('It has 4 upcoming bookings. They stay as they are; new bookings can’t choose it.')
    // the dialog pops in
    await waitFor(() => expect(text).toBeVisible())
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete service' }))
    await waitFor(() => expect(calls).toEqual(['DELETE /w/glow-studio/services/hair-colouring']))
    await expect(
      await within(document.body).findByText('Hair colouring deleted · its 4 upcoming bookings stay as they are'),
    ).toBeInTheDocument()
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Hair colouring' })).toBeNull())
  },
}

/** Without upcoming bookings it goes at once from the row's menu, with «Undo» in the toast. */
export const DeleteWithUndo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Manicure: actions' }))
    await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'Delete service' }))
    await waitFor(() => expect(calls).toEqual(['DELETE /w/glow-studio/services/manicure']))
    await expect(await within(document.body).findByText('Manicure deleted')).toBeInTheDocument()
    await userEvent.click(within(document.body).getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(calls).toEqual(['DELETE /w/glow-studio/services/manicure', 'POST /w/glow-studio/services/manicure/restore']))
    await expect(await canvas.findByRole('button', { name: 'Manicure' })).toBeVisible()
  },
}

/** «Add group» adds one at the end; an empty group deletes from its menu, one with services can't yet. */
export const Groups: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Add group' }))
    const name = canvas.getByRole('textbox', { name: 'New group name' })
    await userEvent.type(name, 'Beard{Enter}')
    await waitFor(() => expect(calls).toEqual(['POST /w/glow-studio/services/groups Beard']))
    await expect(await within(document.body).findByText('Group added: Beard')).toBeInTheDocument()
    await expect(await canvas.findByRole('group', { name: 'Beard' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Hair group: actions' }))
    const blocked = await within(document.body).findByRole('menuitem', { name: /Delete group/ })
    await expect(blocked).toHaveAttribute('aria-disabled', 'true')
    // the menu fades in
    await waitFor(() => expect(within(document.body).getByText('Move or delete its services first')).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await userEvent.click(canvas.getByRole('button', { name: 'Spa group: actions' }))
    await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'Delete group' }))
    await waitFor(() => expect(calls).toContain('DELETE /w/glow-studio/services/groups/spa'))
    await expect(await within(document.body).findByText('Group deleted: Spa')).toBeInTheDocument()
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
