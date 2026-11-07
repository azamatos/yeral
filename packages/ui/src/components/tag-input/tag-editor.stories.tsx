/**
 * TagEditor — DS-Lists A8 «Tags are edited in place» (v0.7): rest, + Add tag → a field with the business's tags and
 * counts, typing filters with Create “…” last, Enter saves at once and the field stays open, a duplicate says Already
 * added, the length limit, Backspace to the last chip, Esc, automatic tags that can't be removed, read-only, 390.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Repeat } from 'lucide-react'
import { useState } from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { TagChip } from '../chip'
import { TagEditor, type TagEditorProps } from './tag-editor'

const labels: TagEditorProps['labels'] = {
  add: 'Add tag',
  field: 'Tag name',
  addAnother: 'Add another',
  remove: (tag) => `Remove tag ${tag}`,
  create: (text) => `Create “${text}”`,
  duplicate: 'Already added',
  tooLong: '20 characters at most',
  suggestions: 'Tags',
}
const suggestions = [
  { tag: 'Colour client', count: 11 },
  { tag: 'Student', count: 8 },
  { tag: 'Kids', count: 7 },
  { tag: 'Mornings only', count: 6 },
  { tag: 'VIP', count: 5 },
]

function Editor({ onAdd, onRemove, initial = ['VIP'], ...props }: Partial<TagEditorProps> & { initial?: string[] }) {
  const [value, setValue] = useState(initial)
  return (
    <TagEditor
      aria-label="Tags"
      value={value}
      suggestions={suggestions}
      maxLength={20}
      maxTags={10}
      labels={labels}
      before={
        <TagChip kind="automatic" icon={<Repeat aria-hidden />}>
          Regular
        </TagChip>
      }
      onAdd={(tag) => {
        onAdd?.(tag)
        setValue((v) => [...v, tag])
      }}
      onRemove={(tag) => {
        onRemove?.(tag)
        setValue((v) => v.filter((t) => t !== tag))
      }}
      {...props}
    />
  )
}

const meta = {
  title: 'Inputs/TagEditor',
  component: Editor,
  parameters: { layout: 'padded' },
  args: { onAdd: fn(), onRemove: fn() },
} satisfies Meta<typeof Editor>
export default meta
type Story = StoryObj<typeof meta>

export const Rest: Story = {}

/** + Add tag → the field lists the business's tags with counts, without those on the item; a click adds at once. */
export const AddFromSuggestions: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add tag' }))
    const list = within(await canvas.findByRole('listbox', { name: 'Tags' }))
    await expect(list.queryByText('VIP')).toBeNull()
    await expect(list.getByRole('option', { name: /Colour client\s*11/ })).toBeVisible()
    await userEvent.click(list.getByRole('option', { name: /Kids/ }))
    await expect(args.onAdd).toHaveBeenCalledWith('Kids')
    await waitFor(() => expect(canvas.getByRole('combobox', { name: 'Tag name' })).toHaveFocus())
  },
}

/** Typing filters, the first match is highlighted, Enter saves it; the field stays open for the next; Create “…” last. */
export const TypeAndEnter: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add tag' }))
    const field = await canvas.findByRole('combobox', { name: 'Tag name' })
    await userEvent.type(field, 'stud')
    await waitFor(() => expect(canvas.getByRole('option', { name: /Student/ })).toHaveAttribute('aria-selected', 'true'))
    await expect(canvas.getByRole('option', { name: 'Create “stud”' })).toBeVisible()
    await userEvent.keyboard('{Enter}')
    await expect(args.onAdd).toHaveBeenCalledWith('Student')
    await waitFor(() => expect(canvas.getByText('Student')).toBeVisible())
    await expect(field).toHaveAttribute('placeholder', 'Add another')
    await userEvent.type(field, 'Pays by card{Enter}')
    await expect(args.onAdd).toHaveBeenLastCalledWith('Pays by card')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Add tag' })).toHaveFocus())
  },
}

/** A duplicate in any case isn't saved: Already added. */
export const Duplicate: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add tag' }))
    await userEvent.type(await canvas.findByRole('combobox', { name: 'Tag name' }), 'vip{Enter}')
    await expect(await canvas.findByText('Already added')).toBeVisible()
    await expect(args.onAdd).not.toHaveBeenCalled()
  },
}

/** Typing stops at the limit and a line says why. */
export const TooLong: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add tag' }))
    const field = await canvas.findByRole('combobox', { name: 'Tag name' })
    await userEvent.type(field, 'Prefers quiet appointments')
    await expect(field).toHaveValue('Prefers quiet appoin')
    await expect(await canvas.findByText('20 characters at most')).toBeVisible()
  },
}

/** Backspace in the empty field goes to the last chip's ×, Backspace again removes it; the × removes too. */
export const RemoveByKeyboard: Story = {
  args: { initial: ['VIP', 'Student'] },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Add tag' }))
    await canvas.findByRole('combobox', { name: 'Tag name' })
    await userEvent.keyboard('{Backspace}')
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Remove tag Student' })).toHaveFocus())
    await userEvent.keyboard('{Backspace}')
    await expect(args.onRemove).toHaveBeenCalledWith('Student')
    await userEvent.click(canvas.getByRole('button', { name: 'Remove tag VIP' }))
    await expect(args.onRemove).toHaveBeenLastCalledWith('VIP')
    await expect(canvas.getByText('Regular')).toBeVisible()
  },
}

/** Without the right to change them: no × and no + Add tag. */
export const ReadOnly: Story = {
  args: { readOnly: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull()
  },
}

export const Phone: Story = { ...AddFromSuggestions, globals: { viewport: { value: 'xs' } } }
