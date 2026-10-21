/**
 * Navigation/AccountMenu (DS-Patterns 06; B-Shell `.me`): the person at the bottom of the sidebar, not a switcher. Avatar
 * 32, name, phone and the "…" button, the only thing that opens the menu (300, above the block): My profile · Your
 * Ýeral page · Open as a client (yeral.app) · Contact Ýeral (a submenu: Call the support line, Write on Telegram) · Log out
 * (danger, after a separator). No Language row at the first release. The rail: the avatar alone in a 44 button.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ExternalLink, Eye, Headset, LogOut, Phone, Send, User } from 'lucide-react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { AccountMenu, type AccountMenuItem } from './account-menu'

const onProfile = fn()
const onLogout = fn()

const ITEMS: AccountMenuItem[] = [
  { id: 'profile', label: 'My profile', icon: <User />, onSelect: onProfile },
  { id: 'page', label: 'Your Ýeral page', icon: <Eye />, href: '#page', external: true },
  { id: 'client', label: 'Open as a client', icon: <ExternalLink />, hint: 'yeral.app', href: '#client', external: true },
  {
    id: 'contact',
    label: 'Contact Ýeral',
    icon: <Headset />,
    links: [
      { id: 'call', label: 'Call', caption: '+993 12 34 56 78', icon: <Phone />, href: 'tel:+99312345678' },
      { id: 'telegram', label: 'Write on Telegram', caption: '@yeral', icon: <Send />, href: 'https://t.me/yeral', external: true },
    ],
  },
  { id: 'logout', label: 'Log out', icon: <LogOut />, danger: true, onSelect: onLogout },
]

const meta = {
  title: 'Navigation/AccountMenu',
  component: AccountMenu,
  args: {
    name: 'Maýsa Annaýewa',
    phone: '+993 65 10 20 30',
    items: ITEMS,
    menuLabel: 'Account',
    triggerLabel: 'Account menu',
    className: 'w-68',
  },
} satisfies Meta<typeof AccountMenu>
export default meta
type Story = StoryObj<typeof meta>

export const UserBlock: Story = {}

/** Open: the menu above the block; Log out in danger ink after a separator; keyboard and pointer. */
export const Open: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Account menu' }))
    const menu = await within(document.body).findByRole('menu', { name: 'Account' })
    await waitFor(() => expect(menu).toBeVisible())
    // the board's 300 (the test's narrow frame may take a pixel or two), not the popover's default 280
    await expect(menu.getBoundingClientRect().width).toBeGreaterThan(290)
    await expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((i) => i.textContent),
    ).toEqual(['My profile', 'Your Ýeral page', 'Open as a clientyeral.app', 'Contact Ýeral', 'Log out'])
    await expect(within(menu).getByRole('separator')).toBeInTheDocument()
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect(onProfile).toHaveBeenCalled()
    // the focus is back on the button
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Account menu' })).toHaveFocus())
  },
}

export const LogOutItem: Story = {
  name: 'Log out',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Account menu' }))
    await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'Log out' }))
    await expect(onLogout).toHaveBeenCalled()
  },
}

/** Contact Ýeral (B-Shell "· submenu"): → or a click opens it beside the menu, ← goes back; Telegram opens a new tab. */
export const ContactSubmenu: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Account menu' }))
    const body = within(document.body)
    const contact = await body.findByRole('menuitem', { name: 'Contact Ýeral' })
    await expect(contact).toHaveAttribute('aria-haspopup', 'menu')
    contact.focus()
    await userEvent.keyboard('{ArrowRight}')
    const sub = await body.findByRole('menu', { name: 'Contact Ýeral' })
    await waitFor(() => expect(sub).toBeVisible())
    const call = within(sub).getByRole('menuitem', { name: 'Call +993 12 34 56 78' })
    await expect(call).toHaveAttribute('href', 'tel:+99312345678')
    const telegram = within(sub).getByRole('menuitem', { name: 'Write on Telegram @yeral' })
    await expect(telegram).toHaveAttribute('href', 'https://t.me/yeral')
    await expect(telegram).toHaveAttribute('target', '_blank')
    await userEvent.keyboard('{ArrowLeft}')
    await waitFor(() => expect(body.queryByRole('menu', { name: 'Contact Ýeral' })).not.toBeInTheDocument())
    await waitFor(() => expect(contact).toHaveFocus())
    await userEvent.keyboard('{Escape}')
  },
}

/** Rail (768–1023): the avatar in a 44 button; the menu opens to the right. */
export const Rail: Story = {
  args: { variant: 'rail', triggerLabel: 'Account menu: Maýsa Annaýewa', className: undefined },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Account menu: Maýsa Annaýewa' }))
    const menu = await within(document.body).findByRole('menu', { name: 'Account' })
    await waitFor(() => expect(menu).toBeVisible())
    await userEvent.keyboard('{Escape}')
  },
}

/** A long name: cut with an ellipsis, the button never moves. */
export const LongName: Story = { args: { name: 'Gülälek Nurmuhammedowa-Annaberdiýewa' } }

/** Russian, ~30% longer (the board's Long-text check). */
export const RussianLength: Story = {
  args: {
    menuLabel: 'Аккаунт',
    triggerLabel: 'Меню аккаунта',
    items: [
      { id: 'profile', label: 'Мой профиль', icon: <User /> },
      { id: 'page', label: 'Ваша страница на Ýeral', icon: <Eye /> },
      { id: 'client', label: 'Открыть как клиент', icon: <ExternalLink />, hint: 'yeral.app' },
      { id: 'logout', label: 'Выйти', icon: <LogOut />, danger: true },
    ],
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Меню аккаунта' }))
    const menu = await within(document.body).findByRole('menu', { name: 'Аккаунт' })
    await waitFor(() => expect(menu).toBeVisible())
    await userEvent.keyboard('{Escape}')
  },
}
