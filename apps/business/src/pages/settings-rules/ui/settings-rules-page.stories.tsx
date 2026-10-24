/**
 * Settings → Booking rules — B-Settings `isRules` (v0.6 round 3, English), in the app's shell and Settings' frame over
 * a `fetch` that answers like the api: the rules form, the save bar while there are changes and «Saved» after, the
 * paused note, the services with a buffer of their own, and «What the client sees». Each `PATCH …/settings/rules`
 * body lands in `saved`.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { Menu } from '@yeral/contract/services'
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

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell and this section ask it; `rules` changes the business's stored rules. */
const fakeApi =
  (start: Partial<BookingRules> = {}): (() => typeof fetch) =>
  () => {
    let rules = { ...DEFAULT_RULES, lateMinutes: 15, ...start }
    saved.length = 0
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
