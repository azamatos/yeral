import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { json, PageStory, pathOf } from '@/shared/storybook'
import { TeamPage } from './team-page'
import { TeamShell } from './team-shell'

const ME = { id: 'a1', login: 'ayna', name: 'Aýna', recoveryCodesLeft: 7 }

const working = (): typeof fetch => {
  let signedIn = true
  return (input) => {
    const path = pathOf(input)
    if (path === '/v1/admin/sign-out') {
      signedIn = false
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    if (path === '/v1/admin/me/recovery-codes') return Promise.resolve(json(200, { codes: ['abcd-efgh', 'ijkl-mnop'] }))
    if (path === '/v1/admin/me/password') return Promise.resolve(new Response(null, { status: 204 }))
    return Promise.resolve(signedIn ? json(200, ME) : json(401, { error: { code: 'unauthorized' } }))
  }
}

function Businesses() {
  return <TeamPage title="Businesses">the businesses</TeamPage>
}
function Login() {
  return <p>the sign-in</p>
}

const meta = {
  title: 'Admin/Widgets/Team shell',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: {
    routes: { '/login': Login },
    shell: { component: TeamShell, routes: { '/businesses': Businesses } },
    path: '/businesses',
    server: working,
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const menu = async (canvas: Parameters<NonNullable<Story['play']>>[0]['canvas']) => {
  await userEvent.click(await canvas.findByRole('button', { name: 'Open your account menu' }))
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Businesses' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Reported reviews' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Team' })).toBeVisible()
  },
}

export const NewRecoveryCodes: Story = {
  play: async ({ canvas, canvasElement }) => {
    await menu(canvas)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(await body.findByRole('menuitem', { name: 'New recovery codes' }))
    await expect(await body.findByText('You have 7 left. New codes replace them all.')).toBeInTheDocument()
    await userEvent.type(body.getByLabelText('Authenticator code'), '123456')
    await userEvent.click(body.getByRole('button', { name: 'Make new codes' }))
    await expect(await body.findByText('abcd-efgh')).toBeVisible()
  },
}

export const LogsOut: Story = {
  play: async ({ canvas, canvasElement }) => {
    await menu(canvas)
    await userEvent.click(await within(canvasElement.ownerDocument.body).findByRole('menuitem', { name: 'Log out' }))
    await expect(await canvas.findByText('the sign-in')).toBeVisible()
  },
}

/** A desk tool down to a phone: the rail stays beside the page. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
