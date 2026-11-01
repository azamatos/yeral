import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { json, PageStory, pathOf } from '@/shared/storybook'
import { LoginPage } from './login-page'

const ME = { id: 'a1', login: 'ayna', name: 'Aýna', recoveryCodesLeft: 10 }

/** Nobody signed in; the sign-in answers with `signIn`. */
const api = (signIn: () => Response) => (): typeof fetch => {
  let signedIn = false
  return (input) => {
    const path = pathOf(input)
    if (path === '/v1/admin/sign-in') {
      const answer = signIn()
      signedIn = answer.ok
      return Promise.resolve(answer)
    }
    return Promise.resolve(signedIn ? json(200, ME) : json(401, { error: { code: 'unauthorized' } }))
  }
}

function Businesses() {
  return <p>the businesses</p>
}

const meta = {
  title: 'Admin/Pages/Login',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/login': LoginPage, '/businesses': Businesses }, path: '/login' },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const fill = async (canvas: Parameters<NonNullable<Story['play']>>[0]['canvas']) => {
  await userEvent.type(await canvas.findByLabelText('Login'), 'ayna')
  await userEvent.type(canvas.getByLabelText('Password'), 'a long password')
  await userEvent.type(canvas.getByLabelText(/Authenticator code/), '123456')
  await userEvent.click(canvas.getByRole('button', { name: 'Log in' }))
}

export const SignsIn: Story = {
  args: { server: api(() => json(200, ME)) },
  play: async ({ canvas }) => {
    await waitFor(() => expect(document.title).toBe('Log in · Ýeral Admin'))
    await fill(canvas)
    await expect(await canvas.findByText('the businesses')).toBeVisible()
  },
}

/** Any wrong part reads the same, and the code is asked for again. */
export const WrongPart: Story = {
  args: { server: api(() => json(401, { error: { code: 'sign_in_failed' } })) },
  play: async ({ canvas }) => {
    await fill(canvas)
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The login, password or code is wrong.')
    await expect(canvas.getByLabelText(/Authenticator code/)).toHaveValue('')
    await expect(canvas.getByLabelText('Login')).toHaveValue('ayna')
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } }, args: { server: api(() => json(200, ME)) } }
