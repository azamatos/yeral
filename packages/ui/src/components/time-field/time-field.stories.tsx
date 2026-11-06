/**
 * TimeField — DS-Controls → 04 Time field · A2 (Rest, ClockIcon, Typed, ListOpen, Error, Disabled, Phone): HH:MM typed or
 * picked from the 15-minute list. Stories are the component's tests; `time.test.ts` covers the parsing.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'
import { Field } from '../field'
import { TimeField, type TimeFieldProps } from './time-field'

function Controlled({ value: initial, onValueChange, ...props }: TimeFieldProps) {
  const [value, setValue] = useState(initial)
  return (
    <TimeField
      {...props}
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onValueChange(next)
      }}
    />
  )
}

const meta = {
  title: 'Inputs/TimeField',
  component: TimeField,
  args: { value: 540, onValueChange: fn(), invalidMessage: 'Use HH:MM, for example 09:30', title: 'Opens', closeLabel: 'Close' },
  render: (args) => (
    <Field label="Opens" className="w-24">
      <Controlled {...args} />
    </Field>
  ),
} satisfies Meta<typeof TimeField>
export default meta
type Story = StoryObj<typeof meta>

/** M 40 · 96 wide · 14/20, no seconds; the field's label names it. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole('combobox', { name: 'Opens' })
    await expect(field).toHaveDisplayValue('09:00')
    await expect(field.offsetHeight).toBe(40)
    await expect(field.offsetWidth).toBe(96)
    await expect(field).toHaveAttribute('aria-expanded', 'false')
  },
}

/** Typed, then tidied on blur or Enter: «9» → 09:00, «930» → 09:30, «1745» → 17:45. */
export const Typed: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('combobox', { name: 'Opens' })
    await userEvent.tripleClick(field)
    await userEvent.keyboard('930{Enter}')
    await expect(field).toHaveDisplayValue('09:30')
    await expect(args.onValueChange).toHaveBeenLastCalledWith(570)
    await userEvent.tripleClick(field)
    await userEvent.keyboard('1745')
    await userEvent.click(document.body)
    await expect(field).toHaveDisplayValue('17:45')
    await expect(args.onValueChange).toHaveBeenLastCalledWith(1065)
    await userEvent.tripleClick(field)
    await userEvent.keyboard('9{Enter}')
    await expect(field).toHaveDisplayValue('09:00')
    await expect(args.onValueChange).toHaveBeenLastCalledWith(540)
  },
}

/** A click opens the list (15-minute steps, 00:00–23:45) scrolled to 09:00; typing «930» moves the highlight, ↓ moves on, Enter picks. */
export const ListOpen: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('combobox', { name: 'Opens' })
    await userEvent.click(field)
    const list = await screen.findByRole('listbox')
    await waitFor(() => expect(list).toBeVisible())
    await expect(field).toHaveFocus()
    await expect(within(list).getAllByRole('option')).toHaveLength(96)
    const nine = within(list).getByRole('option', { name: '09:00' })
    await expect(nine).toHaveAttribute('aria-selected', 'true')
    await waitFor(async () => {
      const box = list.getBoundingClientRect()
      const at = nine.getBoundingClientRect()
      await expect(at.top).toBeGreaterThan(box.top + box.height * 0.3)
      await expect(at.bottom).toBeLessThan(box.bottom - box.height * 0.3)
    })
    await expect(field).toHaveAttribute('aria-controls', list.id)
    await userEvent.tripleClick(field)
    await userEvent.keyboard('930')
    await waitFor(() => expect(within(list).getByRole('option', { name: '09:30' })).toHaveAttribute('data-selected', 'true'))
    await userEvent.keyboard('{ArrowDown}')
    await expect(within(list).getByRole('option', { name: '09:45' })).toHaveAttribute('data-selected', 'true')
    await waitFor(() => expect(field).toHaveAttribute('aria-activedescendant', within(list).getByRole('option', { name: '09:45' }).id))
    await userEvent.keyboard('{Enter}')
    await expect(args.onValueChange).toHaveBeenLastCalledWith(585)
    await expect(field).toHaveDisplayValue('09:45')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    await expect(field).toHaveFocus()
  },
}

/** A click on a row picks it and keeps the focus in the field. */
export const Picked: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('combobox', { name: 'Opens' })
    await userEvent.click(field)
    const list = await screen.findByRole('listbox')
    await waitFor(() => expect(list).toBeVisible())
    await userEvent.click(within(list).getByRole('option', { name: '10:15' }))
    await expect(args.onValueChange).toHaveBeenLastCalledWith(615)
    await expect(field).toHaveDisplayValue('10:15')
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument())
    await expect(field).toHaveFocus()
  },
}

/** «9:75» isn't a time: the text stays, the field turns red and the message shows until it's fixed. */
export const Error: Story = {
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('combobox', { name: 'Opens' })
    await userEvent.tripleClick(field)
    await userEvent.keyboard('9:75')
    await userEvent.click(document.body)
    await expect(field).toHaveDisplayValue('9:75')
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(canvas.getByRole('alert')).toHaveTextContent('Use HH:MM, for example 09:30')
    await expect(field).toHaveAccessibleDescription('Use HH:MM, for example 09:30')
    await expect(args.onValueChange).not.toHaveBeenCalled()
    await userEvent.tripleClick(field)
    await userEvent.keyboard('9:45{Enter}')
    await expect(field).toHaveDisplayValue('09:45')
    await expect(field).not.toHaveAttribute('aria-invalid')
    await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
  },
}

/** An error from outside (the range's «Ends before it starts»): the field's own state, the message is the caller's. */
export const Invalid: Story = {
  args: { invalid: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Opens' })).toHaveAttribute('aria-invalid', 'true')
  },
}

/** A clock before the time (18, n-600): 104 wide. */
export const ClockIcon: Story = {
  args: { clock: true },
  render: (args) => (
    <Field label="Opens" className="w-26">
      <Controlled {...args} />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Opens' }).offsetWidth).toBe(104)
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Opens' })).toBeDisabled()
  },
}

/** A closing time runs to 24:00 and never before the opening: `min` and `max` bound the list and the typing. */
export const MinMax: Story = {
  args: { value: 1200, min: 570, max: 1440, title: 'Closes' },
  render: (args) => (
    <Field label="Closes" className="w-24">
      <Controlled {...args} />
    </Field>
  ),
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('combobox', { name: 'Closes' })
    await userEvent.tripleClick(field)
    await userEvent.keyboard('2400{Enter}')
    await expect(field).toHaveDisplayValue('24:00')
    await expect(args.onValueChange).toHaveBeenLastCalledWith(1440)
    await userEvent.tripleClick(field)
    await userEvent.keyboard('9{Enter}')
    await expect(field).toHaveAttribute('aria-invalid', 'true')
    await expect(field).toHaveDisplayValue('9')
  },
}

/** Sizes S 32 / M 40 / L 48 (L 16 px text, so a phone doesn't zoom). */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-4">
      <Controlled {...args} size="s" aria-label="Opens S" />
      <Controlled {...args} size="m" aria-label="Opens M" />
      <Controlled {...args} size="l" aria-label="Opens L" className="w-26" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Opens S' }).offsetHeight).toBe(32)
    await expect(canvas.getByRole('combobox', { name: 'Opens M' }).offsetHeight).toBe(40)
    const l = canvas.getByRole('combobox', { name: 'Opens L' })
    await expect(l.offsetHeight).toBe(48)
    await expect(getComputedStyle(l).fontSize).toBe('16px')
  },
}

/** 390: a tap opens the times as a bottom sheet scrolled to the value, rows of 48; a tap picks. */
export const Phone: Story = {
  args: { size: 'l' },
  globals: { viewport: { value: 'xs' } },
  render: (args) => (
    <Field label="Opens" className="w-26">
      <Controlled {...args} />
    </Field>
  ),
  play: async ({ canvas, args }) => {
    const field = canvas.getByRole('combobox', { name: 'Opens' })
    await userEvent.click(field)
    const sheet = await screen.findByRole('dialog', { name: 'Opens' })
    await waitFor(() => expect(sheet).toBeVisible())
    const row = within(sheet).getByRole('option', { name: '09:00' })
    await waitFor(() => expect(row.offsetHeight).toBe(48))
    await expect(row).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(within(sheet).getByRole('option', { name: '09:15' }))
    await expect(args.onValueChange).toHaveBeenLastCalledWith(555)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(field).toHaveDisplayValue('09:15')
  },
}
