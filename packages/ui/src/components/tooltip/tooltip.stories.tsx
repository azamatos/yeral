/**
 * Overlays/Tooltip (DS-Patterns `.y-tip-ink`): a hint for icon-only buttons, ink, 12/16 500, up to 236 wide; `label`, the
 * rail's one-line name to the right of its icon.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarDays, CircleHelp } from 'lucide-react'
import { expect, userEvent, within } from 'storybook/test'
import { Button } from '../button'
import { Tooltip } from './tooltip'

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  args: {
    content: 'Only no-shows count towards Phone only.',
    children: (
      <Button variant="ghost" iconOnly aria-label="Phone only">
        <CircleHelp />
      </Button>
    ),
  },
} satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole('button', { name: 'Phone only' }))
    await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent('Only no-shows count towards Phone only.')
  },
}

/** The rail's name beside an icon. */
export const RailLabel: Story = {
  args: {
    side: 'right',
    variant: 'label',
    content: 'Bookings · 6 requests',
    children: (
      <Button variant="ghost" iconOnly aria-label="Bookings, 6 requests">
        <CalendarDays />
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.hover(canvas.getByRole('button'))
    await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent('Bookings · 6 requests')
  },
}
