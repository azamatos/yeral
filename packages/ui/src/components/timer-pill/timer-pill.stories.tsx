/**
 * Status/TimerPill (DS-Patterns → Status «TimerPill»): the time left to answer a request. M (26) in tables and drawers,
 * S (18, white) on a warning-tinted block; danger ink from 15 minutes left; «By 09:30» for a request that arrived while
 * the business was closed. `role="timer"`, named by the full sentence.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { TimerPill } from './timer-pill'

const NOW = Date.UTC(2026, 9, 21, 10, 0)
const min = (n: number) => NOW + n * 60_000
const words = { format: (m: number) => `${m} min`, label: (m: number) => `${m} min left to answer` }

const meta = {
  title: 'Status/TimerPill',
  component: TimerPill,
  args: { until: min(18), now: NOW, ...words },
} satisfies Meta<typeof TimerPill>
export default meta
type Story = StoryObj<typeof meta>

/** 18 minutes left: amber ink, the sentence as its name. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const timer = within(canvasElement).getByRole('timer', { name: '18 min left to answer' })
    await expect(timer).toHaveTextContent('18 min')
    await expect(timer).toHaveClass('text-st-pending-ink')
  },
}

/** 15 minutes or fewer: danger ink, nothing else changes. */
export const Hot: Story = {
  args: { until: min(9) },
  play: async ({ canvasElement }) => {
    const timer = within(canvasElement).getByRole('timer', { name: '9 min left to answer' })
    await expect(timer).toHaveClass('text-danger-ink')
  },
}

/** S on a warning-tinted block (a request card), and its hot form. */
export const Small: Story = {
  render: (args) => (
    <span className="inline-flex gap-2 rounded-s bg-st-pending-bg p-2">
      <TimerPill {...args} size="s" />
      <TimerPill {...args} size="s" until={min(9)} />
    </span>
  ),
}

/** Arrived while the business was closed: when to answer by, never hot. */
export const ArrivedWhileClosed: Story = {
  args: { until: min(3), by: { text: 'By 09:30', label: 'Answer by 09:30 tomorrow' } },
  play: async ({ canvasElement }) => {
    const timer = within(canvasElement).getByRole('timer', { name: 'Answer by 09:30 tomorrow' })
    await expect(timer).toHaveTextContent('By 09:30')
    await expect(timer).toHaveClass('text-st-pending-ink')
  },
}

/**
 * A hold that runs past closing counts only while the business is open: its screen passes the open minutes left, here
 * 25 though the answer is due tomorrow morning.
 */
export const OpenMinutes: Story = {
  args: { until: new Date(min(15 * 60)), left: () => 25 },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('timer', { name: '25 min left to answer' })).toHaveTextContent('25 min')
  },
}

/** Time up: 0, never below. */
export const TimeUp: Story = {
  args: { until: min(-5) },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('timer')).toHaveTextContent('0 min')
  },
}

/** Russian-length words. */
export const Russian: Story = {
  render: (args) => (
    <span className="flex flex-wrap items-center gap-2">
      <TimerPill {...args} format={(m) => `${m} мин`} label={(m) => `Осталось ${m} мин на ответ`} />
      <TimerPill {...args} by={{ text: 'До 09:30', label: 'Ответить до 09:30 завтра' }} />
    </span>
  ),
}
