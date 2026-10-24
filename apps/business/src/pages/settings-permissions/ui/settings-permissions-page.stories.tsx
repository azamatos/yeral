/**
 * Settings → Permissions — B-Team `tab=permissions` (v0.6 round 3, English), in the app's shell and Settings' frame
 * over a `fetch` that answers like the api: the fixed table, read-only, Owner · Admin · Specialist; under 768 each row
 * stacks with its levels' names.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Me } from '@yeral/contract/account'
import type { Workspace } from '@yeral/contract/team'
import { expect, userEvent, within } from 'storybook/test'
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

/** The owner: the table read-only, a check, a dash or the narrower reach in each cell; Team gives the levels. */
export const Owner: Story = {
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Permissions by access level' })
    // the header and the board's 13 rows
    await expect(within(table).getAllByRole('row')).toHaveLength(14)
    await expect(within(table).getByRole('columnheader', { name: 'Specialist' })).toBeVisible()
    const [owner, admin, specialist] = within(within(table).getByRole('row', { name: /See revenue/ })).getAllByRole('cell')
    await expect(owner).toHaveTextContent('Yes')
    await expect(admin).toHaveTextContent('No')
    await expect(specialist).toHaveTextContent('Own earnings only')
    await expect(canvas.getByRole('link', { name: 'Permissions' })).toHaveAttribute('aria-current', 'page')
    // the lead's «Team» (the menu has one too)
    const header = canvas.getByRole('heading', { level: 2, name: 'Permissions' }).parentElement!
    await userEvent.click(within(header).getByRole('link', { name: 'Team' }))
    await expect(await canvas.findByRole('heading', { level: 2, name: 'Team' })).toBeVisible()
  },
}

/** An admin sees the same table: managing the team and shifts are «View only» for them. */
export const Admin: Story = {
  args: { server: fakeApi(glow('admin')) },
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Permissions by access level' })
    const [, admin, specialist] = within(within(table).getByRole('row', { name: /Manage the team/ })).getAllByRole('cell')
    await expect(admin).toHaveTextContent('View only')
    await expect(specialist).toHaveTextContent('No')
    // who answers depends on «Who answers requests?», for an admin too (book chapter 3)
    const [, answers] = within(within(table).getByRole('row', { name: /Answer requests/ })).getAllByRole('cell')
    await expect(answers).toHaveTextContent('Per “Who answers requests?”')
  },
}

/** The phone: no header; each row stacks, the name on top and every cell with its level's name, read too. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const table = await canvas.findByRole('table', { name: 'Permissions by access level' })
    await expect(within(table).queryByRole('columnheader', { name: 'Owner' })).toBeNull()
    const [owner, , specialist] = within(within(table).getByRole('row', { name: /See revenue/ })).getAllByRole('cell')
    await expect(owner).toHaveTextContent('OwnerYes')
    await expect(specialist).toHaveTextContent('SpecialistOwn earnings only')
  },
}
