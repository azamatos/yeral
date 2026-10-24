/**
 * NumberStepper — DS-Patterns → «Number stepper · − n +» (B-Settings: «Turn off online booking after no-shows»; later
 * B-Tables, Booking-Class). Stories are the component's tests: one per variant and state.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState, type ComponentProps } from 'react'
import { expect, userEvent } from 'storybook/test'
import { NumberStepper } from './number-stepper'

type Props = ComponentProps<typeof NumberStepper>

/** The stepper with its own value, as a form holds it. */
function Controlled(props: Props) {
  const [value, setValue] = useState(props.value)
  return <NumberStepper {...props} value={value} onValueChange={setValue} />
}

const meta = {
  title: 'Inputs/NumberStepper',
  component: NumberStepper,
  args: { value: 4, min: 1, max: 8, onValueChange: () => {}, 'aria-label': 'Seats', decreaseLabel: 'Fewer', increaseLabel: 'More' },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof NumberStepper>
export default meta
type Story = StoryObj<typeof meta>

/** − 4 +: each button steps the value by one, and the value is read out as it changes. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Seats' })
    await userEvent.click(canvas.getByRole('button', { name: 'More' }))
    await expect(group).toHaveTextContent('5')
    await userEvent.click(canvas.getByRole('button', { name: 'Fewer' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Fewer' }))
    await expect(group).toHaveTextContent('3')
    await expect(canvas.getByText('3')).toHaveAttribute('aria-live', 'polite')
  },
}

/** At `min` the − button is off (its icon n-400) and does nothing; + still steps. */
export const AtMin: Story = {
  args: { value: 1 },
  play: async ({ canvas }) => {
    const fewer = canvas.getByRole('button', { name: 'Fewer' })
    await expect(fewer).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(fewer)
    await expect(canvas.getByRole('group')).toHaveTextContent('1')
    await expect(canvas.getByRole('button', { name: 'More' })).not.toHaveAttribute('aria-disabled')
  },
}

/** A step that would leave the range does nothing: by 2 from 1 with `min` 0, − is off and stays at 1. */
export const OffTheStep: Story = {
  args: { value: 1, min: 0, max: 10, step: 2 },
  play: async ({ canvas }) => {
    const fewer = canvas.getByRole('button', { name: 'Fewer' })
    await expect(fewer).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(fewer)
    await userEvent.keyboard('{ArrowDown}')
    await expect(canvas.getByRole('group')).toHaveTextContent('1')
    await userEvent.keyboard('{ArrowUp}')
    await expect(canvas.getByRole('group')).toHaveTextContent('3')
  },
}

/** At `max` the + button is off. */
export const AtMax: Story = {
  args: { value: 8 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'More' })).toHaveAttribute('aria-disabled', 'true')
  },
}

/** A value with a unit in the 84 column; 0 reads «Off» (B-Settings, no-shows 0–5). */
export const WithUnit: Story = {
  args: {
    value: 2,
    min: 0,
    max: 5,
    wide: true,
    'aria-label': 'Turn off online booking after no-shows',
    format: (n) => (n === 0 ? 'Off' : n === 1 ? '1 time' : `${n} times`),
  },
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group')
    await expect(group).toHaveTextContent('2 times')
    await userEvent.click(canvas.getByRole('button', { name: 'Fewer' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Fewer' }))
    await expect(group).toHaveTextContent('Off')
    // the button keeps the focus as it reaches the end
    await expect(canvas.getByRole('button', { name: 'Fewer' })).toHaveAttribute('aria-disabled', 'true')
    await expect(canvas.getByRole('button', { name: 'Fewer' })).toHaveFocus()
  },
}

/** ↑ and ↓ step the value from a focused button, and stop at the ends. */
export const Keyboard: Story = {
  args: { value: 7 },
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Seats' })
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Fewer' })).toHaveFocus()
    await userEvent.keyboard('{ArrowUp}')
    await expect(group).toHaveTextContent('8')
    await userEvent.keyboard('{ArrowUp}')
    await expect(group).toHaveTextContent('8')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    await expect(group).toHaveTextContent('6')
  },
}

/** Disabled while a save is on its way: both buttons off, the keys do nothing. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Fewer' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'More' })).toBeDisabled()
  },
}

/** Russian-length text: the value column grows past 84 instead of cutting the unit. */
export const LongText: Story = {
  args: {
    value: 3,
    min: 0,
    max: 5,
    wide: true,
    'aria-label': 'Отключать онлайн-запись после неявок',
    decreaseLabel: 'Меньше',
    increaseLabel: 'Больше',
    format: (n) => `${n} неявки подряд`,
  },
}
