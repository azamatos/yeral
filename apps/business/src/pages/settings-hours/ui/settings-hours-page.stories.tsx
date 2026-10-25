/**
 * Settings → Hours — B-Settings `pane=hours` (v0.6 round 3, English), in the app's shell and Settings' frame over a
 * `fetch` that answers like the api: the week, a row per day, the save bar while it differs from the saved week, and a
 * save over bookings ahead listing them first (keep them, or cancel them with 3 other times; book Q-211).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { BookingsAffectedDetails } from '@yeral/contract/errors'
import type { Workspace } from '@yeral/contract/team'
import { addDays, dow, today } from '@yeral/domain/time'
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

const now = Date.now()
const on = (days: number) => addDays(today(now), days)
/** A Monday to Friday from `days` ahead: the next day opens at 09:00 whichever day the story runs. */
const weekdayAhead = (days: number) => {
  let d = on(days)
  while (dow(d) > 4) d = addDays(d, 1)
  return d
}
/** The coming 21 March (inside the yearly Nowruz), never in the past. */
const nextNowruz = () => {
  const year = Number(today(now).slice(0, 4))
  return `${year}-03-21` >= today(now) ? `${year}-03-21` : `${year + 1}-03-21`
}

const day = (open: number, close: number) => ({ open, close, break: null })
type Special = { name: string; from: string; to: string; yearly: boolean; hours: { open: number; close: number } | null }
const closed = (name: string, from: string, to = from, yearly = false): Special => ({ name, from, to, yearly, hours: null })
/** Glow Studio's week (demo-data): Monday to Saturday 09:00–20:00, Sunday 10:00–18:00; the board's special days. */
const hours: { hours: ReturnType<typeof day>[]; specialDays: Special[] } = {
  hours: [...Array.from({ length: 6 }, () => day(540, 1200)), day(600, 1080)],
  specialDays: [
    closed('Stocktake', on(9)),
    closed('New Year', '2027-01-01', '2027-01-01', true),
    closed('Nowruz', '2027-03-21', '2027-03-22', true),
    closed('Independence Day', '2027-09-27', '2027-09-27', true),
  ],
}
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
    // today and tomorrow by name, a later day as «Fri, 16 Oct»
    await expect(within(list).getByText('Today · 18:00–18:45')).toBeVisible()
    await expect(within(list).getAllByText(/^[A-Z][a-z]{2}, \d{1,2} [A-Z][a-z]{2} · \d\d:\d\d–\d\d:\d\d$/)).toHaveLength(2)
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

/** The special days: a row each with its dates, Every year or One-off, and Closed or its hours. */
export const SpecialDaysList: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { name: 'Special days' })).toBeVisible()
    await expect(canvas.getByText('21–22 March')).toBeVisible()
    await expect(canvas.getByText('Independence Day')).toBeVisible()
    await expect(canvas.getAllByText('Every year')).toHaveLength(3)
    await expect(canvas.getByRole('button', { name: 'Stocktake: actions' })).toBeVisible()
  },
}

const body = within(document.body)
/** Picks `date` in the field's month (DatePicker), moving a month at a time to it. */
const pickDate = async (modal: Pick<typeof body, 'getByRole'>, label: string, date: string) => {
  await userEvent.click(modal.getByRole('button', { name: new RegExp(`^${label} `) }))
  // a neighbouring month's days are there too, hidden and without a button
  const day = () => body.getByRole('grid').querySelector<HTMLButtonElement>(`[data-day="${date}"]:not([data-hidden]) button`)
  await body.findByRole('grid')
  for (let i = 0; i < 24 && !day(); i++) {
    const shown = body.getByRole('grid').querySelector('[data-day]:not([data-hidden])')?.getAttribute('data-day') ?? ''
    await userEvent.click(body.getByRole('button', { name: date < shown ? 'Previous month' : 'Next month' }))
  }
  await userEvent.click(day()!)
  await waitFor(() => expect(body.queryByRole('grid')).toBeNull())
}
const openAdd = async (canvas: { findByRole: (role: string, options: { name: string }) => Promise<HTMLElement> }) => {
  await userEvent.click(await canvas.findByRole('button', { name: 'Add a special day' }))
  const dialog = await body.findByRole('dialog', { name: 'Add a special day' })
  return within(dialog)
}

/** Add a day: name, date, closed; it saves straight away and shows in the list. */
export const AddSpecialDay: Story = {
  play: async ({ canvas }) => {
    const modal = await openAdd(canvas)
    await expect(modal.getByRole('button', { name: 'Add' })).toBeDisabled()
    await userEvent.type(modal.getByRole('textbox', { name: 'Name' }), 'Training day')
    await pickDate(modal, 'Date', on(20))
    await userEvent.click(modal.getByRole('button', { name: 'Add' }))
    const toast = await body.findByText('Special day added')
    await waitFor(() => expect(toast).toBeVisible())
    await expect(await canvas.findByText('Training day')).toBeVisible()
  },
}

/** Several days: From and To, each picked in the month; To can't be before From. */
export const AddSeveralDays: Story = {
  play: async ({ canvas }) => {
    const modal = await openAdd(canvas)
    await userEvent.type(modal.getByRole('textbox', { name: 'Name' }), 'Stocktake week')
    await userEvent.click(modal.getByRole('radio', { name: 'Several days' }))
    const from = weekdayAhead(30)
    await pickDate(modal, 'From', from)
    await pickDate(modal, 'To', addDays(from, 2))
    await expect(modal.getByRole('button', { name: 'Add' })).toBeEnabled()
    // To opens no earlier than From
    await userEvent.click(modal.getByRole('button', { name: /^To / }))
    await body.findByRole('grid')
    const before = body.getByRole('grid').querySelector<HTMLButtonElement>(`[data-day="${addDays(from, -1)}"]:not([data-hidden]) button`)
    if (before) await expect(before).toBeDisabled()
    await userEvent.keyboard('{Escape}')
  },
}

/** A day in the past can't be picked; other hours past midnight into the next day's opening say what to fix. */
export const SpecialDayProblems: Story = {
  play: async ({ canvas }) => {
    const modal = await openAdd(canvas)
    await userEvent.type(modal.getByRole('textbox', { name: 'Name' }), 'Late night')
    await userEvent.click(modal.getByRole('button', { name: /^Date / }))
    const grid = await body.findByRole('grid')
    // yesterday is grey in this month, or this month is the first one that opens
    const yesterday = grid.querySelector<HTMLButtonElement>(`[data-day="${on(-1)}"] button`)
    if (yesterday) await expect(yesterday).toBeDisabled()
    else await expect(body.getByRole('button', { name: 'Previous month' })).toHaveAttribute('aria-disabled', 'true')
    await userEvent.keyboard('{Escape}')
    await pickDate(modal, 'Date', weekdayAhead(12))
    await userEvent.click(modal.getByRole('radio', { name: 'Different hours' }))
    await userEvent.selectOptions(modal.getByRole('combobox', { name: 'Opens' }), '20:00')
    await userEvent.selectOptions(modal.getByRole('combobox', { name: 'Closes' }), '10:00')
    await expect(await modal.findByText(/opens\. Pick an earlier time\.$/)).toBeVisible()
    await expect(modal.getByRole('button', { name: 'Add' })).toBeDisabled()
  },
}

/** Dates inside another special day: which one applies there, and why. */
export const SpecialDayOverlap: Story = {
  play: async ({ canvas }) => {
    const modal = await openAdd(canvas)
    await userEvent.type(modal.getByRole('textbox', { name: 'Name' }), 'Nowruz — short day')
    await pickDate(modal, 'Date', nextNowruz())
    await expect(await modal.findByText('These dates overlap “Nowruz”. On those days “Nowruz — short day” is used.')).toBeVisible()
  },
}

/**
 * A closed day over bookings: the modal asks first, «Keep them» with the closed day's caption or «Cancel and offer 3
 * other times»; Save sends the choice.
 */
export const SpecialDayOverBookings: Story = {
  args: { server: fakeApi({ ...affected, byStaff: [{ staffId: 'aa61d5e4-1f1a-4b0a-9a8e-3f3c3a3f3a01', name: 'Maral', count: 4 }] }) },
  play: async ({ canvas }) => {
    const modal = await openAdd(canvas)
    await userEvent.type(modal.getByRole('textbox', { name: 'Name' }), 'Repairs')
    await pickDate(modal, 'Date', on(1))
    await userEvent.click(modal.getByRole('button', { name: 'Add' }))
    await expect(await modal.findByText('3 bookings and 1 request on this day — Maral 4')).toBeVisible()
    await expect(modal.getByRole('radio', { name: 'Keep them' })).toBeChecked()
    await expect(modal.getByText('They stay in the calendar as they are. No new online bookings on that day.')).toBeVisible()
    await userEvent.click(modal.getByRole('radio', { name: 'Cancel and offer 3 other times' }))
    await userEvent.click(modal.getByRole('button', { name: 'Add' }))
    const toast = await body.findByText('Special day added · 3 bookings and 1 request cancelled, the clients are notified')
    await waitFor(() => expect(toast).toBeVisible())
  },
}

/** Delete from the row's menu: it's gone at once, and Undo brings it back. */
export const DeleteAndUndo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Stocktake: actions' }))
    await userEvent.click(await body.findByRole('menuitem', { name: 'Delete' }))
    await waitFor(() => expect(canvas.queryByText('Stocktake')).toBeNull())
    await userEvent.click(await body.findByRole('button', { name: 'Undo' }))
    await expect(await canvas.findByText('Stocktake')).toBeVisible()
  },
}

/** A delete that leaves bookings outside the week's hours: the same Keep them or Cancel step, then it's gone. */
export const DeleteOverBookings: Story = {
  args: { server: fakeApi(affected) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Stocktake: actions' }))
    await userEvent.click(await body.findByRole('menuitem', { name: 'Delete' }))
    const dialog = within(await body.findByRole('dialog', { name: '3 bookings and 1 request fall outside the new hours' }))
    await waitFor(() =>
      expect(dialog.getByText('Without “Stocktake”, the week’s hours apply. These were booked before the change.')).toBeVisible(),
    )
    await userEvent.click(dialog.getByRole('button', { name: 'Save' }))
    // the toasts live on the page: another story's «Stocktake deleted» may still be there
    const toasts = await body.findAllByText('Stocktake deleted')
    await waitFor(() => expect(toasts.at(-1)).toBeVisible())
    await waitFor(() => expect(canvas.queryByText('Stocktake')).toBeNull())
  },
}
