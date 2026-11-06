/** Segmented control — calendar range and staff view; Search day toggle (small). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Segmented, SegmentedItem } from './segmented'

function Demo({ size }: { size?: 's' | 'm' | 'l' }) {
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
/** S 32 (radius 8), M 40 (10, the toolbar default), L 48 (12); the items keep 3 px of frame. */
export const Small: Story = { args: { size: 's' } }
export const Large: Story = { args: { size: 'l' } }
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Demo size="s" />
      <Demo size="m" />
      <Demo size="l" />
    </div>
  ),
  play: async ({ canvas }) => {
    const groups = canvas.getAllByRole('group', { name: 'Gün' })
    await expect(groups[0]!.getBoundingClientRect().height).toBe(32)
    await expect(groups[1]!.getBoundingClientRect().height).toBe(40)
    await expect(groups[2]!.getBoundingClientRect().height).toBe(48)
  },
}
