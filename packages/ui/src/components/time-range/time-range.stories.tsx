/**
 * TimeRangeField — DS-Patterns → Inputs «TimeRangeField» (Default, NextDay, Error → WithError, WithRemove); used by
 * B-Settings hours and the special-day modal, B-Team shifts, B-Onboarding step 4. Stories are the component's tests.
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
    value: { open: 540, close: 1200 },
    onChange: fn(),
    fromLabel: 'Monday: opens',
    toLabel: 'Monday: closes',
    nextDay: (close: string) => `until ${close}, next day`,
  },
  // a new value from the controls starts the field again
  render: (args) => <Controlled key={JSON.stringify(args.value)} {...args} />,
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
    await expect(args.onChange).toHaveBeenLastCalledWith({ open: 540, close: 1320 })
    await expect(canvas.queryByText(/next day/)).not.toBeInTheDocument()
    // a later opening keeps the closing time; past it, the closing time is the next day's
    await userEvent.selectOptions(opens, '23:00')
    await expect(args.onChange).toHaveBeenLastCalledWith({ open: 1380, close: 2760 })
    await expect(canvas.getByText('until 22:00, next day')).toBeVisible()
  },
}

/** 18:00 – 02:00 (`close: 1560`): a closing time before the opening time is the next day's, and the picker says so. */
export const NextDay: Story = {
  args: { value: { open: 1080, close: 1560 } },
  play: async ({ canvas, args }) => {
    const closes = canvas.getByRole('combobox', { name: 'Monday: closes' })
    await expect(closes).toHaveDisplayValue('02:00')
    await expect(canvas.getByText('until 02:00, next day')).toBeVisible()
    await expect(closes).toHaveAccessibleDescription('until 02:00, next day')
    await userEvent.selectOptions(closes, '24:00')
    await expect(args.onChange).toHaveBeenLastCalledWith({ open: 1080, close: 1440 })
    await expect(canvas.queryByText(/next day/)).not.toBeInTheDocument()
  },
}

/** The part after midnight runs into the next day's opening: the screen's message, both pickers invalid. */
export const WithError: Story = {
  args: { value: { open: 1080, close: 2040 }, error: 'Closes after Tuesday opens. Pick an earlier time.' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Closes after Tuesday opens. Pick an earlier time.')
    await expect(canvas.getByRole('combobox', { name: 'Monday: opens' })).toHaveAttribute('aria-invalid', 'true')
    await expect(canvas.getByRole('combobox', { name: 'Monday: opens' })).toHaveAccessibleDescription(
      'Closes after Tuesday opens. Pick an earlier time.',
    )
    await expect(canvas.getByRole('combobox', { name: 'Monday: closes' })).toHaveAccessibleDescription(
      'until 10:00, next day Closes after Tuesday opens. Pick an earlier time.',
    )
  },
}

/** A break under the day's hours: its label names the row, the remove button takes it out. */
export const WithRemove: Story = {
  args: {
    value: { open: 780, close: 840 },
    label: 'Break',
    fromLabel: 'Monday: break starts',
    toLabel: 'Monday: break ends',
    nextDay: undefined,
    remove: { label: 'Monday: remove the break', onClick: fn() },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole('group', { name: 'Break' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Monday: remove the break' }))
    await expect(args.remove!.onClick).toHaveBeenCalled()
  },
}

/** A break in a night open 18:00–02:00: a time before the day's opening is the night's (01:00 is minute 1500). */
export const BreakAfterMidnight: Story = {
  args: {
    value: { open: 1320, close: 1380 },
    dayStart: 1080,
    label: 'Break',
    fromLabel: 'Friday: break starts',
    toLabel: 'Friday: break ends',
    nextDay: undefined,
  },
  play: async ({ canvas, args }) => {
    const starts = canvas.getByRole('combobox', { name: 'Friday: break starts' })
    await userEvent.selectOptions(starts, '01:00')
    await expect(args.onChange).toHaveBeenLastCalledWith({ open: 1500, close: 1380 })
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Friday: break ends' }), '01:30')
    await expect(args.onChange).toHaveBeenLastCalledWith({ open: 1500, close: 1530 })
    await expect(starts).toHaveDisplayValue('01:00')
  },
}

/** A time off the step (a shift saved at 09:15) shows as it is instead of the first option. */
export const OffTheStep: Story = {
  args: { value: { open: 555, close: 1200 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Monday: opens' })).toHaveDisplayValue('09:15')
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
