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
