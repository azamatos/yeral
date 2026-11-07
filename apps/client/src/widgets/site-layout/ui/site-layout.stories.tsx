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
    // «Log out» asks first; the menu is gone, Cancel gives the avatar the focus back
    const ask = await body.findByRole('dialog', { name: 'Log out of Ýeral on this device?' })
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull())
    await userEvent.click(within(ask).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(avatar).toHaveFocus())
    await userEvent.click(avatar)
    await userEvent.click(await body.findByRole('menuitem', { name: 'Log out' }))
    const again = await body.findByRole('dialog', { name: 'Log out of Ýeral on this device?' })
    await userEvent.click(within(again).getByRole('button', { name: 'Log out' }))
    await expect(await canvas.findByRole('link', { name: 'Log in' })).toBeVisible()
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
  },
}

/** The menu is a popover: Esc closes it and the avatar has the focus again. */
export const MenuKeyboard: Story = {
  args: { server: authApi({ signedIn: AYJEMAL }) },
  play: async ({ canvas }) => {
    const avatar = await canvas.findByRole('button', { name: /Account menu/ })
    avatar.focus()
    await userEvent.keyboard('{Enter}')
    await expect(await body.findByRole('menuitem', { name: 'My bookings' })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(avatar).toHaveFocus())
  },
}

/** Logging out failed (no connection): the question stays for another try, a toast says why. */
export const LogOutFails: Story = {
  args: { server: authApi({ signedIn: AYJEMAL, logoutFails: true }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Account menu/ }))
    await userEvent.click(await body.findByRole('menuitem', { name: 'Log out' }))
    const ask = await body.findByRole('dialog', { name: 'Log out of Ýeral on this device?' })
    await userEvent.click(within(ask).getByRole('button', { name: 'Log out' }))
    const toast = await body.findByText('No connection. Please try again.')
    await waitFor(() => expect(toast).toBeVisible())
    await expect(ask).toBeVisible()
    await expect(within(ask).getByRole('button', { name: 'Log out' })).toBeEnabled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
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
    // the sheet gives way to the question (a bottom sheet too at this width)
    const ask = await body.findByRole('dialog', { name: 'Log out of Ýeral on this device?' })
    await waitFor(() => expect(body.queryByRole('dialog', { name: 'Aýjemal Gurbanowa' })).toBeNull())
    await userEvent.click(within(ask).getByRole('button', { name: 'Log out' }))
    await expect(await canvas.findByRole('link', { name: 'Log in' })).toBeVisible()
  },
}

/** Phone, signed out. */
export const PhoneSignedOut: Story = {
  globals: { viewport: { value: 'xs' } },
}

/** The search header (C7-Home C1 `.hdr.sr2`): 80 high over the whole width, the compact bar's slot after the logo, the nav as ever. */
export const SearchHeader: Story = {
  args: {
    routes: {
      '/$lang': () => (
        <SiteLayout search={<div role="search" aria-label="Search" />} wide>
          <div className="h-60" />
        </SiteLayout>
      ),
    },
  },
  play: async ({ canvas }) => {
    const bar = await canvas.findByRole('search', { name: 'Search' })
    await expect(bar.parentElement!.getBoundingClientRect().height).toBe(80)
    await expect(canvas.getByRole('link', { name: 'Ýeral home' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'For business' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Log in' })).toBeVisible()
  },
}

/** The results page on the phone: the slot with Back and the summary field takes the row's place. */
export const PhoneSearchHeader: Story = {
  globals: { viewport: { value: 'xs' } },
  args: {
    routes: {
      '/$lang': () => (
        <SiteLayout search={<div role="search" aria-label="Search" />} phoneSearch={<button type="button">Edit search</button>} wide>
          <div className="h-60" />
        </SiteLayout>
      ),
    },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Edit search' })).toBeVisible()
    await expect(canvas.queryByRole('link', { name: 'Ýeral home' })).toBeNull()
    await expect(canvas.queryByRole('search')).toBeNull()
  },
}
