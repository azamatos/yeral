/**
 * Business/Shell/ContactMenu (B-Shell "Contact Ýeral · submenu", the owner's box, the Hidden by Ýeral banner; B-Mobile
 * "as a small sheet"): "Contact Ýeral" opens Call (the market's support line) and Write on Telegram. The account menu's
 * submenu shows the same links (Business/Shell: AccountMenu).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { SUPPORT_LINE } from '@yeral/features/contact-yeral'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { I18nProvider } from '@/shared/i18n'
import { ContactYeralLink } from './contact-yeral'

const meta = {
  title: 'Business/Shell/ContactMenu',
  component: ContactYeralLink,
  decorators: [(Story) => <I18nProvider locale="en">{Story()}</I18nProvider>],
} satisfies Meta<typeof ContactYeralLink>
export default meta
type Story = StoryObj<typeof meta>

/** The link opens the menu: the support line's number to call, its Telegram in a new tab. */
export const Menu: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Contact Ýeral' }))
    const menu = await within(document.body).findByRole('menu', { name: 'Contact Ýeral' })
    await waitFor(() => expect(menu).toBeVisible())
    await expect(within(menu).getByRole('menuitem', { name: `Call ${SUPPORT_LINE.phone}` })).toHaveAttribute('href', SUPPORT_LINE.phoneHref)
    await expect(within(menu).getByRole('menuitem', { name: `Write on Telegram ${SUPPORT_LINE.telegram}` })).toHaveAttribute(
      'href',
      SUPPORT_LINE.telegramHref,
    )
    await userEvent.keyboard('{Escape}')
  },
}

/** On a phone: a small sheet. */
export const Sheet: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Contact Ýeral' }))
    const sheet = await within(document.body).findByRole('dialog', { name: 'Contact Ýeral' })
    await expect(within(sheet).getByRole('link', { name: `Call ${SUPPORT_LINE.phone}` })).toBeVisible()
    await userEvent.keyboard('{Escape}')
  },
}
