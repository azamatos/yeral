/** Time slots — grouped Irden / Günortan / Agşam; a taken slot is struck through. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { TimeSlots, type SlotGroup } from './time-slots'

const groups: SlotGroup[] = [
  { label: 'Irden', slots: ['10:00', '10:30', '11:30'].map((t) => ({ value: t, label: t })) },
  { label: 'Günortan', slots: ['13:00', '14:00', '14:30', '15:00', '16:15'].map((t) => ({ value: t, label: t, disabled: t === '14:00' })) },
  { label: 'Agşam', slots: ['18:00', '18:30'].map((t) => ({ value: t, label: t })) },
]

function Demo() {
  const [value, setValue] = useState<string>()
  return <TimeSlots groups={groups} value={value} onValueChange={setValue} />
}

const meta = { title: 'Pickers/TimeSlots', component: Demo } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: '14:30' }))
    await expect(canvas.getByRole('button', { name: '14:30' })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: '14:00' })).toBeDisabled()
  },
}
