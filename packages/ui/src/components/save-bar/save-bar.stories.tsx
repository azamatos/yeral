/**
 * SaveBar — DS-Patterns → Overlays «Save bar · unsaved changes» (Dirty, Invalid, Saving), from Account-Profile `.sbar`
 * and B-Settings. Stories are the component's tests: one per state on the board, a phone width and a Russian length.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { SaveBar } from './save-bar'

const onDiscard = fn()
const onSave = fn()

const meta = {
  title: 'Overlays/SaveBar',
  component: SaveBar,
  parameters: { layout: 'padded' },
  args: {
    message: 'Save your changes?',
    label: 'Unsaved changes',
    discardLabel: 'Discard',
    saveLabel: 'Save',
    savingLabel: 'Saving',
    onDiscard,
    onSave,
  },
  decorators: [
    (Story) => (
      <div className="flex min-h-60 flex-col justify-end bg-group p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SaveBar>
export default meta
type Story = StoryObj<typeof meta>

/** A form with changes: Discard and Save. */
export const Dirty: Story = {
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('region', { name: 'Unsaved changes' })
    await expect(bar).toHaveTextContent('Save your changes?')
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    await expect(onSave).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole('button', { name: 'Discard' }))
    await expect(onDiscard).toHaveBeenCalledOnce()
  },
}

/** A field on the page is invalid: Save is disabled. */
export const Invalid: Story = {
  args: { invalid: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled()
  },
}

/** Saving: a spinner in Save, the same width; Discard waits. */
export const Saving: Story = {
  args: { saving: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Saving' })).toHaveAttribute('aria-busy', 'true')
    await expect(canvas.getByRole('button', { name: 'Discard' })).toBeDisabled()
  },
}

const onSubmit = fn()

/** Save submits a form by its id, from outside it (the profile's bar sits under every section). */
export const SubmitsAForm: Story = {
  args: { form: 'profile' },
  render: (args) => (
    <div>
      <form
        id="profile"
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      />
      <SaveBar {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    await expect(onSubmit).toHaveBeenCalledOnce()
  },
}

/** Phone: the buttons share the width. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }

/** Russian runs ~30% longer: the message and the buttons wrap, nothing has a fixed width. */
export const RussianLength: Story = {
  name: 'Russian (+30% length)',
  args: { message: 'Сохранить внесённые изменения?', discardLabel: 'Не сохранять', saveLabel: 'Сохранить', savingLabel: 'Сохраняем' },
}
