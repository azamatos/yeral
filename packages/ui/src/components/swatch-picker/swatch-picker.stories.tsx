/**
 * SwatchPicker — DS-Patterns → «Selection» (B-Settings: the internal status's colour). Stories are the component's
 * tests: one per variant and state.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ComponentProps } from 'react'
import { expect, userEvent } from 'storybook/test'
import { SwatchPicker } from './swatch-picker'

const colours = [
  { value: '#4429d6', label: 'Violet', color: '#4429d6' },
  { value: '#066a41', label: 'Green', color: '#066a41' },
  { value: '#93500a', label: 'Brown', color: '#93500a' },
  { value: '#a3251b', label: 'Red', color: '#a3251b' },
  { value: '#41505f', label: 'Grey', color: '#41505f' },
  { value: '#101014', label: 'Black', color: '#101014' },
]

function Controlled(props: ComponentProps<typeof SwatchPicker>) {
  const [value, setValue] = useState(props.value)
  return <SwatchPicker {...props} value={value} onValueChange={setValue} />
}

const meta = {
  title: 'Selection/SwatchPicker',
  component: SwatchPicker,
  args: { options: colours, value: '#4429d6', 'aria-label': 'Colour' },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof SwatchPicker>
export default meta
type Story = StoryObj<typeof meta>

/** Six colours, Violet chosen (ink ring, white check); a click chooses another, the arrow keys move between them. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Violet' })).toBeChecked()
    await userEvent.click(canvas.getByRole('radio', { name: 'Brown' }))
    await expect(canvas.getByRole('radio', { name: 'Brown' })).toBeChecked()
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByRole('radio', { name: 'Red' })).toHaveFocus()
  },
}

/** Disabled while a save is on its way. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Green' })).toBeDisabled()
  },
}
