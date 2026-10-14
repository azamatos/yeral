/** Tooltip — for icon-only buttons. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Share2 } from 'lucide-react'
import { Button } from '../button'
import { Tooltip } from './tooltip'

const meta = {
  title: 'Overlays/Tooltip',
  component: Tooltip,
  args: {
    content: 'Paýlaş',
    children: (
      <Button iconOnly aria-label="Paýlaş">
        <Share2 />
      </Button>
    ),
  },
} satisfies Meta<typeof Tooltip>
export default meta
type Story = StoryObj<typeof meta>
export const Default: Story = {}
