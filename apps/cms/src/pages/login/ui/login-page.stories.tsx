import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { json, PageStory, pathOf } from '@/shared/storybook'
import { LoginPage } from './login-page'

const ME = { id: 'a1', login: 'ayna', name: 'Aýna', role: 'admin', recoveryCodesLeft: 10 }
const CHALLENGE = { challenge: 'a-challenge-token-of-some-length', login: 'ayna', expiresAt: Date.UTC(2026, 10, 6, 9, 5) }

/** Nobody signed in; the first step answers with `password`, the second with `code`. */
const api =
  (password: () => Response, code: () => Response = () => json(200, ME)) =>
  (): typeof fetch => {
    let signedIn = false
    return (input) => {
      const path = pathOf(input)
      if (path === '/v1/admin/sign-in') return Promise.resolve(password())
      if (path === '/v1/admin/sign-in/code') {
        const answer = code()
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
  args: { routes: { '/login': LoginPage, '/businesses': Businesses }, path: '/login', server: api(() => json(200, CHALLENGE)) },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']
const fillPassword = async (canvas: Canvas) => {
  await userEvent.type(await canvas.findByLabelText('Login'), 'ayna')
  await userEvent.type(canvas.getByLabelText('Password'), 'a long password')
  await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
}
const fillCode = async (canvas: Canvas) => {
  await userEvent.type(await canvas.findByLabelText(/Authenticator code/), '123456')
  await userEvent.click(canvas.getByRole('button', { name: 'Log in' }))
}

/** The login and the password, then the code for who they were: in. */
export const SignsIn: Story = {
  play: async ({ canvas }) => {
    await waitFor(() => expect(document.title).toBe('Log in · Ýeral Admin'))
    await fillPassword(canvas)
    await expect(await canvas.findByRole('heading', { name: 'Enter the code' })).toBeVisible()
    await expect(canvas.getByText('ayna')).toBeVisible()
    await fillCode(canvas)
    await expect(await canvas.findByText('the businesses')).toBeVisible()
  },
}

/** A wrong password or an unknown login reads the same, and there's no second step. */
export const WrongPassword: Story = {
  args: { server: api(() => json(401, { error: { code: 'sign_in_failed' } })) },
  play: async ({ canvas }) => {
    await fillPassword(canvas)
    await expect(await canvas.findByRole('alert')).toHaveTextContent('The login or password is wrong.')
    await expect(canvas.getByLabelText('Login')).toHaveValue('ayna')
    await expect(canvas.queryByRole('button', { name: 'Log in' })).not.toBeInTheDocument()
  },
}

/** A wrong code stays on the second step and is asked for again; «Change» goes back to the first with the login kept. */
export const WrongCode: Story = {
  args: {
    server: api(
      () => json(200, CHALLENGE),
      () => json(400, { error: { code: 'admin_code_wrong' } }),
    ),
  },
  play: async ({ canvas }) => {
    await fillPassword(canvas)
    await fillCode(canvas)
    await expect(await canvas.findByRole('alert')).toHaveTextContent("That code didn't match.")
    await expect(canvas.getByLabelText(/Authenticator code/)).toHaveValue('')
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }))
    await expect(await canvas.findByLabelText('Login')).toHaveValue('ayna')
    await expect(canvas.getByLabelText('Password')).toHaveValue('')
  },
}

/** A challenge that ran out (or took too many wrong codes): back to the first step with a word why. */
export const Expired: Story = {
  args: {
    server: api(
      () => json(200, CHALLENGE),
      () => json(401, { error: { code: 'sign_in_expired' } }),
    ),
  },
  play: async ({ canvas }) => {
    await fillPassword(canvas)
    await fillCode(canvas)
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Your sign-in ran out.')
    await expect(canvas.getByLabelText('Login')).toHaveValue('ayna')
    await expect(canvas.getByRole('button', { name: 'Continue' })).toBeVisible()
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
