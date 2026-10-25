/**
 * Pickers/TimeSlots: start times grouped by part of day; a taken time is struck through. One picked, or up to N with a
 * live counter (offering times when declining a request); size s (36) in drawers; a note under a taken time.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, within } from 'storybook/test'
import { TimeSlots, type SlotGroup } from './time-slots'

const groups: SlotGroup[] = [
  { label: 'Morning', slots: ['10:00', '10:30', '11:30'].map((t) => ({ value: t, label: t })) },
  {
    label: 'Afternoon',
    slots: ['13:00', '14:00', '14:30', '15:00', '16:15'].map((t) => ({
      value: t,
      label: t,
      disabled: t === '14:00',
      ariaLabel: t === '14:00' ? '14:00, already taken' : undefined,
    })),
  },
  { label: 'Evening', slots: ['18:00', '18:30'].map((t) => ({ value: t, label: t })) },
]

function One({ size }: { size?: 'm' | 's' }) {
  const [value, setValue] = useState<string>()
  return <TimeSlots groups={groups} size={size} value={value} onValueChange={setValue} />
}

function Several() {
  const [values, setValues] = useState<string[]>(['16:00', '16:45'])
  const offered: SlotGroup[] = [
    {
      label: 'Offer other times',
      slots: ['16:00', '16:45', '17:30', '18:15', '19:00'].map((t) => ({
        value: t,
        label: t,
        disabled: t === '18:15',
        ariaLabel: t === '18:15' ? '18:15, already taken' : undefined,
      })),
    },
  ]
  return (
    <TimeSlots
      groups={offered}
      size="s"
      selectionMode="multiple"
      max={3}
      values={values}
      onValuesChange={setValues}
      counter={(n, max) => `${n} / ${max} times selected`}
    />
  )
}

const meta = { title: 'Pickers/TimeSlots', component: One } satisfies Meta<typeof One>
export default meta
type Story = StoryObj<typeof meta>

/** One time, picked by a tap; the taken one is struck through and says why. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: '14:30' }))
    await expect(canvas.getByRole('button', { name: '14:30' })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: '14:00, already taken' })).toBeDisabled()
  },
}

/** S 36 in drawers. */
export const SizeS: Story = { args: { size: 's' } }

/**
 * Up to 3 (offering times): each chip a toggle, a live counter; at 3 the others pick nothing but stay in reach; one
 * unpicked frees a place.
 */
export const MultiSelect: Story = {
  render: () => <Several />,
  play: async ({ canvas }) => {
    const status = canvas.getByRole('status')
    await expect(status).toHaveTextContent('2 / 3 times selected')
    await userEvent.click(canvas.getByRole('button', { name: '17:30' }))
    await expect(status).toHaveTextContent('3 / 3 times selected')
    // full: an unpicked chip says it can't be picked now, and picks nothing
    const more = canvas.getByRole('button', { name: '19:00' })
    await expect(more).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(more)
    await expect(more).toHaveAttribute('aria-pressed', 'false')
    await expect(status).toHaveTextContent('3 / 3 times selected')
    // one unpicked frees a place
    await userEvent.click(canvas.getByRole('button', { name: '16:00' }))
    await expect(status).toHaveTextContent('2 / 3 times selected')
    await expect(more).not.toHaveAttribute('aria-disabled')
  },
}

/** A taken time with its note under it (an offered time someone else booked). */
export const Taken: Story = {
  render: () => (
    <TimeSlots
      groups={[
        {
          label: 'Offered times',
          slots: [
            { value: 'thu', label: 'Thu, 15 Oct · 16:00' },
            {
              value: 'fri',
              label: 'Fri, 16 Oct · 11:00',
              disabled: true,
              ariaLabel: 'Fri, 16 Oct · 11:00, already taken',
              note: 'Already taken',
            },
          ],
        },
      ]}
      onValueChange={() => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('button', { name: 'Fri, 16 Oct · 11:00, already taken' })).toBeDisabled()
    await expect(canvas.getByText('Already taken')).toBeVisible()
  },
}

/** Russian-length words. */
export const Russian: Story = {
  render: () => (
    <TimeSlots
      groups={[
        { label: 'Утро', slots: ['10:00', '10:30'].map((t) => ({ value: t, label: t })) },
        {
          label: 'Предложенное время',
          slots: [{ value: 'fri', label: 'Пт, 16 окт · 11:00', disabled: true, note: 'Уже занято' }],
        },
      ]}
      onValueChange={() => {}}
    />
  ),
}
