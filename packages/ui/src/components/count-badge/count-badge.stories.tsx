/**
 * Status/CountBadge (DS-Patterns · CountBadge): tab counts (neutral → accent when active), requests (attention, amber),
 * unanswered reviews (muted); the rail's 8 px dots; 99+ above 99. The number is decorative where its link reads it in
 * full ("Bookings, 6 requests").
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { CountBadge } from './count-badge'

const meta = { title: 'Status/CountBadge', component: CountBadge, args: { children: 3 } } satisfies Meta<typeof CountBadge>
export default meta
type Story = StoryObj<typeof meta>

export const Tones: Story = {
  render: () => (
    <div className="flex gap-3">
      <CountBadge>5</CountBadge>
      <CountBadge tone="accent">3</CountBadge>
      <CountBadge tone="attention">6</CountBadge>
      <CountBadge tone="muted">4</CountBadge>
    </div>
  ),
}

export const Max99: Story = {
  args: { tone: 'attention', children: 120 },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('99+')
  },
}

/** The rail's dots (`.rdot`): attention for requests, muted for reviews. */
export const RailDot: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <CountBadge variant="dot" tone="attention" />
      <CountBadge variant="dot" tone="muted" />
    </div>
  ),
}
