/**
 * Display/Timeline (DS-Patterns → «Timeline · status history and what's next»): a booking's history with tone markers,
 * and the numbered «what happens next» on a sent page. Tone names, not booking statuses.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { Timeline } from './timeline'

const meta = {
  title: 'Display/Timeline',
  component: Timeline,
  args: {
    'aria-label': 'Booking status',
    items: [
      { tone: 'accent', title: 'Sent', caption: '14 Oct · 14:40', state: '— done' },
      { tone: 'current', title: 'Waiting for confirmation', caption: 'The business answers by 15:10', state: '— now' },
      { tone: 'todo', title: 'Appointment', caption: '15 Oct · 14:30' },
    ],
  },
} satisfies Meta<typeof Timeline>
export default meta
type Story = StoryObj<typeof meta>

/**
 * A request waiting: sent (done), waiting now (the warning ring with its dot, `aria-current="step"`), the visit ahead
 * (the grey ring); each step's state in words for screen readers.
 */
export const StatusMarkers: Story = {
  play: async ({ canvasElement }) => {
    const list = within(canvasElement).getByRole('list', { name: 'Booking status' })
    const steps = within(list).getAllByRole('listitem')
    await expect(steps).toHaveLength(3)
    await expect(steps[1]).toHaveAttribute('aria-current', 'step')
    await expect(steps[1]).toHaveTextContent('Waiting for confirmation — nowThe business answers by 15:10')
  },
}

/** How bookings end: confirmed, completed, cancelled, no-show. */
export const Ends: Story = {
  args: {
    items: [
      { tone: 'accent', title: 'Confirmed', caption: '12 Oct · 20:31' },
      { tone: 'success', title: 'Completed', caption: '2 Oct · 10:30' },
      { tone: 'slate', title: 'You cancelled', caption: '14 Oct · 11:22' },
      { tone: 'danger', title: 'No-show', caption: '28 Aug · 11:40' },
    ],
  },
}

/** What happens next on a sent page: numbered, the first done; no SMS promised. */
export const Numbered: Story = {
  args: {
    'aria-label': 'What happens next',
    variant: 'numbered',
    items: [
      { done: true, title: 'Sent', caption: 'Today · 14:40', state: '— done' },
      { title: 'The business confirms', caption: 'The business answers by 15:10. You’ll see it in My bookings.' },
      { title: 'Your visit', caption: 'Thursday, 15 October · 14:30' },
    ],
  },
  render: (args) => (
    <div className="w-96">
      <Timeline {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // the first step not done is the one happening now
    const steps = within(canvasElement).getAllByRole('listitem')
    await expect(steps[1]).toHaveAttribute('aria-current', 'step')
    await expect(steps[0]).not.toHaveAttribute('aria-current')
  },
}

/** Russian-length words. */
export const Russian: Story = {
  args: {
    items: [
      { tone: 'accent', title: 'Отправлено', caption: '14 окт · 14:40' },
      { tone: 'current', title: 'Ожидает подтверждения', caption: 'Заведение ответит до 15:10' },
      { tone: 'todo', title: 'Посещение', caption: '15 окт · 14:30' },
    ],
  },
  render: (args) => (
    <div className="w-72">
      <Timeline {...args} />
    </div>
  ),
}
