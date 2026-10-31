/**
 * SectionHeader — DS-Patterns → 03 Data display «Section header row», from B-Client (`.shrow .sh`: Notes with «Add
 * note», Upcoming, History, Reports with a caption). Stories are the component's tests: title alone, with a count,
 * with an action, with a caption, an h3, a phone width and a Russian length.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from 'lucide-react'
import { expect, fn, userEvent } from 'storybook/test'
import { Button } from '../button'
import { SectionHeader } from './section-header'

const onAdd = fn()

const meta = {
  title: 'Display/SectionHeader',
  component: SectionHeader,
  parameters: { layout: 'padded' },
  args: { title: 'Notes' },
} satisfies Meta<typeof SectionHeader>
export default meta
type Story = StoryObj<typeof meta>

/** The title alone: an h2, 17/24 600. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'Notes' })).toBeInTheDocument()
  },
}

/** The count beside the title. */
export const WithCount: Story = { args: { title: 'History', count: '12 visits' } }

/** Count and an S secondary action at the end of the row («Add note»). */
export const WithAction: Story = {
  args: {
    count: '2',
    action: (
      <Button size="s" onClick={onAdd}>
        <Plus aria-hidden />
        Add note
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add note' }))
    await expect(onAdd).toHaveBeenCalledOnce()
  },
}

/** A caption instead of a button at the end (B-Client «Reports»). */
export const WithCaption: Story = {
  args: { title: 'Reports', count: '1', action: <span className="text-dense text-n-600">Only the team sees them</span> },
}

/** An h3 under a page's own section title, named for `aria-labelledby`. */
export const AsH3: Story = {
  args: { as: 'h3', titleId: 'upcoming', title: 'Upcoming', count: '3' },
  render: (args) => (
    <section aria-labelledby="upcoming">
      <SectionHeader {...args} />
    </section>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('region', { name: 'Upcoming' })).toBeInTheDocument()
    await expect(canvas.getByRole('heading', { level: 3 })).toHaveAttribute('id', 'upcoming')
  },
}

/** Phone: the action keeps the end of the row; a long title wraps. */
export const Phone: Story = { ...WithAction, globals: { viewport: { value: 'xs' } } }

/** Russian runs ~30% longer: the row wraps, nothing has a fixed width. */
export const RussianLength: Story = {
  name: 'Russian (+30% length)',
  args: {
    title: 'Заметки о клиенте',
    count: '2 заметки',
    action: (
      <Button size="s">
        <Plus aria-hidden />
        Добавить заметку
      </Button>
    ),
  },
}
