/**
 * TagInput — DS-Patterns → «Tag input · toggle tags + create» (Toggle, Adding, AutoTags), from B-Clients' new-client
 * modal and B-Client's edit modal. Stories are the component's tests: toggling, adding with Enter and the button,
 * Esc, a duplicate in another case, the automatic tags, disabled, a phone width and a Russian length.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { Field } from '../field'
import { Modal, ModalContent, ModalHeader } from '../modal'
import { TagInput, type TagInputProps } from './tag-input'

const onChange = fn()

function Demo(props: Partial<TagInputProps>) {
  const [value, setValue] = useState<readonly string[]>(props.value ?? ['VIP'])
  return (
    <Field label="Tags">
      <TagInput
        options={['VIP', 'Child', 'Student']}
        addLabel="tag"
        newTagLabel="New tag"
        addButtonLabel="Add"
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
      />
    </Field>
  )
}

const meta = {
  title: 'Inputs/TagInput',
  component: Demo,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

/** Toggle chips: VIP on, the others off, «+ tag» last; the group is named by the field's label. */
export const Toggle: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('group', { name: 'Tags' })).toBeInTheDocument()
    const vip = canvas.getByRole('button', { name: 'VIP' })
    await expect(vip).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(canvas.getByRole('button', { name: 'Child' }))
    await expect(onChange).toHaveBeenLastCalledWith(['VIP', 'Child'])
    await userEvent.click(vip)
    await expect(onChange).toHaveBeenLastCalledWith(['Child'])
    await expect(vip).toHaveAttribute('aria-pressed', 'false')
  },
}

/** «+ tag» opens the 36-high pill field with Add; Enter adds the tag (on, as a chip) and the focus returns to «+ tag». */
export const Adding: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'tag' }))
    const input = canvas.getByRole('textbox', { name: 'New tag' })
    await expect(input).toHaveFocus()
    await userEvent.type(input, 'Teacher{Enter}')
    await expect(onChange).toHaveBeenLastCalledWith(['VIP', 'Teacher'])
    await expect(canvas.getByRole('button', { name: 'Teacher' })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.queryByRole('textbox')).not.toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'tag' })).toHaveFocus()
    // the Add button works too
    await userEvent.click(canvas.getByRole('button', { name: 'tag' }))
    await userEvent.type(canvas.getByRole('textbox', { name: 'New tag' }), 'Family')
    await userEvent.click(canvas.getByRole('button', { name: 'Add' }))
    await expect(onChange).toHaveBeenLastCalledWith(['VIP', 'Teacher', 'Family'])
  },
}

/** Esc cancels: the field closes, nothing is added, the focus returns to «+ tag». */
export const Cancel: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'tag' }))
    await userEvent.type(canvas.getByRole('textbox', { name: 'New tag' }), 'Nobody{Escape}')
    await expect(canvas.queryByRole('textbox')).not.toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: 'Nobody' })).not.toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'tag' })).toHaveFocus()
  },
}

/**
 * Inside a Modal (B10's add-client, B11's edit): Esc closes the tag field only; the dialog and the form stay. Radix
 * hears Esc on `document` in the capture phase, so the component claims it on `window` first.
 */
export const InModal: Story = {
  render: (args) => (
    <Modal defaultOpen>
      <ModalContent size={480}>
        <ModalHeader title="New client" closeLabel="Close" />
        <Demo {...args} />
      </ModalContent>
    </Modal>
  ),
  play: async () => {
    const body = within(document.body)
    const dialog = within(await body.findByRole('dialog', { name: 'New client' }))
    await userEvent.click(dialog.getByRole('button', { name: 'tag' }))
    await userEvent.type(dialog.getByRole('textbox', { name: 'New tag' }), 'Nobody{Escape}')
    await expect(dialog.queryByRole('textbox')).not.toBeInTheDocument()
    await expect(body.getByRole('dialog', { name: 'New client' })).toBeInTheDocument()
    await expect(dialog.getByRole('button', { name: 'tag' })).toHaveFocus()
    // with the field closed, Esc reaches the dialog again
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(body.queryByRole('dialog')).not.toBeInTheDocument())
  },
}

/** A value in another case than its option (`vip`) is that option's chip, on; toggling it off removes the value. */
export const ValueInAnotherCase: Story = {
  args: { value: ['vip'] },
  play: async ({ canvas }) => {
    const vip = canvas.getByRole('button', { name: 'VIP' })
    await expect(vip).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.queryByRole('button', { name: 'vip' })).not.toBeInTheDocument()
    await userEvent.click(vip)
    await expect(onChange).toHaveBeenLastCalledWith([])
    await expect(vip).toHaveAttribute('aria-pressed', 'false')
  },
}

/** A tag that exists already, in any case, is switched on instead of added twice; an empty field adds nothing. */
export const Duplicate: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'tag' }))
    await userEvent.type(canvas.getByRole('textbox', { name: 'New tag' }), '  child {Enter}')
    await expect(canvas.getAllByRole('button', { name: /child/i })).toHaveLength(1)
    await expect(canvas.getByRole('button', { name: 'Child' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(canvas.getByRole('button', { name: 'tag' }))
    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByRole('textbox', { name: 'New tag' })).toBeInTheDocument()
  },
}

/** Automatic tags («Regular», «New») are Pill L, not buttons, with the caption that describes the group. */
export const AutoTags: Story = {
  args: {
    options: ['VIP'],
    automatic: [{ label: 'Regular' }, { label: 'New', tone: 'success' }],
    caption: '“Regular” and “New” are added automatically.',
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button', { name: 'Regular' })).not.toBeInTheDocument()
    await expect(canvas.getByText('Regular')).toBeInTheDocument()
    await expect(canvas.getByRole('group', { name: 'Tags' })).toHaveAccessibleDescription('“Regular” and “New” are added automatically.')
  },
}

/** Disabled (the field's `disabled`): the chips and «+ tag» are off. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'VIP' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'tag' })).toBeDisabled()
  },
}

/** Phone: the chips wrap. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }

/** Russian runs ~30% longer: the chips and the caption wrap, nothing has a fixed width. */
export const RussianLength: Story = {
  name: 'Russian (+30% length)',
  args: {
    options: ['Постоянный клиент', 'Ребёнок', 'Студентка'],
    value: ['Постоянный клиент'],
    addLabel: 'добавить тег',
    newTagLabel: 'Новый тег',
    addButtonLabel: 'Добавить',
    automatic: [{ label: 'Регулярный' }, { label: 'Новый', tone: 'success' }],
    caption: '«Регулярный» и «Новый» добавляются автоматически.',
  },
}
