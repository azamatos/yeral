import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { json, PageStory, pathOf } from '@/shared/storybook'
import { SetupPage } from './setup-page'

const SECRET = { secret: 'JBSWY3DPEHPK3PXP', uri: 'otpauth://totp/Yeral:ayna?secret=JBSWY3DPEHPK3PXP&issuer=Yeral' }
const CODES = [
  'abcd-efgh',
  'ijkl-mnop',
  'qrst-uvwx',
  'yzab-cdef',
  'ghij-klmn',
  'opqr-stuv',
  'wxyz-abcd',
  'efgh-ijkl',
  'mnop-qrst',
  'uvwx-yzab',
]

const working = (): typeof fetch => (input) => {
  const path = pathOf(input)
  if (path.endsWith('/password')) return Promise.resolve(json(200, SECRET))
  if (path.endsWith('/confirm')) return Promise.resolve(json(200, { codes: CODES }))
  return Promise.resolve(json(200, { login: 'ayna', name: 'Aýna' }))
}

function Page() {
  return <SetupPage token="a-setup-token-of-twenty-characters" />
}
function Businesses() {
  return <p>the businesses</p>
}

const meta = {
  title: 'Admin/Pages/Setup link',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/': Page, '/businesses': Businesses }, server: working },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** The password, the app and its first code, the codes shown once. */
export const AllTheWay: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Hello, Aýna' })).toBeVisible()
    await userEvent.type(canvas.getByLabelText('Password'), 'short')
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Use at least 12 characters.')
    await userEvent.type(canvas.getByLabelText('Password'), ' but now it is long')
    await userEvent.type(canvas.getByLabelText('Password again'), 'not the same')
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The two passwords are different.')
    await userEvent.clear(canvas.getByLabelText('Password again'))
    await userEvent.type(canvas.getByLabelText('Password again'), 'short but now it is long')
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))

    await expect(await canvas.findByRole('img', { name: 'QR code for your authenticator app' })).toBeVisible()
    await userEvent.type(canvas.getByLabelText('6-digit code'), '123456')
    await userEvent.click(canvas.getByRole('button', { name: 'Confirm' }))

    await expect(await canvas.findByText('abcd-efgh')).toBeVisible()
    const finish = canvas.getByRole('button', { name: 'Open Ýeral Admin' })
    await expect(finish).toBeDisabled()
    await userEvent.click(canvas.getByLabelText("I've saved them"))
    await userEvent.click(finish)
    await expect(await canvas.findByText('the businesses')).toBeVisible()
  },
}

export const LinkRanOut: Story = {
  args: { server: () => () => Promise.resolve(json(404, { error: { code: 'setup_expired' } })) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'This link has run out' })).toBeVisible()
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
