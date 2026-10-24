/** Filter chips — DS-Components → Selection: tint when on; Search's category row and filters. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Chip, ChipRadioGroup } from './chip'

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

function PriceTypes() {
  const [type, setType] = useState('fixed')
  return (
    <ChipRadioGroup
      aria-label="Price"
      value={type}
      onValueChange={setType}
      options={[
        { value: 'fixed', label: 'Fixed' },
        { value: 'from', label: 'From' },
        { value: 'free', label: 'Free' },
        { value: 'hidden', label: 'Price at the place' },
      ]}
    />
  )
}

/** One choice as chips (B-Services «Price»): a radio group, the chosen one in the tint, arrow keys between them. */
export const RadioChips: Story = {
  render: () => <PriceTypes />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radio', { name: 'Fixed' })).toBeChecked()
    await userEvent.click(canvas.getByRole('radio', { name: 'Free' }))
    await expect(canvas.getByRole('radio', { name: 'Free' })).toBeChecked()
    await expect(canvas.getByRole('radio', { name: 'Free' })).not.toHaveAttribute('aria-pressed')
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByRole('radio', { name: 'Price at the place' })).toHaveFocus()
  },
}
