/**
 * Settings → Booking rules — B-Settings `isRules` (v0.6 round 3, English), in the app's shell and Settings' frame over
 * a `fetch` that answers like the api: the rules form, the save bar while there are changes and «Saved» after, the
 * paused note, the services with a buffer of their own, and «What the client sees». Each `PATCH …/settings/rules`
 * body lands in `saved`.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { Menu } from '@yeral/contract/services'
import type { InternalStatus } from '@yeral/contract/settings'
import type { TeamMember, Workspace } from '@yeral/contract/team'
import { DEFAULT_RULES, type BookingRules } from '@yeral/domain/rules'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SettingsLayoutPage, SettingsPlaceholder } from '@/pages/settings'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { SettingsRulesPage } from './settings-rules-page'

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

const member = (id: string, name: string, level: TeamMember['level']): TeamMember => ({
  id,
  name,
  fullName: null,
  specialization: null,
  phone: '+99365000000',
  level,
  status: 'active',
  hasApp: true,
  bookable: level !== 'admin',
  canAnswerOwn: false,
  joined: true,
  photo: null,
  invite: null,
})

const service = (id: string, name: string, bufferMin: number | null) => ({
  id,
  groupId: 'hair',
  name: { en: name },
  description: null,
  durationMin: 60,
  priceType: 'fixed' as const,
  priceAmount: 80,
  bufferMin,
  online: true,
  staffIds: ['aya'],
  futureBookings: 0,
})

const menu: Menu = {
  groups: [
    {
      id: 'hair',
      name: { en: 'Hair' },
      services: [service('womens-haircut', 'Women’s haircut', null), service('hair-colouring', 'Hair colouring', 15)],
    },
  ],
}

// open 09:00–19:00 every day
const week = Array.from({ length: 7 }, () => ({ open: 9 * 60, close: 19 * 60, break: null }))

const saved: Record<string, unknown>[] = []
/** Each `POST`, `PATCH` and `DELETE …/settings/statuses` as `METHOD id body`. */
const statusCalls: string[] = []

const PRESETS: InternalStatus[] = [
  { id: 'st-arrived', preset: 'arrived', name: 'Arrived', icon: 'user-check', color: '#066a41', enabled: false },
  { id: 'st-started', preset: 'started', name: 'Started', icon: 'play', color: '#4429d6', enabled: false },
]
const own = (id: string, name: string): InternalStatus => ({ id, preset: null, name, icon: 'hourglass', color: '#93500a', enabled: true })

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and this section ask it; `start` changes the business's stored rules, `ownStatuses` adds its own. */
const fakeApi =
  (start: Partial<BookingRules> = {}, ownStatuses: InternalStatus[] = []): (() => typeof fetch) =>
  () => {
    let rules = { ...DEFAULT_RULES, lateMinutes: 15, ...start }
    let statuses = [...PRESETS, ...ownStatuses]
    saved.length = 0
    statusCalls.length = 0
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [glow], current: glow.slug })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
      if (route === 'GET /w/glow-studio/settings/rules') return json(rules)
      if (route === 'PATCH /w/glow-studio/settings/rules') {
        const body = (await request.json()) as Record<string, unknown>
        saved.push(body)
        rules = { ...rules, ...body }
        return json(rules)
      }
      if (route === 'GET /w/glow-studio/team')
        return json({ items: [member('owner', 'Maýsa', 'owner'), member('aya', 'Aýna', 'specialist')] })
      if (route === 'GET /w/glow-studio/settings/hours') return json({ hours: week, specialDays: [] })
      if (route === 'GET /w/glow-studio/services') return json(menu)
      if (route === 'GET /w/glow-studio/settings/profile') return json({ phone: '+99312345678' })
      if (route === 'GET /w/glow-studio/settings/statuses') return json({ items: statuses, max: 5 })
      if (route === 'POST /w/glow-studio/settings/statuses') {
        const body = (await request.json()) as Pick<InternalStatus, 'name' | 'icon' | 'color'>
        statusCalls.push(`POST ${JSON.stringify(body)}`)
        const added: InternalStatus = { id: `st-${statuses.length + 1}`, preset: null, enabled: true, ...body }
        statuses = [...statuses, added]
        return json(added, 201)
      }
      const one = /^(PATCH|DELETE) \/w\/glow-studio\/settings\/statuses\/([^/]+)$/.exec(route)
      if (one?.[1] === 'PATCH') {
        const body = (await request.json()) as Partial<InternalStatus>
        statusCalls.push(`PATCH ${one[2]} ${JSON.stringify(body)}`)
        statuses = statuses.map((x) => (x.id === one[2] ? { ...x, ...body } : x))
        return json(statuses.find((x) => x.id === one[2]))
      }
      if (one?.[1] === 'DELETE') {
        statusCalls.push(`DELETE ${one[2]}`)
        statuses = statuses.filter((x) => x.id !== one[2])
        return new Response(null, { status: 204 })
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
          rules: SettingsRulesPage,
          hours: () => <SettingsPlaceholder section="hours" />,
          services: () => <SettingsPlaceholder section="services" />,
          team: () => <SettingsPlaceholder section="team" />,
          permissions: () => <SettingsPlaceholder section="permissions" />,
          link: () => <SettingsPlaceholder section="link" />,
        },
      },
    },
  },
}

const meta = {
  title: 'Business/Settings/BookingRulesPage',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: { routes: {}, layouts, path: '/w/glow-studio/settings/rules', server: fakeApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/**
 * Manual confirmation with a team: the rules, the services with their own buffer, and the client's card — «Booking
 * sent», answered by 15:10 (a 30-minute hold from 14:40 while open). A longer hold moves the time as it's picked.
 */
export const Manual: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Booking rules' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Booking rules' })).toHaveAttribute('aria-current', 'page')
    const preview = await canvas.findByRole('complementary', { name: 'What the client sees' })
    await expect(within(preview).getByText('Booking sent')).toBeVisible()
    await expect(await within(preview).findByText('The business answers by 15:10')).toBeVisible()
    // the first service clients can book, with someone who does it
    await expect(await within(preview).findByText('Glow Studio · Women’s haircut · Aýna')).toBeVisible()
    await expect(within(preview).getByText('You can cancel or change the booking for free up to 2 hours before.')).toBeVisible()
    const own = await canvas.findByText(/Set per service: Hair colouring — 15 min/)
    await expect(own).toBeVisible()
    await expect(within(own).getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/w/glow-studio/settings/services')
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Hold requests for' }), '6 h')
    // 14:40–19:00 today, the rest from 09:00 tomorrow
    await expect(await within(preview).findByText('The business answers by 10:40 tomorrow')).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Booking rules · Settings · Glow Studio · Ýeral Business'))
  },
}

/** A change shows the save bar; Save sends only it, says «Saved», and the bar goes. */
export const SaveChanges: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
    await userEvent.click(await canvas.findByRole('radio', { name: /Instant confirmation/ }))
    const preview = canvas.getByRole('complementary', { name: 'What the client sees' })
    await expect(within(preview).getByText('Booking confirmed')).toBeVisible()
    const bar = canvas.getByRole('region', { name: 'Unsaved changes' })
    await expect(within(bar).getByText('Save your changes?')).toBeVisible()
    await userEvent.click(within(bar).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saved).toEqual([{ confirmMode: 'instant' }]))
    const toast = await within(document.body).findByText('Saved')
    await waitFor(() => expect(toast).toBeVisible())
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull())
  },
}

/** Discard puts the saved rules back and the bar goes; a buffer «Other…» out of range keeps Save off. */
export const DiscardAndInvalid: Story = {
  play: async ({ canvas }) => {
    await userEvent.selectOptions(await canvas.findByRole('combobox', { name: 'Buffer' }), 'Other…')
    const minutes = canvas.getByRole('textbox', { name: 'Buffer, minutes' })
    await userEvent.clear(minutes)
    await userEvent.type(minutes, '0')
    const bar = canvas.getByRole('region', { name: 'Unsaved changes' })
    await expect(within(bar).getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.click(within(bar).getByRole('button', { name: 'Discard' }))
    await expect(canvas.getByRole('combobox', { name: 'Buffer' })).toHaveValue('10')
    await expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
  },
}

/**
 * Online booking paused (Business profile's switch): the note with the way back to it, and the Call card the page
 * shows instead of free times.
 */
export const Offline: Story = {
  args: { server: fakeApi({ onlineEnabled: false }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Online booking is paused — clients see a Call card\./)).toBeVisible()
    const preview = canvas.getByRole('complementary', { name: 'What the client sees' })
    await expect(within(preview).getByText('Book by phone')).toBeVisible()
    await expect(await within(preview).findByText('Call +993 12 34 56 78')).toBeVisible()
    await expect(within(preview).getByText('Your page shows this card instead of free times.')).toBeVisible()
    await userEvent.click(canvas.getByRole('link', { name: 'Resume it in Business profile' }))
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Business profile' })).toBeVisible()
  },
}

/**
 * The booking statuses: the five system ones, locked, with their meaning; Arrived and Started off at first, never
 * deleted. Their switches ride the rules' save bar: Save sends each flip, Discard puts them back.
 */
export const Statuses: Story = {
  play: async ({ canvas }) => {
    const system = await canvas.findByRole('list', { name: 'System statuses' })
    await expect(within(system).getAllByRole('listitem')).toHaveLength(5)
    await expect(within(system).getByText('The client didn’t come — marked with Report')).toBeVisible()
    const internal = await canvas.findByRole('group', { name: 'Internal statuses' })
    const arrived = within(internal).getByRole('switch', { name: 'Arrived' })
    const started = within(internal).getByRole('switch', { name: 'Started' })
    await expect(arrived).not.toBeChecked()
    await expect(within(internal).queryByRole('button', { name: 'Delete: Arrived' })).toBeNull()
    await expect(canvas.getByText('2 / 5 · you can add 3 more')).toBeVisible()
    // Discard puts a flip back
    await userEvent.click(started)
    const bar = canvas.getByRole('region', { name: 'Unsaved changes' })
    await userEvent.click(within(bar).getByRole('button', { name: 'Discard' }))
    await expect(started).not.toBeChecked()
    // Save sends it
    await userEvent.click(arrived)
    await expect(arrived).toBeChecked()
    await expect(statusCalls).toEqual([])
    await userEvent.click(within(canvas.getByRole('region', { name: 'Unsaved changes' })).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(statusCalls).toEqual(['PATCH st-arrived {"enabled":true}']))
    await expect(saved).toEqual([])
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull())
    await expect(arrived).toBeChecked()
  },
}

/**
 * «Add status»: a name a status already has is refused («Pending», any case); a new one with an icon and a colour is
 * added, switched on, and the count follows.
 */
export const AddStatus: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Add status' }))
    const dialog = await within(document.body).findByRole('dialog', { name: 'Add internal status' })
    const name = within(dialog).getByRole('textbox', { name: 'Name' })
    await userEvent.type(name, 'pending')
    await expect(within(dialog).getByRole('alert')).toHaveTextContent('This name is already used — pick another.')
    await expect(within(dialog).getByRole('button', { name: 'Add' })).toBeDisabled()
    await userEvent.clear(name)
    await userEvent.type(name, 'Preparing')
    await expect(within(dialog).getByText('9 / 20')).toBeVisible()
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Hourglass' }))
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Brown' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(statusCalls).toEqual(['POST {"name":"Preparing","icon":"hourglass","color":"#93500a"}']))
    await expect(await within(document.body).findByText('“Preparing” added · only the team sees it')).toBeInTheDocument()
    const internal = canvas.getByRole('group', { name: 'Internal statuses' })
    await expect(await within(internal).findByRole('switch', { name: 'Preparing' })).toBeChecked()
    await expect(canvas.getByText('3 / 5 · you can add 2 more')).toBeVisible()
  },
}

/** The business's own statuses delete at once; five in all closes «Add status» (it keeps its focus). */
export const FullStatuses: Story = {
  args: { server: fakeApi({}, [own('st-3', 'Preparing'), own('st-4', 'Paid'), own('st-5', 'Washing')]) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Up to 5 internal statuses')).toBeVisible()
    const add = canvas.getByRole('button', { name: 'Add status' })
    await expect(add).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(add)
    await expect(within(document.body).queryByRole('dialog')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Delete: Paid' }))
    await waitFor(() => expect(statusCalls).toEqual(['DELETE st-4']))
    await expect(await within(document.body).findByText('“Paid” deleted')).toBeInTheDocument()
    await expect(await canvas.findByText('4 / 5 · you can add 1 more')).toBeVisible()
    // the row went with its button: the focus moves on to «Add status», open again
    await waitFor(() => expect(add).toHaveFocus())
    await expect(add).not.toHaveAttribute('aria-disabled')
  },
}

/** 1024: the preview wraps under the rules. */
export const Laptop: Story = { globals: { viewport: { value: 'md' } } }

/** The phone: the chip row, the rules, then the preview; the save bar sits above the tab bar, not under it. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.selectOptions(await canvas.findByRole('combobox', { name: 'Minimum notice' }), 'No limit')
    const bar = canvas.getByRole('region', { name: 'Unsaved changes' })
    const tabs = canvas.getByRole('link', { name: 'Calendar' }).getBoundingClientRect()
    await waitFor(() => expect(bar.getBoundingClientRect().bottom).toBeLessThanOrEqual(tabs.top))
  },
}
