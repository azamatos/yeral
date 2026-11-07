/** InfoTip — DS · Controls v0.7 · A9 (ⓘ + popover in place of hint lines). Stories are the component's tests. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor, within } from 'storybook/test'
import { Field } from '../field'
import { Select } from '../select'
import { InfoTip } from './info-tip'

const meta = {
  title: 'Components/InfoTip',
  component: InfoTip,
  args: { label: 'About the internal status', children: 'Only your team sees it. It doesn’t change the booking status.' },
} satisfies Meta<typeof InfoTip>
export default meta
type Story = StoryObj<typeof meta>

/** Rest: the ⓘ alone; a click opens the popover, Esc closes it. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'About the internal status' })
    await userEvent.click(button)
    await waitFor(() => expect(screen.getByText('Only your team sees it. It doesn’t change the booking status.')).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await expect(screen.queryByText('Only your team sees it. It doesn’t change the booking status.')).toBeNull()
  },
}

/** Next to a field's label through `Field`'s `info` prop: the ⓘ sits after the words, no grey line under the control. */
export const InField: Story = {
  render: (args) => (
    <Field label="Internal status" info={{ label: args.label, text: args.children }} className="w-60">
      <Select
        size="m"
        value="arrived"
        onValueChange={() => {}}
        options={[
          { value: 'none', label: 'None' },
          { value: 'arrived', label: 'Arrived' },
          { value: 'started', label: 'Started' },
        ]}
      />
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement)
    await expect(c.getByText('Internal status')).toBeVisible()
    await userEvent.click(c.getByRole('button', { name: 'About the internal status' }))
    await waitFor(() => expect(screen.getByText('Only your team sees it. It doesn’t change the booking status.')).toBeVisible())
  },
}
