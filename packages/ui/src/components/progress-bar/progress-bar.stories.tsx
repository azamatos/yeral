/**
 * ProgressBar — DS-Patterns → Status «Progress» (goal with labels, flow top bar 3); used by B-Onboarding's setup top
 * bar on phones and tablets. Stories are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { ProgressBar } from './progress-bar'

const meta = {
  title: 'Status/ProgressBar',
  component: ProgressBar,
  args: { label: 'Photos added', value: 2, max: 3 },
  decorators: [(Story) => <div className="max-w-90">{Story()}</div>],
} satisfies Meta<typeof ProgressBar>
export default meta
type Story = StoryObj<typeof meta>

/** The goal meter under its label row (the screen draws the row). */
export const Goal: Story = {
  render: (args) => (
    <div className="flex flex-col gap-2 rounded-card border border-n-200 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body font-semibold">2 / 3 photos</span>
        <span className="text-dense text-n-600">1 more photo</span>
      </div>
      <ProgressBar {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar', { name: 'Photos added' })
    await expect(bar).toHaveAttribute('aria-valuenow', '2')
    await expect(bar).toHaveAttribute('aria-valuemax', '3')
  },
}

/** The setup flow's top bar: step 4 of 8, half filled, read out as «Step 4 of 8». */
export const Flow: Story = {
  args: { variant: 'flow', label: 'Setup steps', value: 4, max: 8, valueText: 'Step 4 of 8' },
  render: (args) => (
    <div className="overflow-hidden rounded-m border border-n-200">
      <div className="flex h-14 items-center gap-3 px-5 text-small font-semibold">
        <span>
          <span className="text-n-500">4 / 8</span> · Hours
        </span>
      </div>
      <ProgressBar {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar', { name: 'Setup steps' })
    await expect(bar).toHaveAttribute('aria-valuetext', 'Step 4 of 8')
    await expect((bar.firstElementChild as HTMLElement).style.width).toBe('50%')
  },
}

export const Empty: Story = { args: { value: 0 } }
export const Full: Story = { args: { value: 3 } }

/** Past the goal (4 photos of 3): a full bar, and the value read out is clamped to the max. */
export const PastTheGoal: Story = {
  args: { value: 4 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
  },
}

/** The checklist's 4 px meter under its heading: one of three done. */
export const Meter: Story = {
  args: { variant: 'meter', label: 'Make your page stronger', value: 1, max: 3, valueText: '1 / 3 done' },
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar', { name: 'Make your page stronger' })
    await expect(bar).toHaveClass('h-1')
    await expect(bar).toHaveAttribute('aria-valuetext', '1 / 3 done')
  },
}
