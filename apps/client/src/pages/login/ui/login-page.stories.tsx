/**
 * `/{lang}/login` — the login's own address (client spec §3; book C-19): the modal over the site, then back to where
 * the visitor came from (`?redirect=`, only this site in this language) or Home.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useLocation } from '@tanstack/react-router'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SiteLayout } from '@/widgets/site-layout'
import { AYJEMAL, authApi, PageStory } from '@/shared/storybook'
import { LoginPage } from './login-page'

function Login() {
  return (
    <SiteLayout>
      <LoginPage />
    </SiteLayout>
  )
}

/** Where the login went: a stand-in that says the address. */
function Landed() {
  const { pathname } = useLocation()
  return <p>Landed on {pathname}</p>
}

const meta = {
  title: 'Client/Pages/Login',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: {
    routes: { '/$lang/login': Login, '/$lang': Landed, '/$lang/account/profile': Landed },
    path: '/en/login?redirect=%2Fen%2Faccount%2Fprofile',
    server: authApi({ people: [AYJEMAL] }),
  },
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/** Signed in: back to the page that asked for it. */
export const BackWhereAsked: Story = {
  name: 'Back where it was asked',
  play: async ({ canvas }) => {
    const dialog = await body.findByRole('dialog', { name: 'Log in to Ýeral' })
    await userEvent.type(within(dialog).getByLabelText('Phone number'), '65901122{Enter}')
    await body.findByRole('dialog', { name: 'Enter the code' })
    await userEvent.keyboard('4821')
    await expect(await canvas.findByText('Landed on /en/account/profile')).toBeVisible()
  },
}

/** Closed without logging in: Home. */
export const Closed: Story = {
  play: async ({ canvas }) => {
    const dialog = await body.findByRole('dialog', { name: 'Log in to Ýeral' })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await expect(await canvas.findByText('Landed on /en')).toBeVisible()
  },
}

/** A `redirect` to another site is never followed: Home. */
export const ForeignRedirect: Story = {
  name: 'Redirect elsewhere refused',
  args: { path: '/en/login?redirect=%2F%2Fevil.example' },
  play: async ({ canvas }) => {
    await userEvent.type(await body.findByLabelText('Phone number'), '65901122{Enter}')
    await body.findByRole('dialog', { name: 'Enter the code' })
    await userEvent.keyboard('4821')
    await expect(await canvas.findByText('Landed on /en')).toBeVisible()
  },
}
