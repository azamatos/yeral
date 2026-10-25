/**
 * Display/ChangeSummary (DS-Patterns → Booking move mode): before and after a change. Bar (a move request: the old
 * time kept until the business confirms), BarInstant (the old time struck), Rows (a drawer on the team's side).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { ChangeSummary } from './change-summary'

const meta = {
  title: 'Display/ChangeSummary',
  component: ChangeSummary,
  args: {
    from: 'Thu, 15 Oct · 14:30',
    to: 'Sat, 17 Oct · 11:30',
    labels: { from: 'Previous time', to: 'New time' },
  },
} satisfies Meta<typeof ChangeSummary>
export default meta
type Story = StoryObj<typeof meta>

/** A move request: «Previous time» → «New time»; the arrow says nothing, the labels carry the order. */
export const Bar: Story = {
  render: (args) => (
    <div className="max-w-xl">
      <ChangeSummary {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('Previous timeThu, 15 Oct · 14:30New timeSat, 17 Oct · 11:30')
    await expect(canvasElement.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  },
}

/** An instant business: the move is made at once, the old time struck through. */
export const BarInstant: Story = {
  args: { moved: true },
  render: (args) => (
    <div className="max-w-xl">
      <ChangeSummary {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Thu, 15 Oct · 14:30')).toHaveClass('line-through')
  },
}

/** A drawer on the team's side: the caps title, a 92 label column on a quiet panel. */
export const Rows: Story = {
  args: { variant: 'rows', title: 'Time change request', from: 'Fri, 16 Oct · 10:00' },
  render: (args) => (
    <div className="w-96">
      <ChangeSummary {...args} />
    </div>
  ),
}

/** The phone: the halves stacked, the arrow pointing down. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }

/** Russian-length words. */
export const Russian: Story = {
  args: {
    from: 'Чт, 15 окт · 14:30',
    to: 'Сб, 17 окт · 11:30',
    labels: { from: 'Прежнее время', to: 'Новое время' },
  },
  render: (args) => (
    <div className="max-w-xl flex flex-col gap-4">
      <ChangeSummary {...args} />
      <ChangeSummary {...args} variant="rows" title="Запрос на перенос времени" />
    </div>
  ),
}
