/**
 * Settings → Permissions — B-Team `tab=permissions` (v0.6 round 3, English), in the app's shell and Settings' frame
 * over a `fetch` that answers like the api: the fixed table, read-only, Owner · Admin · Specialist; under 768 each row
 * stacks with its levels' names.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { Workspace } from '@yeral/contract/team'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SettingsLayoutPage, SettingsPlaceholder } from '@/pages/settings'
import { PageStory } from '@/shared/storybook'
import { WorkspaceShell } from '@/widgets/workspace-shell'
import { SettingsPermissionsPage } from './settings-permissions-page'

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

const glow = (level: Workspace['level']): Workspace => ({
  slug: 'glow-studio',
  name: 'Glow Studio',
  address: '247 Bitarap Türkmenistan Avenue',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  logo: null,
  level,
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer: 0,
  staffId: '00000000-0000-4000-8000-0000000000aa',
  requestsToAnswer: 0,
  lastOpenedAt: 1,
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api as the shell asks it. */
const fakeApi =
  (workspace: Workspace): (() => typeof fetch) =>
  () =>
  (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init)
    const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
    if (route === 'GET /me') return Promise.resolve(json(me))
    if (route === 'GET /me/workspaces') return Promise.resolve(json({ items: [workspace], current: workspace.slug }))
    if (route === 'GET /me/invites') return Promise.resolve(json({ items: [] }))
    if (/^POST \/me\/workspaces\/[^/]+\/open$/.test(route)) return Promise.resolve(new Response(null, { status: 204 }))
    return Promise.resolve(json({ error: { code: 'not_found' } }, 404))
  }

const layouts = {
  '/w/$slug': {
    component: WorkspaceShell,
    children: {
      settings: {
        component: SettingsLayoutPage,
        children: {
          team: () => <SettingsPlaceholder section="team" />,
          permissions: SettingsPermissionsPage,
        },
      },
    },
  },
}

const meta = {
  title: 'Business/Settings/Permissions',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  globals: { viewport: { value: 'xl' } },
  args: { routes: {}, layouts, path: '/w/glow-studio/settings/permissions', server: fakeApi(glow('owner')) },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/** The owner: a matrix of symbols — ✓, —, Own, View — with the key above, footnote numbers and the notes under it. */
export const Owner: Story = {
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Permissions by access level' })
    // the header and the board's 13 rows
    await expect(within(table).getAllByRole('row')).toHaveLength(14)
    await expect(within(table).getByRole('columnheader', { name: 'Specialist' })).toBeVisible()
    const [owner, admin, specialist] = within(within(table).getByRole('row', { name: /See revenue/ })).getAllByRole('cell')
    await expect(owner).toHaveTextContent('Yes')
    await expect(admin).toHaveTextContent('No')
    await expect(specialist).toHaveTextContent('Own')
    // a footnote number beside the symbol, and the note under the table
    const calendar = within(within(table).getByRole('row', { name: /See everyone’s calendar/ })).getAllByRole('cell')[2]!
    await expect(within(calendar).getByLabelText('note 2')).toHaveTextContent('2')
    await expect(canvas.getByText('Other people’s time shows as “Busy”.')).toBeVisible()
    await expect(canvas.getByText('Only their own — column, bookings, clients, earnings')).toBeVisible()
    // ⓘ says what the action covers
    await userEvent.click(within(table).getByRole('button', { name: 'About: See revenue' }))
    await expect(await body.findByRole('dialog')).toHaveTextContent('Visit totals and the average check.')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(canvas.getByRole('link', { name: 'Permissions' })).toHaveAttribute('aria-current', 'page')
    // the lead's «Team» (the menu has one too)
    const header = canvas.getByRole('heading', { level: 2, name: 'Permissions' }).parentElement!
    await userEvent.click(within(header).getByRole('link', { name: 'Team' }))
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Team' })).toBeVisible()
  },
}

/** An admin sees the same matrix: «View» on managing the team (note 4) and on shifts; who answers carries note 1. */
export const Admin: Story = {
  args: { server: fakeApi(glow('admin')) },
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Permissions by access level' })
    const [, admin, specialist] = within(within(table).getByRole('row', { name: /Manage the team/ })).getAllByRole('cell')
    await expect(admin).toHaveTextContent('View4')
    await expect(specialist).toHaveTextContent('No')
    const [, shifts] = within(within(table).getByRole('row', { name: /Shifts and time off/ })).getAllByRole('cell')
    await expect(shifts).toHaveTextContent('View')
    // who answers depends on «Who answers requests?», for an admin too (book chapter 3)
    const [owner, answers] = within(within(table).getByRole('row', { name: /Answer requests/ })).getAllByRole('cell')
    await expect(owner).toHaveTextContent('Yes1')
    await expect(answers).toHaveTextContent('Yes1')
    await expect(canvas.getByText(/^Follows “Who answers requests\?” in Booking rules/)).toBeVisible()
  },
}

/** The phone: one card per action with the three levels as rows and the card's own note. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const revenue = await canvas.findByRole('region', { name: 'See revenue' })
    await expect(canvas.queryByRole('table')).toBeNull()
    await expect(revenue).toHaveTextContent('See revenueOwnerYesAdmin—NoSpecialistOwn')
    const calendar = canvas.getByRole('region', { name: 'See everyone’s calendar' })
    await expect(within(calendar).getByText('Other people’s time shows as “Busy”.')).toBeVisible()
    await expect(canvas.getByRole('region', { name: 'Manage the team' })).toHaveTextContent('OwnerYesAdminView4Specialist—No')
  },
}
