/**
 * Data/Meter (DS-Patterns → Status «Progress & meters»): a presentational share bar — heights 3 / 4 / 6 / 8, tones
 * accent / warning / neutral, the track by its surface, stacked segments for a capacity. `role="img"` named by the
 * caller's sentence. Stories are the component's tests: one per variant and state.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { Meter } from './meter'

const meta = {
  title: 'Data/Meter',
  component: Meter,
  args: { label: '78% of the goal', value: 78, max: 100, size: 4 },
  decorators: [(Story) => <div className="w-60">{Story()}</div>],
} satisfies Meta<typeof Meter>
export default meta
type Story = StoryObj<typeof meta>

/** The 4 px accent meter: an image named by the sentence, filled `value / max`. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const meter = within(canvasElement).getByRole('img', { name: '78% of the goal' })
    await expect(meter.firstElementChild).toHaveAttribute('style', 'width: 78%;')
  },
}

/** Heights 3 (square ends), 4, 6 (load) and 8 (share). */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3.5">
      <Meter {...args} size={3} label="3 px, 50%" value={50} />
      <Meter {...args} size={4} label="4 px, 78%" value={78} />
      <Meter {...args} size={6} label="6 px, 72%" value={72} />
      <Meter {...args} size={8} label="8 px, 43%" value={43} />
    </div>
  ),
}

/** Accent, warning (a low value) and neutral (a past period). */
export const Tones: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3.5">
      <Meter {...args} label="Accent, 78%" value={78} />
      <Meter {...args} label="Warning, 86%" value={86} tone="warning" />
      <Meter {...args} label="Neutral, 64%" value={64} tone="neutral" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByRole('img', { name: 'Warning, 86%' }).firstElementChild).toHaveClass('bg-st-pending-dot')
    await expect(c.getByRole('img', { name: 'Neutral, 64%' }).firstElementChild).toHaveClass('bg-n-500')
  },
}

/** On the accent tint the track is white. */
export const OnTint: Story = {
  render: (args) => (
    <span className="block rounded-input bg-a-50 p-2">
      <Meter {...args} surface="tint" />
    </span>
  ),
}

/** In a week cell (B-Calendar `.lbar`): the 6 px load bar, then the count and the percent the cell draws. */
export const InCell: Story = {
  render: () => (
    <div className="flex w-45 flex-col gap-2 rounded-m border border-n-200 p-3.5">
      <Meter label="6 bookings, 72% of the day" value={72} max={100} />
      <span className="flex items-baseline justify-between text-small font-semibold tabular-nums">
        <span>6</span>
        <span className="text-micro font-medium text-n-500">72%</span>
      </span>
    </div>
  ),
}

/** Stacked on an n-50 panel (a class's seats, later): confirmed · pending · no-show over an n-200 track. */
export const Stacked: Story = {
  render: () => (
    <div className="flex flex-col gap-2.5 rounded-m bg-n-50 px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2">
        <span className="inline-flex items-baseline gap-2">
          <span className="text-h3 font-bold tabular-nums">11 / 14</span>
          <span className="text-dense text-n-600">seats</span>
        </span>
        <span className="text-small font-semibold text-a-600">3 seats left</span>
      </div>
      <Meter
        label="14 seats: 9 confirmed, 1 request, 1 no-show"
        max={14}
        size={8}
        surface="grey"
        segments={[
          { value: 9, tone: 'accent' },
          { value: 1, tone: 'warning' },
          { value: 1, tone: 'danger' },
        ]}
      />
      <span className="text-dense text-n-600">9 confirmed · 1 request · 1 no-show</span>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const meter = within(canvasElement).getByRole('img', { name: '14 seats: 9 confirmed, 1 request, 1 no-show' })
    await expect(meter.children).toHaveLength(3)
    await expect(meter.children[2]).toHaveClass('bg-error')
  },
}

/** Full: one segment at `max`. */
export const Full: Story = {
  render: () => (
    <div className="flex flex-col gap-2.5 rounded-m bg-n-50 px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-h3 font-bold tabular-nums">14 / 14</span>
        <span className="text-small font-semibold text-st-cancelled-ink">Full</span>
      </div>
      <Meter label="14 of 14 seats, full" max={14} size={8} surface="grey" segments={[{ value: 14, tone: 'accent' }]} />
    </div>
  ),
}

/** Out of range: a value past `max` fills the track, under 0 nothing; a `max` of 0 draws empty. */
export const Clamped: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3.5">
      <Meter {...args} label="Over, 120 of 100" value={120} />
      <Meter {...args} label="Under, -5 of 100" value={-5} />
      <Meter {...args} label="Nothing to count" value={3} max={0} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByRole('img', { name: 'Over, 120 of 100' }).firstElementChild).toHaveAttribute('style', 'width: 100%;')
    await expect(c.getByRole('img', { name: 'Under, -5 of 100' }).firstElementChild).toHaveAttribute('style', 'width: 0%;')
    await expect(c.getByRole('img', { name: 'Nothing to count' }).firstElementChild).toHaveAttribute('style', 'width: 0%;')
  },
}
