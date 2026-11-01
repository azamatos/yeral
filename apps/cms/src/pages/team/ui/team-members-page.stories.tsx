import type { AdminMember } from '@yeral/contract/admin'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { json, PageStory, pathOf } from '@/shared/storybook'
import { TeamMembersPage } from './team-members-page'

const ME = { id: 'a1', login: 'ayna', name: 'Aýna', recoveryCodesLeft: 10 }
const member = (over: Partial<AdminMember>): AdminMember => ({
  id: 'a1',
  login: 'ayna',
  name: 'Aýna',
  status: 'active',
  invitedBy: null,
  setupExpiresAt: null,
  lastSignInAt: Date.UTC(2026, 9, 31, 9),
  createdAt: Date.UTC(2026, 9, 1),
  ...over,
})
const TEAM = [member({}), member({ id: 'a2', login: 'merdan', name: 'Merdan' })]
const LINK = { id: 'a3', url: 'https://cms.test/setup/a-long-token', expiresAt: Date.UTC(2026, 10, 2) }

const api =
  (invite: () => Response = () => json(201, LINK)): (() => typeof fetch) =>
  () =>
  (input, init) => {
    const path = pathOf(input)
    if (path === '/v1/admin/me') return Promise.resolve(json(200, ME))
    if (path === '/v1/admin/team' && init?.method === 'POST') return Promise.resolve(invite())
    if (path.endsWith('/reset')) return Promise.resolve(json(200, LINK))
    if (path.endsWith('/disable')) return Promise.resolve(new Response(null, { status: 204 }))
    return Promise.resolve(json(200, { items: TEAM }))
  }

const meta = {
  title: 'Admin/Pages/Team',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/team': TeamMembersPage }, path: '/team', server: api() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const body = (element: HTMLElement) => within(element.ownerDocument.body)

/** Never oneself: only a teammate's row has the buttons. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Aýna (You)')).toBeVisible()
    await expect(canvas.getAllByRole('button', { name: 'New setup link' })).toHaveLength(1)
    await expect(canvas.getAllByRole('button', { name: 'Turn off' })).toHaveLength(1)
  },
}

export const Invites: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Add a teammate' }))
    const form = within(await body(canvasElement).findByRole('dialog'))
    await userEvent.type(form.getByLabelText('Login'), 'A')
    await userEvent.type(form.getByLabelText('Name'), 'Merjen')
    await userEvent.click(form.getByRole('button', { name: 'Add' }))
    await expect(await form.findByRole('alert')).toHaveTextContent('3–32 characters')
    await userEvent.clear(form.getByLabelText('Login'))
    await userEvent.type(form.getByLabelText('Login'), 'merjen')
    await userEvent.click(form.getByRole('button', { name: 'Add' }))
    await expect(await body(canvasElement).findByText(/It works for 24 hours/)).toBeInTheDocument()
    await expect(await body(canvasElement).findByDisplayValue(LINK.url)).toBeInTheDocument()
  },
}

export const LoginTaken: Story = {
  args: { server: api(() => json(409, { error: { code: 'login_taken' } })) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Add a teammate' }))
    const form = within(await body(canvasElement).findByRole('dialog'))
    await userEvent.type(form.getByLabelText('Login'), 'merdan')
    await userEvent.type(form.getByLabelText('Name'), 'Merdan')
    await userEvent.click(form.getByRole('button', { name: 'Add' }))
    await expect(await form.findByRole('alert')).toHaveTextContent('This login is taken.')
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
