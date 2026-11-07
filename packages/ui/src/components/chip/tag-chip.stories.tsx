/**
 * TagChip — DS-Lists A8 `.tg` (v0.7): your own tags filled (28 in cards, 24 in tables), removable ones with a ×,
 * automatic tags outlined with an icon and never removable, Reported in the danger outline, the ring of a tag just added.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Clock, Flag, Repeat, Sparkles } from 'lucide-react'
import { expect, fn, userEvent } from 'storybook/test'
import { TagChip } from './tag-chip'

const meta = {
  title: 'Selection/TagChip',
  component: TagChip,
  parameters: { layout: 'padded' },
  args: { children: 'VIP' },
} satisfies Meta<typeof TagChip>
export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { args: { onRemove: fn(), removeLabel: 'Remove tag VIP' } }

/** Every kind at 28 and 24. */
export const Kinds: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(['m', 's'] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-1.5">
          <TagChip size={size} kind="automatic" icon={<Sparkles aria-hidden />}>
            New
          </TagChip>
          <TagChip size={size} kind="automatic" icon={<Repeat aria-hidden />}>
            Regular
          </TagChip>
          <TagChip size={size} kind="automatic" icon={<Clock aria-hidden />}>
            Lapsed
          </TagChip>
          <TagChip size={size} kind="reported" icon={<Flag aria-hidden />}>
            Reported
          </TagChip>
          <TagChip size={size}>VIP</TagChip>
          <TagChip size={size} highlight>
            Student
          </TagChip>
        </div>
      ))}
    </div>
  ),
}

/** The × removes; it is named for screen readers; an automatic tag has none even when asked. */
export const Removable: Story = {
  args: { onRemove: fn(), removeLabel: 'Remove tag VIP' },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Remove tag VIP' }))
    await expect(args.onRemove).toHaveBeenCalledOnce()
  },
}

export const AutomaticNotRemovable: Story = {
  args: { kind: 'automatic', icon: <Repeat aria-hidden />, children: 'Regular', onRemove: fn(), removeLabel: 'Remove' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull()
  },
}

export const Phone: Story = { ...Removable, globals: { viewport: { value: 'xs' } } }
