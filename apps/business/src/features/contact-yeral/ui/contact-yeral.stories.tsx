/**
 * Business/Shell/ContactMenu (B-Shell "Contact Ýeral · submenu", the owner's box, the Hidden by Ýeral banner; B-Mobile
 * "as a small sheet"): "Contact Ýeral" opens the ways to reach Ýeral that the deployment sets (`site.support`, book
 * F-174): Call, Write on Telegram, Write an e-mail. The account menu's submenu shows the same links (Business/Shell:
 * AccountMenu).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SUPPORT_LINE } from '@/shared/config'
import { I18nProvider } from '@/shared/i18n'
import { ContactYeralLink } from './contact-yeral'

const meta = {
  title: 'Business/Shell/ContactMenu',
  component: ContactYeralLink,
  decorators: [(Story) => <I18nProvider locale="en">{Story()}</I18nProvider>],
} satisfies Meta<typeof ContactYeralLink>
export default meta
type Story = StoryObj<typeof meta>

/** All three ways set (Storybook's own values): the number to call, Telegram in a new tab, the e-mail to write to. */
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
    await expect(within(menu).getByRole('menuitem', { name: `Write an e-mail ${SUPPORT_LINE.email}` })).toHaveAttribute(
      'href',
      SUPPORT_LINE.emailHref,
    )
    await userEvent.keyboard('{Escape}')
  },
}

/** Only a phone set: one way, nothing about Telegram or e-mail. */
export const PhoneOnly: Story = {
  args: { support: { phone: '+99312345678' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Contact Ýeral' }))
    const menu = await within(document.body).findByRole('menu', { name: 'Contact Ýeral' })
    await waitFor(() => expect(menu).toBeVisible())
    await expect(within(menu).getAllByRole('menuitem')).toHaveLength(1)
    await expect(within(menu).getByRole('menuitem', { name: 'Call +993 12 34 56 78' })).toHaveAttribute('href', 'tel:+99312345678')
    await userEvent.keyboard('{Escape}')
  },
}

/** No way set (local work without the variables): no Contact Ýeral at all. */
export const None: Story = {
  args: { support: {} },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull()
  },
}

/** On a phone: a small sheet. */
export const Sheet: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Contact Ýeral' }))
    const sheet = await within(document.body).findByRole('dialog', { name: 'Contact Ýeral' })
    await expect(within(sheet).getByRole('link', { name: `Call ${SUPPORT_LINE.phone}` })).toBeVisible()
    await expect(within(sheet).getByRole('link', { name: `Write an e-mail ${SUPPORT_LINE.email}` })).toHaveAttribute(
      'href',
      SUPPORT_LINE.emailHref,
    )
    await userEvent.keyboard('{Escape}')
  },
}
