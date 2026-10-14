/** Filter chips — DS-Components → Selection: tint when on; Search's category row and filters. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Chip } from './chip'

const meta = { title: 'Selection/Chip', component: Chip, args: { children: 'Bahasy' } } satisfies Meta<typeof Chip>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Selected: Story = { args: { selected: true, children: 'Reýting 4,5+' } }
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip selected>
        <SlidersHorizontal />
        Süzgüçler · 2
      </Chip>
      <Chip>
        Hünärmen
        <ChevronDown />
      </Chip>
    </div>
  ),
}

function CategoryRow() {
  const [on, setOn] = useState('Ählisi')
  return (
    <div className="flex gap-2 overflow-x-auto">
      {['Ählisi', 'Gözellik', 'Dellekhana', 'Diş lukmany', 'Restoran', 'Sport'].map((c) => (
        <Chip key={c} selected={on === c} onClick={() => setOn(c)}>
          {c}
        </Chip>
      ))}
    </div>
  )
}

export const CategoryFilter: Story = {
  render: () => <CategoryRow />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Restoran' }))
    await expect(canvas.getByRole('button', { name: 'Restoran' })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: 'Ählisi' })).toHaveAttribute('aria-pressed', 'false')
  },
}
