/** Fields — DS-Components → «Fields, search and form layout». Label above and always visible; hint or error below. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Button } from '../button'
import { Input, Textarea } from '../input'
import { Field } from './field'

const meta = {
  title: 'Inputs/Field',
  component: Field,
  args: { label: 'Adyňyz', children: null },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Field label="Adyňyz" hint="Label above, always visible." className="max-w-90">
      <Input placeholder="Adyňyz" />
    </Field>
  ),
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText('Adyňyz')
    await userEvent.type(input, 'Myrat')
    await expect(input).toHaveValue('Myrat')
    await expect(input).toHaveAccessibleDescription('Label above, always visible.')
  },
}

export const WithError: Story = {
  render: () => (
    <Field label="Adyňyz" error="Adyňyzy ýazyň." className="max-w-90">
      <Input />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Adyňyz')).toHaveAttribute('aria-invalid', 'true')
  },
}

/** DS-Patterns → «Field messages»: every message has a 14 px icon; warning and success are 600 and `role="status"`. */
export const Messages: Story = {
  render: () => (
    <div className="grid max-w-180 gap-6 sm:grid-cols-2">
      <Field label="Phone" hint="8 digits. If the client is already saved, we’ll show their card.">
        <Input defaultValue="65 12 34 56" />
      </Field>
      <Field label="Phone" error="The number is incomplete — it needs 8 digits.">
        <Input defaultValue="65 12 34" />
      </Field>
      <Field
        label="Phone"
        status="warning"
        message={
          <>
            This number belongs to Gülälek N. — <a href="#client">Open client card</a>
          </>
        }
      >
        <Input defaultValue="65 44 70 19" />
      </Field>
      <Field label="Phone" status="success" message="This number isn’t saved yet — a new client">
        <Input defaultValue="65 30 22 18" />
      </Field>
      <Field
        label="Phone number"
        error="The number is incomplete — it needs 8 digits."
        hint="If you already book on Ýeral as a client, use that number — one account works for both."
        className="sm:col-span-2"
      >
        <Input defaultValue="65 10 2" />
      </Field>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('alert')).toHaveLength(2)
    await expect(canvas.getAllByRole('status')).toHaveLength(2)
    // a message and a hint both describe the control (B-Login keeps the hint under the error)
    await expect(canvas.getByLabelText('Phone number')).toHaveAccessibleDescription(
      'The number is incomplete — it needs 8 digits. If you already book on Ýeral as a client, use that number — one account works for both.',
    )
  },
}

/** A character counter right of the hint (B-Onboarding business name: 80). The screen formats «11 / 80». */
export const WithCounter: Story = {
  render: () => (
    <Field
      label="Business name"
      hint="Your page: yeral.app/b/glow-studio"
      counter={{ value: 11, max: 80, text: '11 / 80' }}
      className="max-w-140"
    >
      <Input defaultValue="Glow Studio" />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Business name')).toHaveAccessibleDescription('Your page: yeral.app/b/glow-studio 11 / 80')
  },
}

/** Over the limit: the counter turns danger and the error blocks saving. */
export const CounterOver: Story = {
  render: () => (
    <Field
      label="Business name"
      error="Too long: up to 80 characters."
      hint="Your page: yeral.app/b/…"
      counter={{ value: 84, max: 80, text: '84 / 80' }}
      className="max-w-140"
    >
      <Input defaultValue="Glow Studio: hair, nails, brows and lashes in the heart of the city since 2015, ok" />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Business name')).toHaveAttribute('aria-invalid', 'true')
    await expect(canvas.getByText('84 / 80')).toHaveClass('text-danger-ink')
  },
}

/** Near the limit (90 % and up): warning ink. */
export const CounterNearLimit: Story = {
  render: () => (
    <Field label="Business name" counter={{ value: 74, max: 80, text: '74 / 80' }} className="max-w-140">
      <Input defaultValue="Glow Studio: hair, nails, brows and lashes in the heart of the city since" />
    </Field>
  ),
}

/** An optional field: «(optional)» after the label in regular n-600. */
export const Optional: Story = {
  render: () => (
    <Field label="Last name" optional="(optional)" className="max-w-90">
      <Input autoComplete="family-name" />
    </Field>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('Last name (optional)')).toBeInTheDocument()
  },
}

export const Disabled: Story = {
  render: () => (
    <Field label="Telefon belgisi" disabled className="max-w-90">
      <Input value="+993 65 90 11 22" readOnly />
    </Field>
  ),
}

export const FormLayout: Story = {
  name: 'Form layout',
  render: () => (
    <form className="flex max-w-160 flex-col gap-4 rounded-card border border-n-200 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Adyňyz">
          <Input defaultValue="Aýjemal" />
        </Field>
        <Field label="Familiýaňyz">
          <Input placeholder="Hökman däl" />
        </Field>
      </div>
      <Field label="Bellik">
        <Textarea placeholder="Biznese goşmaça maglumat" />
      </Field>
      <div className="flex justify-end gap-3">
        <Button variant="ghost">Yza</Button>
        <Button variant="primary" type="submit">
          Tassykla
        </Button>
      </div>
    </form>
  ),
}
