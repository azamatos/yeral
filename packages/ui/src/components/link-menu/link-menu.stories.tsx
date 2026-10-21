/**
 * Navigation/LinkMenu (B-Shell ContactMenu; B-Mobile "as a small sheet"): a title and a few links with a second line,
 * opened by any trigger. From 768 a menu 300 wide under the trigger; on phones a small sheet with 56 rows. Esc or a tap
 * outside closes it and the focus goes back to the trigger; Telegram opens in a new tab.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Phone, Send } from 'lucide-react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { textLink } from '../text-link'
import { LinkMenu } from './link-menu'

const meta = {
  title: 'Navigation/LinkMenu',
  component: LinkMenu,
  args: {
    title: 'Contact Ýeral',
    trigger: (
      <button type="button" className={textLink}>
        Contact Ýeral
      </button>
    ),
    links: [
      { id: 'call', label: 'Call', caption: '+993 12 34 56 78', icon: <Phone />, href: 'tel:+99312345678' },
      { id: 'telegram', label: 'Write on Telegram', caption: '@yeral', icon: <Send />, href: 'https://t.me/yeral', external: true },
    ],
  },
} satisfies Meta<typeof LinkMenu>
export default meta
type Story = StoryObj<typeof meta>

/** A menu from 768: the caps title, Call and Write on Telegram; Esc gives the focus back. */
export const Menu: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Contact Ýeral' })
    await userEvent.click(trigger)
    const menu = await within(document.body).findByRole('menu', { name: 'Contact Ýeral' })
    await waitFor(() => expect(menu).toBeVisible())
    await expect(within(menu).getByRole('menuitem', { name: 'Call +993 12 34 56 78' })).toHaveAttribute('href', 'tel:+99312345678')
    const telegram = within(menu).getByRole('menuitem', { name: 'Write on Telegram @yeral' })
    await expect(telegram).toHaveAttribute('target', '_blank')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

/** On a phone: a small sheet named by its title, the rows 56 high; Esc closes it back to the trigger. */
export const Sheet: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Contact Ýeral' })
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await userEvent.click(trigger)
    const sheet = await within(document.body).findByRole('dialog', { name: 'Contact Ýeral' })
    const call = within(sheet).getByRole('link', { name: 'Call +993 12 34 56 78' })
    await expect(call.getBoundingClientRect().height).toBeGreaterThanOrEqual(56)
    await expect(within(sheet).getByRole('link', { name: 'Write on Telegram @yeral' })).toHaveAttribute('target', '_blank')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}
