/**
 * Settings → Hours — B-Settings `pane=hours` (v0.6 round 3, English), in the app's shell and Settings' frame over a
 * `fetch` that answers like the api: the week, a row per day, the save bar while it differs from the saved week, and a
 * save over bookings ahead listing them first (keep them, or cancel them with 3 other times; book Q-211).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { BookingsAffectedDetails } from '@yeral/contract/errors'
import type { Workspace } from '@yeral/contract/team'
import { addDays, today } from '@yeral/domain/time'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SettingsLayoutPage, SettingsPlaceholder } from '@/pages/settings'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { SettingsHoursPage } from './settings-hours-page'

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

const day = (open: number, close: number) => ({ open, close, break: null })
/** Glow Studio's week (demo-data): Monday to Saturday 09:00–20:00, Sunday 10:00–18:00. */
const hours = { hours: [...Array.from({ length: 6 }, () => day(540, 1200)), day(600, 1080)], specialDays: [] }

const now = Date.now()
const on = (days: number) => addDays(today(now), days)
const item = (service: string, staff: string) => ({ serviceId: null, service, staffId: null, staff, start: 0, end: 0 })
/** Three bookings and a request after the new closing time (B-Settings tweak `affected`). */
const affected: BookingsAffectedDetails = {
  count: 4,
  counts: { bookings: 3, requests: 1 },
  byStaff: [],
  bookings: [
    {
      code: 'YR-10001',
      date: on(0),
      start: 1080,
      end: 1125,
      status: 'confirmed',
      holdUntil: null,
      client: 'Bahar A.',
      items: [item('Gel manicure', 'Maral')],
      staff: ['Maral'],
    },
    {
      code: 'YR-10002',
      date: on(1),
      start: 1140,
      end: 1185,
      status: 'pending',
      holdUntil: now + 45 * 60_000,
      client: 'Mähri G.',
      items: [item('Haircut', 'Aýna')],
      staff: ['Aýna'],
    },
    {
      code: 'YR-10003',
      date: on(3),
      start: 1110,
      end: 1170,
      status: 'confirmed',
      holdUntil: null,
      client: 'Batyr Ç.',
      items: [item('Back massage', 'Leýli')],
      staff: ['Leýli'],
    },
    {
      code: 'YR-10004',
      date: on(7),
      start: 1140,
      end: 1170,
      status: 'confirmed',
      holdUntil: null,
      client: null,
      items: [item('Brows', 'Jeren')],
      staff: ['Jeren'],
    },
  ],
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and this section ask it; with `over`, a save without a choice lists those bookings first. */
const fakeApi =
  (over: BookingsAffectedDetails | null = null): (() => typeof fetch) =>
  () => {
    let saved = hours
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init)
      const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
      if (route === 'GET /me') return json(me)
      if (route === 'GET /me/workspaces') return json({ items: [glow], current: glow.slug })
      if (route === 'GET /me/invites') return json({ items: [] })
      if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return new Response(null, { status: 204 })
      if (route === 'GET /w/glow-studio/settings/hours') return json(saved)
      if (route === 'PUT /w/glow-studio/settings/hours') {
        const body = (await request.json()) as typeof hours & { affected?: string }
        if (over && !body.affected) return json({ error: { code: 'bookings_affected', details: over } }, 409)
        saved = { hours: body.hours, specialDays: body.specialDays }
        return json({ ...saved, cancelled: body.affected === 'cancel' ? (over?.count ?? 0) : 0 })
      }
      return json({ error: { code: 'not_found' } }, 404)
    }
  }

const section = (name: string) => () => <SettingsPlaceholder section={name as 'profile'} />
const layouts = {
  '/w/$slug': {
    component: WorkspaceShell,
    children: {
      settings: {
        component: SettingsLayoutPage,
        children: {
          profile: section('profile'),
          rules: section('rules'),
          hours: SettingsHoursPage,
          services: section('services'),
          team: section('team'),
          permissions: section('permissions'),
          link: section('link'),
        },
      },
    },
  },
}

const meta = {
  title: 'Business/Settings/Hours',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: { routes: {}, layouts, path: '/w/glow-studio/settings/hours', server: fakeApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The saved week: a row per day, no save bar until something changes. */
export const Week: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Hours' })).toBeVisible()
    await expect(await canvas.findByRole('heading', { name: 'Opening hours' })).toBeVisible()
    await expect(canvas.getByRole('switch', { name: 'Sunday: open' })).toBeChecked()
    // Settings has no «Same hours Monday to Friday»
    await expect(canvas.queryByRole('switch', { name: 'Same hours Monday to Friday' })).toBeNull()
    await expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
    await waitFor(() => expect(document.title).toBe('Hours · Settings · Glow Studio · Ýeral Business'))
  },
}

/** A change shows the save bar; Discard brings the saved week back, Save keeps the change and says so. */
export const SaveAChange: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'Sunday: open' }))
    const bar = await canvas.findByRole('region', { name: 'Unsaved changes' })
    await userEvent.click(within(bar).getByRole('button', { name: 'Discard' }))
    await expect(canvas.getByRole('switch', { name: 'Sunday: open' })).toBeChecked()
    await expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()

    await userEvent.click(canvas.getByRole('switch', { name: 'Sunday: open' }))
    await userEvent.click(within(await canvas.findByRole('region', { name: 'Unsaved changes' })).getByRole('button', { name: 'Save' }))
    const toast = await within(document.body).findByText('Hours saved')
    // the toast slides in
    await waitFor(() => expect(toast).toBeVisible())
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull())
    await expect(canvas.getByRole('switch', { name: 'Sunday: open' })).not.toBeChecked()
  },
}

/**
 * A save over bookings ahead (B-Settings tweak `affected`): the changed day as the lead, Keep them or Cancel and offer
 * 3 other times, the bookings with a request's timer; Save sends the choice.
 */
export const BookingsOutside: Story = {
  args: { server: fakeApi(affected) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'Sunday: open' }))
    await userEvent.click(within(await canvas.findByRole('region', { name: 'Unsaved changes' })).getByRole('button', { name: 'Save' }))
    const body = within(document.body)
    const dialog = await body.findByRole('dialog', { name: '3 bookings and 1 request fall outside the new hours' })
    const modal = within(dialog)
    // the modal pops in
    await waitFor(() => expect(modal.getByText('Sunday closed. These were booked before the change.')).toBeVisible())
    await expect(modal.getByRole('radio', { name: 'Keep them' })).toBeChecked()
    const list = modal.getByRole('list', { name: '3 bookings · 1 request' })
    await expect(within(list).getAllByRole('listitem')).toHaveLength(4)
    await expect(within(list).getByText('Bahar A. · Gel manicure · Maral')).toBeVisible()
    await expect(within(list).getByText('Unnamed client · Brows · Jeren')).toBeVisible()
    await expect(within(list).getByLabelText(/left to answer$/)).toBeVisible()

    await userEvent.click(modal.getByRole('radio', { name: 'Cancel and offer 3 other times' }))
    await userEvent.click(modal.getByRole('button', { name: 'Save' }))
    const toast = await body.findByText('Hours saved · 3 bookings and 1 request cancelled — each client picks a new time in My bookings')
    await waitFor(() => expect(toast).toBeVisible())
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
  },
}

/** A day with a problem: it says what to fix under the day, and Save waits. */
export const Invalid: Story = {
  play: async ({ canvas }) => {
    // Sunday closes at 18:00
    await userEvent.selectOptions(await canvas.findByRole('combobox', { name: 'Sunday: opens' }), '18:00')
    await expect(canvas.getByRole('alert')).toHaveTextContent('Opening and closing can’t be at the same time.')
    await expect(within(canvas.getByRole('region', { name: 'Unsaved changes' })).getByRole('button', { name: 'Save' })).toBeDisabled()
  },
}

/** The phone: each day's hours under its name and switch, the modal as a sheet. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { server: fakeApi(affected) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('switch', { name: 'Sunday: open' }))
    await userEvent.click(within(await canvas.findByRole('region', { name: 'Unsaved changes' })).getByRole('button', { name: 'Save' }))
    const dialog = await within(document.body).findByRole('dialog')
    await expect(within(dialog).getByRole('radio', { name: 'Keep them' })).toBeChecked()
  },
}

/** Every day switched off: it says one must be open, and Save waits. */
export const NoOpenDay: Story = {
  play: async ({ canvas }) => {
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      await userEvent.click(await canvas.findByRole('switch', { name: `${day}: open` }))
    await expect(canvas.getByRole('alert')).toHaveTextContent('At least one day must be open.')
    await expect(within(canvas.getByRole('region', { name: 'Unsaved changes' })).getByRole('button', { name: 'Save' })).toBeDisabled()
  },
}
