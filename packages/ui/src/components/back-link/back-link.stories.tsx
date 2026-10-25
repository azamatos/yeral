/** Navigation/BackLink (DS-Patterns `.y-back`): back to the list a page came from, «‹ Specialists». */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { BackLink } from './back-link'

const meta = { title: 'Navigation/BackLink', component: BackLink, args: { href: '#team', children: 'Specialists' } } satisfies Meta<
  typeof BackLink
>
export default meta
type Story = StoryObj<typeof meta>

/** A link named by its words; the chevron is decoration. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Specialists' })
    await expect(link).toHaveAttribute('href', '#team')
    await expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  },
}

/** Around a router's link (`asChild`): its words become the label, the chevron goes before them. */
export const AsChild: Story = {
  render: () => (
    <BackLink asChild>
      <a href="#clients">Clients</a>
    </BackLink>
  ),
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole('link', { name: 'Clients' })
    await expect(link.querySelector('svg')).not.toBeNull()
  },
}

/** Russian-length words. */
export const Russian: Story = { args: { children: 'Все специалисты' } }
