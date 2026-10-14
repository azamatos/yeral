/** Booking steps — focused header of the booking flow. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Stepper } from './stepper'

const meta = {
  title: 'Navigation/Stepper',
  component: Stepper,
  args: { steps: ['Hyzmatlar', 'Hünärmen', 'Wagt', 'Tassyklama'], current: 2, onStepClick: fn(), 'aria-label': 'Ýazylyş ädimleri' },
  decorators: [(Story) => <div className="flex h-18 items-stretch border-b border-n-200 px-6">{Story()}</div>],
} satisfies Meta<typeof Stepper>
export default meta
type Story = StoryObj<typeof meta>

export const TimeStep: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Hünärmen/ }))
    await expect(args.onStepClick).toHaveBeenCalledWith(1)
    await expect(canvas.getByRole('button', { name: /Tassyklama/ })).toBeDisabled()
  },
}
export const First: Story = { args: { current: 0 } }
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
