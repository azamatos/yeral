/** Segmented control — calendar range and staff view; Search day toggle (small). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Segmented, SegmentedItem } from './segmented'

function Demo({ size }: { size?: 's' | 'm' }) {
  const [v, setV] = useState('today')
  return (
    <Segmented size={size} value={v} onValueChange={setV} aria-label="Gün">
      <SegmentedItem value="today">Şu gün</SegmentedItem>
      <SegmentedItem value="tomorrow">Ertir</SegmentedItem>
      <SegmentedItem value="week">Şu hepde</SegmentedItem>
    </Segmented>
  )
}

const meta = { title: 'Selection/Segmented', component: Demo } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('radio', { name: 'Ertir' }))
    await expect(canvas.getByRole('radio', { name: 'Ertir' })).toHaveAttribute('aria-checked', 'true')
  },
}
export const Small: Story = { args: { size: 's' } }
