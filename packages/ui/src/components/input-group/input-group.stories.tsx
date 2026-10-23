/**
 * InputGroup — DS-Patterns → Inputs «Addons · prefix and suffix» (Prefix, Suffix, States); used by B-Onboarding's
 * services, B-Services, B-Settings. Stories are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Field } from '../field'
import { InputGroup } from './input-group'

const meta = {
  title: 'Inputs/InputGroup',
  component: InputGroup,
  args: { suffix: 'TMT', size: 'm', inputMode: 'numeric', defaultValue: '250' },
  render: (args) => (
    <Field label="Price" className="max-w-60">
      <InputGroup {...args} />
    </Field>
  ),
} satisfies Meta<typeof InputGroup>
export default meta
type Story = StoryObj<typeof meta>

/** A price with its unit inside: the figures align right, and the field reads «Price, TMT». */
export const Suffix: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole('textbox', { name: 'Price TMT' })
    await expect(input).toHaveValue('250')
    await expect(input).toHaveStyle({ textAlign: 'right' })
    await expect(input.offsetHeight).toBe(44)
    await userEvent.clear(input)
    await userEvent.type(input, '80')
    await expect(input).toHaveValue('80')
  },
}

/** A row's field named by its own label («Women's haircut: price»), the unit after it. */
export const SuffixInARow: Story = {
  render: (args) => <InputGroup {...args} aria-label="Women’s haircut: price" className="w-40" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Women’s haircut: price TMT' })).toBeVisible()
  },
}

/** A custom break in minutes, 120 wide. */
export const Minutes: Story = {
  args: { suffix: 'min', defaultValue: '25' },
  render: (args) => (
    <Field label="Break" className="w-30">
      <InputGroup {...args} />
    </Field>
  ),
}

/** A fixed box before the field (the phone's country code), 48 and 44. */
export const Prefix: Story = {
  args: { suffix: undefined, prefix: '+993', size: 'l', defaultValue: '', placeholder: '6X XX XX XX' },
  render: (args) => (
    <div className="flex max-w-90 flex-col gap-4">
      <Field label="Phone">
        <InputGroup {...args} />
      </Field>
      <Field label="Phone · 44">
        <InputGroup {...args} size="m" defaultValue="65 12 34 56" />
      </Field>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Phone' }).offsetHeight).toBe(48)
    await expect(canvas.getAllByText('+993')[0]).toHaveAttribute('aria-hidden', 'true')
  },
}

/** A row that's switched off: the field waits. */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: '40' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Price TMT' })).toBeDisabled()
  },
}

/** An error from the Field: the field turns invalid. */
export const Invalid: Story = {
  render: (args) => (
    <Field label="Price" error="Enter a price." className="max-w-60">
      <InputGroup {...args} defaultValue="" />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Price TMT' })).toHaveAttribute('aria-invalid', 'true')
  },
}
