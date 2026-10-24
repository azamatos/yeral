/**
 * IconPicker — DS-Patterns → «Selection» (B-Settings: the internal status's icon). Stories are the component's tests:
 * one per variant and state.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, Flag, Hourglass, MessageSquare, Play, Sparkles, Star, UserCheck } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { expect, userEvent } from 'storybook/test'
import { IconPicker } from './icon-picker'

const icons = [
  { value: 'user-check', label: 'Person with a tick', icon: <UserCheck aria-hidden /> },
  { value: 'play', label: 'Play', icon: <Play aria-hidden /> },
  { value: 'hourglass', label: 'Hourglass', icon: <Hourglass aria-hidden /> },
  { value: 'flag', label: 'Flag', icon: <Flag aria-hidden /> },
  { value: 'star', label: 'Star', icon: <Star aria-hidden /> },
  { value: 'bell', label: 'Bell', icon: <Bell aria-hidden /> },
  { value: 'message', label: 'Message', icon: <MessageSquare aria-hidden /> },
  { value: 'sparkles', label: 'Sparkles', icon: <Sparkles aria-hidden /> },
]

function Controlled(props: ComponentProps<typeof IconPicker>) {
  const [value, setValue] = useState(props.value)
  return <IconPicker {...props} value={value} onValueChange={setValue} />
}

const meta = {
  title: 'Selection/IconPicker',
  component: IconPicker,
  args: { options: icons, value: 'flag', 'aria-label': 'Icon' },
  render: (args) => <Controlled {...args} />,
  decorators: [(Story) => <div className="max-w-86">{Story()}</div>],
} satisfies Meta<typeof IconPicker>
export default meta
type Story = StoryObj<typeof meta>

/** Eight tiles in a row, Flag chosen (tint, a-600 icon); a click chooses another, the arrow keys move between them. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Flag' })).toBeChecked()
    await userEvent.click(canvas.getByRole('radio', { name: 'Hourglass' }))
    await expect(canvas.getByRole('radio', { name: 'Hourglass' })).toBeChecked()
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByRole('radio', { name: 'Flag' })).toHaveFocus()
  },
}

/** Disabled while a save is on its way. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Star' })).toBeDisabled()
  },
}
