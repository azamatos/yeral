/**
 * The site's chrome — Home (marketing header, footer), Auth «Logged-in header» (avatar + menu 260; a bottom sheet under
 * 768), Mobile frame 1 (56-high header, 24 logo). Over a fake api: who is signed in, and logging out.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { authApi, AYJEMAL, PageStory, person } from '@/shared/storybook'
import { SiteLayout } from './site-layout'

function Page() {
  return (
    <SiteLayout>
      <div className="h-60" />
    </SiteLayout>
  )
}

const meta = {
  title: 'Client/Widgets/SiteLayout',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/$lang': Page }, server: authApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

/** Nobody signed in: the logo home, «For business», «Log in»; the footer's business links and the copyright. */
export const SignedOut: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/en/login?redirect=%2Fen')
    await expect(canvas.getByRole('link', { name: 'Ýeral home' })).toHaveAttribute('href', '/en')
    await expect(canvas.getByRole('link', { name: 'For business' })).toBeVisible()
    const footer = canvas.getByRole('navigation', { name: 'For business' })
    await expect(within(footer).getByRole('link', { name: 'Ýeral Business' })).toBeVisible()
    await expect(within(footer).getByRole('link', { name: 'Business login' })).toBeVisible()
    await expect(canvas.getByText(/^© \d{4} Ýeral$/)).toBeVisible()
    // one language at the first launch: no switcher
    await expect(canvas.queryByRole('button', { name: /choose a language/ })).toBeNull()
  },
}

/** Signed in: the avatar's menu says who, and «Log out» brings «Log in» back. */
export const SignedIn: Story = {
  args: { server: authApi({ signedIn: AYJEMAL }) },
  play: async ({ canvas }) => {
    const avatar = await canvas.findByRole('button', { name: 'Account menu: Aýjemal Gurbanowa' })
    await userEvent.click(avatar)
    const menu = await body.findByRole('menu')
    await waitFor(() => expect(within(menu).getByText('Aýjemal Gurbanowa')).toBeVisible())
    await expect(within(menu).getByText('+993 65 90 11 22')).toBeVisible()
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Log out' }))
    await expect(await canvas.findByRole('link', { name: 'Log in' })).toBeVisible()
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull())
  },
}

/** The menu is a popover: Esc closes it and the avatar has the focus again. */
export const MenuKeyboard: Story = {
  args: { server: authApi({ signedIn: AYJEMAL }) },
  play: async ({ canvas }) => {
    const avatar = await canvas.findByRole('button', { name: /Account menu/ })
    avatar.focus()
    await userEvent.keyboard('{Enter}')
    await expect(await body.findByRole('menuitem', { name: 'Log out' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(avatar).toHaveFocus())
  },
}

/** Logging out failed (no connection): the menu stays, a toast says why. */
export const LogOutFails: Story = {
  args: { server: authApi({ signedIn: AYJEMAL, logoutFails: true }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Account menu/ }))
    await userEvent.click(await body.findByRole('menuitem', { name: 'Log out' }))
    const toast = await body.findByText('No connection. Please try again.')
    await waitFor(() => expect(toast).toBeVisible())
    await expect(body.getByRole('menu')).toBeVisible()
    await userEvent.keyboard('{Escape}')
  },
}

/** Signed in before giving a name: a person icon, and the menu leads with the phone. */
export const NoNameYet: Story = {
  args: { server: authApi({ signedIn: person('+99364215590', null) }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Account menu' }))
    const phone = await body.findByText('+993 64 21 55 90')
    await waitFor(() => expect(phone).toBeVisible())
    await userEvent.keyboard('{Escape}')
  },
}

/** A long name (Russian runs ~30% longer): it wraps in the menu instead of widening it. */
export const LongName: Story = {
  args: { server: authApi({ signedIn: person('+99365901122', 'Aýjemal-Gülälek', 'Gurbanmuhammedowa-Öwezgeldiýewa') }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Account menu/ }))
    const menu = await body.findByRole('menu')
    await waitFor(() => expect(menu.getBoundingClientRect().width).toBe(260))
    await userEvent.keyboard('{Escape}')
  },
}

/** Phone: 56-high header, no «For business»; the avatar opens a bottom sheet with the same rows. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { server: authApi({ signedIn: AYJEMAL }) },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link', { name: 'For business' })).toBeNull()
    await userEvent.click(await canvas.findByRole('button', { name: /Account menu/ }))
    const sheet = await body.findByRole('dialog', { name: 'Aýjemal Gurbanowa' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Log out' }))
    await expect(await canvas.findByRole('link', { name: 'Log in' })).toBeVisible()
  },
}

/** Phone, signed out. */
export const PhoneSignedOut: Story = {
  globals: { viewport: { value: 'xs' } },
}
