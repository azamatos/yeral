/** Count pills — tabs (neutral → accent when active) and the sidebar's pending count (attention). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CountBadge } from './count-badge'

const meta = { title: 'Status/CountBadge', component: CountBadge, args: { children: 3 } } satisfies Meta<typeof CountBadge>
export default meta
type Story = StoryObj<typeof meta>

export const Tones: Story = {
  render: () => (
    <div className="flex gap-3">
      <CountBadge>5</CountBadge>
      <CountBadge tone="accent">3</CountBadge>
      <CountBadge tone="attention">3</CountBadge>
    </div>
  ),
}
