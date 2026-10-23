/**
 * TimeRangeField — DS-Patterns → Inputs «TimeRangeField» (Default, NextDay, Error → WithError, WithRemove); used by B-Settings
 * hours and the special-day modal, B-Team shifts, B-Onboarding step 4. Stories are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import { TimeRangeField, type TimeRange, type TimeRangeFieldProps } from './time-range'

function Controlled(props: TimeRangeFieldProps) {
  const [value, setValue] = useState<TimeRange>(props.value)
  return (
    <TimeRangeField
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next)
        props.onChange(next)
      }}
    />
  )
}

const meta = {
  title: 'Inputs/TimeRangeField',
  component: TimeRangeField,
  args: {
    value: { from: 540, to: 1200 },
    onChange: fn(),
    fromLabel: 'Monday: opens',
    toLabel: 'Monday: closes',
    nextDay: (close: string) => `until ${close}, next day`,
  },
  render: (args) => <Controlled {...args} />,
} satisfies Meta<typeof TimeRangeField>
export default meta
type Story = StoryObj<typeof meta>

/** 09:00 – 20:00: opening runs 00:00–23:30, closing 00:30–24:00, every 30 minutes. */
export const Default: Story = {
  play: async ({ canvas, args }) => {
    const opens = canvas.getByRole('combobox', { name: 'Monday: opens' })
    const closes = canvas.getByRole('combobox', { name: 'Monday: closes' })
    await expect(opens).toHaveDisplayValue('09:00')
    await expect(closes).toHaveDisplayValue('20:00')
    await expect(opens.querySelectorAll('option')).toHaveLength(48)
    await expect(opens.querySelector('option')).toHaveTextContent('00:00')
    await expect(closes.querySelector('option:last-child')).toHaveTextContent('24:00')
    await userEvent.selectOptions(closes, '22:00')
    await expect(args.onChange).toHaveBeenLastCalledWith({ from: 540, to: 1320 })
    await expect(canvas.queryByText(/next day/)).not.toBeInTheDocument()
  },
}

/** 18:00 – 02:00: a closing time before the opening time is the next day's. */
export const NextDay: Story = {
  args: { value: { from: 1080, to: 120 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('until 02:00, next day')).toBeVisible()
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Monday: closes' }), '24:00')
    await expect(canvas.queryByText(/next day/)).not.toBeInTheDocument()
  },
}

/** The part after midnight runs into the next day's opening: the screen's message, both pickers invalid. */
export const WithError: Story = {
  args: { value: { from: 1080, to: 600 }, error: 'Closes after Tuesday opens. Pick an earlier time.' },
  play: async ({ canvas }) => {
    const message = canvas.getByRole('alert')
    await expect(message).toHaveTextContent('Closes after Tuesday opens. Pick an earlier time.')
    for (const name of ['Monday: opens', 'Monday: closes']) {
      const picker = canvas.getByRole('combobox', { name })
      await expect(picker).toHaveAttribute('aria-invalid', 'true')
      await expect(picker).toHaveAccessibleDescription('Closes after Tuesday opens. Pick an earlier time.')
    }
  },
}

/** A break under the day's hours: its label names the row, the remove button takes it out. */
export const WithRemove: Story = {
  args: {
    value: { from: 780, to: 840 },
    label: 'Break',
    fromLabel: 'Monday: break starts',
    toLabel: 'Monday: break ends',
    remove: { label: 'Monday: remove the break', onClick: fn() },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('group', { name: 'Break' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Monday: remove the break' }))
    await expect(args.remove!.onClick).toHaveBeenCalled()
  },
}

/** Following another day (the wizard's «Same as Monday»): both pickers read only. */
export const Disabled: Story = {
  args: { disabled: true, fromLabel: 'Tuesday: opens', toLabel: 'Tuesday: closes' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Tuesday: opens' })).toBeDisabled()
    await expect(canvas.getByRole('combobox', { name: 'Tuesday: closes' })).toBeDisabled()
  },
}
